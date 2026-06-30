"""
ContextSynthesisAgent — calls an LLM to generate:
  - ≤ 3-sentence interaction summary
  - exactly 3 personalised talking points

De-identifies all HCP context before the LLM call.
Falls back to template-based talking points on malformed output.
Strips hallucinated drug references not in the active offer catalog.
"""

from __future__ import annotations

import json
import re
import time
import structlog
from typing import Any

from models import NBACard, Offer, PipelineState, ScoredHCP, UrgencyLevel
from utils.sanitize import sanitize_notes

logger = structlog.get_logger(__name__)

# Template fallback talking points when LLM fails
TEMPLATE_TALKING_POINTS = [
    "Discuss the latest clinical outcomes data relevant to the patient population.",
    "Review the current prescription trend and identify any compliance gaps.",
    "Introduce the recommended offer that aligns with the HCP's therapy focus.",
]

TEMPLATE_SUMMARY = (
    "This HCP is a consistent prescriber in their territory. "
    "A targeted visit now offers a high-ROI re-engagement opportunity. "
    "Review recent interaction history before the call."
)


def _deidentify(text: str, hcp_id: str, npi: str | None) -> str:
    """Remove PII before sending to the LLM."""
    text = re.sub(r"\bDr\.?\s+\w+\s+\w+", "[HCP_NAME]", text)
    text = text.replace(hcp_id, "[HCP_ID]")
    if npi:
        text = text.replace(npi, "[NPI]")
    return text


def _strip_hallucinated_drugs(
    content: str,
    catalog_titles: set[str],
) -> str:
    """
    Remove any sentence that mentions a drug name not present in the active offer catalog.
    This is a heuristic guardrail — drug names are typically Title Case.
    """
    # Build a list of known drug tokens from catalog (words ≥ 4 chars, first letter uppercase)
    known_tokens: set[str] = set()
    for title in catalog_titles:
        for word in title.split():
            if len(word) >= 4 and word[0].isupper():
                known_tokens.add(word.upper())

    sentences = re.split(r"(?<=[.!?])\s+", content)
    filtered = []
    for sentence in sentences:
        # Find capitalised words that look like drug names (4+ chars, no common stopwords)
        stopwords = {"This", "HCP", "Their", "With", "That", "From", "When", "Will", "Have",
                     "Been", "Discuss", "Review", "Based", "Recent", "Recommended", "Current"}
        candidate_drugs = [
            w for w in re.findall(r"\b[A-Z][A-Z\-]{3,}\b", sentence)
            if w not in stopwords
        ]
        is_hallucinated = any(d not in known_tokens for d in candidate_drugs) and bool(candidate_drugs)
        if is_hallucinated:
            logger.warning("hallucination_guardrail_stripped", sentence=sentence[:80])
        else:
            filtered.append(sentence)

    return " ".join(filtered) if filtered else content


