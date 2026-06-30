/**
 * Unit tests for <HCPCard />
 * Covers: urgency badge rendering per score range, all four action buttons present.
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { HCPCard, type HCPCardData } from "@/components/feed/HCPCard";

function makeCard(overrides: Partial<HCPCardData> = {}): HCPCardData {
  return {
    cardId: "card-001",
    hcpId: "hcp-001",
    priorityScore: 75,
    urgencyLevel: "HIGH",
    daysSinceLastVisit: 70,
    isPartiallyEnriched: false,
    hcp: {
      name: "Dr. Jane Smith",
      specialty: "CARDIOLOGY",
      territory: "North Mumbai",
      tier: "TIER_1",
      npi: "1234567890",
    },
    offer: {
      title: "CARDI-FORTE Sample",
      type: "SAMPLE",
    },
    ...overrides,
  };
}

const noop = async () => {};

describe("HCPCard — urgency badge rendering", () => {
  it("shows High Priority badge when urgencyLevel is HIGH", () => {
    render(<HCPCard card={makeCard({ urgencyLevel: "HIGH" })} onAction={noop} onViewDetail={noop} />);
    expect(screen.getByTestId("urgency-badge")).toHaveTextContent("High Priority");
  });

  it("shows Medium Priority badge when urgencyLevel is MEDIUM", () => {
    render(<HCPCard card={makeCard({ urgencyLevel: "MEDIUM", priorityScore: 55 })} onAction={noop} onViewDetail={noop} />);
    expect(screen.getByTestId("urgency-badge")).toHaveTextContent("Medium Priority");
  });

  it("shows Low Priority badge when urgencyLevel is LOW", () => {
    render(<HCPCard card={makeCard({ urgencyLevel: "LOW", priorityScore: 25 })} onAction={noop} onViewDetail={noop} />);
    expect(screen.getByTestId("urgency-badge")).toHaveTextContent("Low Priority");
  });
});

describe("HCPCard — action buttons", () => {
  it("renders all four action buttons", () => {
    render(<HCPCard card={makeCard()} onAction={noop} onViewDetail={noop} />);
    expect(screen.getByTestId("schedule-visit-btn")).toBeInTheDocument();
    expect(screen.getByTestId("log-call-btn")).toBeInTheDocument();
    expect(screen.getByTestId("snooze-btn")).toBeInTheDocument();
    expect(screen.getByTestId("dismiss-btn")).toBeInTheDocument();
  });

  it("calls onAction with DISMISS when dismiss button is clicked", async () => {
    const onAction = vi.fn().mockResolvedValue(undefined);
    render(<HCPCard card={makeCard()} onAction={onAction} onViewDetail={noop} />);
    fireEvent.click(screen.getByTestId("dismiss-btn"));
    await waitFor(() => {
      expect(onAction).toHaveBeenCalledWith("card-001", "hcp-001", "DISMISS");
    });
  });

  it("calls onAction with SNOOZE when snooze button is clicked", async () => {
    const onAction = vi.fn().mockResolvedValue(undefined);
    render(<HCPCard card={makeCard()} onAction={onAction} onViewDetail={noop} />);
    fireEvent.click(screen.getByTestId("snooze-btn"));
    await waitFor(() => {
      expect(onAction).toHaveBeenCalledWith("card-001", "hcp-001", "SNOOZE");
    });
  });

  it("calls onAction with SCHEDULE_VISIT when schedule button is clicked", async () => {
    const onAction = vi.fn().mockResolvedValue(undefined);
    render(<HCPCard card={makeCard()} onAction={onAction} onViewDetail={noop} />);
    fireEvent.click(screen.getByTestId("schedule-visit-btn"));
    await waitFor(() => {
      expect(onAction).toHaveBeenCalledWith("card-001", "hcp-001", "SCHEDULE_VISIT");
    });
  });
});

describe("HCPCard — partially enriched badge", () => {
  it("shows partially enriched badge when isPartiallyEnriched is true", () => {
    render(<HCPCard card={makeCard({ isPartiallyEnriched: true })} onAction={noop} onViewDetail={noop} />);
    expect(screen.getByTestId("partially-enriched-badge")).toBeInTheDocument();
  });

  it("does NOT show partially enriched badge when isPartiallyEnriched is false", () => {
    render(<HCPCard card={makeCard({ isPartiallyEnriched: false })} onAction={noop} onViewDetail={noop} />);
    expect(screen.queryByTestId("partially-enriched-badge")).not.toBeInTheDocument();
  });
});

describe("HCPCard — accessibility", () => {
  it("has an aria-label describing the HCP and urgency", () => {
    render(<HCPCard card={makeCard()} onAction={noop} onViewDetail={noop} />);
    const article = screen.getByRole("article");
    expect(article).toHaveAttribute("aria-label", expect.stringContaining("Dr. Jane Smith"));
    expect(article).toHaveAttribute("aria-label", expect.stringContaining("HIGH"));
  });
});
