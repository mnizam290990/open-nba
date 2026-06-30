/**
 * Unit tests for <OfflineBanner />
 * Covers: offline banner display, conflict notification, dismiss conflict.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OfflineBanner } from "@/components/layout/OfflineBanner";

describe("OfflineBanner — online state", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
  });

  it("does not show offline banner when online", () => {
    render(<OfflineBanner />);
    expect(screen.queryByTestId("offline-banner")).not.toBeInTheDocument();
  });

  it("does not show conflict banner when no conflict message", () => {
    render(<OfflineBanner conflictMessage={null} />);
    expect(screen.queryByTestId("offline-conflict-banner")).not.toBeInTheDocument();
  });
});

describe("OfflineBanner — conflict notification", () => {
  it("shows conflict banner when conflictMessage is provided", () => {
    render(
      <OfflineBanner
        conflictMessage="A queued action was rejected by the server."
        onDismissConflict={vi.fn()}
      />
    );
    expect(screen.getByTestId("offline-conflict-banner")).toBeInTheDocument();
    expect(screen.getByTestId("offline-conflict-banner")).toHaveTextContent(
      "A queued action was rejected by the server."
    );
  });

  it("calls onDismissConflict when dismiss button is clicked", () => {
    const onDismiss = vi.fn();
    render(
      <OfflineBanner
        conflictMessage="Server state updated while offline."
        onDismissConflict={onDismiss}
      />
    );
    fireEvent.click(screen.getByLabelText("Dismiss conflict notification"));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("does not show conflict banner when conflictMessage is null", () => {
    render(<OfflineBanner conflictMessage={null} onDismissConflict={vi.fn()} />);
    expect(screen.queryByTestId("offline-conflict-banner")).not.toBeInTheDocument();
  });
});

describe("OfflineBanner — network change events", () => {
  afterEach(() => {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
  });

  it("shows offline banner after offline event fires", () => {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    render(<OfflineBanner />);
    expect(screen.queryByTestId("offline-banner")).not.toBeInTheDocument();

    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    fireEvent(window, new Event("offline"));

    expect(screen.getByTestId("offline-banner")).toBeInTheDocument();
    expect(screen.getByTestId("offline-banner")).toHaveTextContent("offline");
  });

  it("hides offline banner after online event fires", () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    render(<OfflineBanner />);

    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    fireEvent(window, new Event("online"));

    expect(screen.queryByTestId("offline-banner")).not.toBeInTheDocument();
  });
});