async def _call_llm(
    prompt: str,
    config: dict[str, Any],
    run_metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Call the configured LLM provider.
    Returns a dict with 'summary' and 'talking_points' keys.
    Raises ValueError on malformed output.

    run_metadata is forwarded as LangSmith run metadata when tracing is enabled.
    """
    from langchain_core.runnables import RunnableConfig

    model = config.get("model", "")
    lc_config = RunnableConfig(
        metadata=run_metadata or {},
        tags=["context_synthesis", "opennba"],
    )

    if "gpt" in model.lower() or not model:
        from langchain_openai import ChatOpenAI
        llm = ChatOpenAI(model="gpt-4o", temperature=0.3)
    else:
        from langchain_aws import ChatBedrock
        llm = ChatBedrock(model_id=model, model_kwargs={"temperature": 0.3})

    response = await llm.ainvoke(prompt, config=lc_config)
    content = response.content if hasattr(response, "content") else str(response)

    json_match = re.search(r"\{.*\}", content, re.DOTALL)
    if not json_match:
        raise ValueError("LLM output did not contain valid JSON")

    parsed = json.loads(json_match.group())
    if "summary" not in parsed or "talking_points" not in parsed:
        raise ValueError("LLM output missing required fields: summary, talking_points")

    return parsed


def _build_prompt(signal_notes: list[str], specialty: str, tier: str, days_gap: int | None) -> str:
    notes_text = "; ".join(signal_notes[:3]) if signal_notes else "No recent notes."
    return f"""You are a pharmaceutical sales enablement assistant. 
Generate a JSON object for a Medical Representative visiting an HCP.

HCP Context (de-identified):
- Specialty: {specialty}
- Prescriber Tier: {tier}
- Days since last visit: {days_gap if days_gap is not None else 'unknown'}
- Recent interaction notes: {notes_text}

Return ONLY valid JSON with this exact structure:
{{
  "summary": "<≤3 sentence interaction summary>",
  "talking_points": [
    "<talking point 1>",
    "<talking point 2>",
    "<talking point 3>"
  ]
}}

Do not include any drug names not mentioned in the HCP context.
"""


async def run_context_synthesis(
    state: PipelineState,
    offers: list[Offer],
    vertical_config: dict[str, Any] | None = None,
) -> PipelineState:
    """LangGraph node: generate AI summaries and talking points per HCP."""
    cfg = (vertical_config or {}).get("llm", {})
    catalog_titles = {o.title for o in offers}
    signal_map = {s.hcp_id: s for s in state.signals}

    nba_cards: list[NBACard] = []

    for scored_hcp in state.scored_hcps:
        signal = signal_map.get(scored_hcp.hcp_id)
        summary = TEMPLATE_SUMMARY
        talking_points = TEMPLATE_TALKING_POINTS.copy()
        is_partial = False

        if signal:
            safe_notes = sanitize_notes(signal.recent_notes)
            prompt = _build_prompt(
                signal_notes=safe_notes,
                specialty=signal.specialty.value,
                tier=signal.tier.value,
                days_gap=signal.days_since_last_visit,
            )

            llm_success = False
            for attempt in range(2):
                try:
                    t0 = time.time()
                    result = await _call_llm(
                        prompt,
                        cfg,
                        run_metadata={
                            "hcp_id": scored_hcp.hcp_id,
                            "mr_id": state.mr_id,
                            "attempt": attempt,
                        },
                    )
                    latency_ms = int((time.time() - t0) * 1000)
                    logger.info(
                        "llm_call_success",
                        hcp_id=scored_hcp.hcp_id,
                        attempt=attempt,
                        latency_ms=latency_ms,
                    )
                    raw_summary = _strip_hallucinated_drugs(result["summary"], catalog_titles)
                    raw_points = [
                        _strip_hallucinated_drugs(p, catalog_titles)
                        for p in result["talking_points"][:3]
                    ]
                    summary = raw_summary or TEMPLATE_SUMMARY
                    talking_points = raw_points if raw_points else TEMPLATE_TALKING_POINTS
                    llm_success = True
                    break
                except Exception as exc:
                    logger.warning(
                        "llm_call_failed",
                        hcp_id=scored_hcp.hcp_id,
                        attempt=attempt,
                        error=str(exc),
                    )
                    if attempt == 1:
                        logger.error("llm_output_invalid", hcp_id=scored_hcp.hcp_id)
                        is_partial = True

        nba_cards.append(
            NBACard(
                hcp_id=scored_hcp.hcp_id,
                mr_id=state.mr_id,
                priority_score=scored_hcp.priority_score,
                urgency_level=scored_hcp.urgency_level,
                days_since_last_visit=signal.days_since_last_visit if signal else None,
                summary=summary,
                talking_points=talking_points,
                offer=None,
                is_partially_enriched=is_partial,
                tenant_id=state.tenant_id,
            )
        )

    updated = state.model_copy(update={
        "nba_cards": nba_cards,
        "step_results": {
            **state.step_results,
            "context_synthesis": {
                "cards_generated": len(nba_cards),
                "partial": sum(1 for c in nba_cards if c.is_partially_enriched),
            },
        },
    })

    logger.info("context_synthesis_complete", mr_id=state.mr_id, cards=len(nba_cards))
    return updated
