/**
 * Unit tests for <HCPDetailPanel />
 * Covers: summary and talking points render, empty states, partially_enriched badge.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { HCPDetailPanel } from "@/components/feed/HCPDetailPanel";
import type { HCPCardData } from "@/components/feed/HCPCard";

const BASE_CARD: HCPCardData = {
  cardId: "card-001",
  hcpId: "hcp-001",
  priorityScore: 80,
  urgencyLevel: "HIGH",
  daysSinceLastVisit: 75,
  isPartiallyEnriched: false,
  hcp: {
    name: "Dr. Alan Kumar",
    specialty: "ONCOLOGY",
    territory: "Bangalore East",
    tier: "TIER_1",
  },
  offer: null,
};

describe("HCPDetailPanel — renders correctly", () => {
  it("renders panel when card is provided", () => {
    render(<HCPDetailPanel card={BASE_CARD} onClose={vi.fn()} />);
    expect(screen.getByTestId("hcp-detail-panel")).toBeInTheDocument();
    expect(screen.getByTestId("detail-panel-hcp-name")).toHaveTextContent("Dr. Alan Kumar");
  });

  it("renders nothing when card is null", () => {
    const { container } = render(<HCPDetailPanel card={null} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows summary section", () => {
    render(<HCPDetailPanel card={BASE_CARD} onClose={vi.fn()} />);
    expect(screen.getByTestId("detail-summary-section")).toBeInTheDocument();
    expect(screen.getByTestId("detail-summary-text")).toBeInTheDocument();
  });

  it("shows three talking points", () => {
    render(<HCPDetailPanel card={BASE_CARD} onClose={vi.fn()} />);
    expect(screen.getByTestId("talking-point-1")).toBeInTheDocument();
    expect(screen.getByTestId("talking-point-2")).toBeInTheDocument();
    expect(screen.getByTestId("talking-point-3")).toBeInTheDocument();
  });
});

describe("HCPDetailPanel — empty states", () => {
  it("shows no-offer placeholder when offer is null", () => {
    render(<HCPDetailPanel card={{ ...BASE_CARD, offer: null }} onClose={vi.fn()} />);
    expect(screen.getByTestId("detail-no-offer")).toBeInTheDocument();
    expect(screen.getByTestId("detail-no-offer")).toHaveTextContent("No offer available");
  });

  it("shows offer card when offer is provided", () => {
    const cardWithOffer: HCPCardData = {
      ...BASE_CARD,
      offer: { title: "Oncology Detail Aid", type: "DETAIL_AID" },
    };
    render(<HCPDetailPanel card={cardWithOffer} onClose={vi.fn()} />);
    expect(screen.getByTestId("detail-offer-card")).toBeInTheDocument();
    expect(screen.getByTestId("detail-offer-card")).toHaveTextContent("Oncology Detail Aid");
  });
});

describe("HCPDetailPanel — partially enriched badge", () => {
  it("shows partially enriched badge when isPartiallyEnriched is true", () => {
    render(
      <HCPDetailPanel card={{ ...BASE_CARD, isPartiallyEnriched: true }} onClose={vi.fn()} />
    );
    expect(screen.getByTestId("detail-partially-enriched-badge")).toBeInTheDocument();
  });

  it("does NOT show partially enriched badge when enrichment is complete", () => {
    render(<HCPDetailPanel card={BASE_CARD} onClose={vi.fn()} />);
    expect(screen.queryByTestId("detail-partially-enriched-badge")).not.toBeInTheDocument();
  });
});

describe("HCPDetailPanel — interaction", () => {
  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<HCPDetailPanel card={BASE_CARD} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("detail-panel-close-btn"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(<HCPDetailPanel card={BASE_CARD} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("detail-panel-backdrop"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
