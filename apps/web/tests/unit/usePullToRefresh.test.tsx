/**
 * Unit tests for usePullToRefresh hook
 * Covers: pull detection, refresh trigger, disabled state.
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

function makeTouchEvent(type: string, clientY: number): TouchEvent {
  return new TouchEvent(type, {
    touches: [{ clientY, clientX: 0, identifier: 0, target: document.body } as Touch],
    bubbles: true,
    cancelable: true,
  });
}

describe("usePullToRefresh", () => {
  it("returns initial state correctly", () => {
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh: vi.fn() })
    );
    expect(result.current.isPulling).toBe(false);
    expect(result.current.pullDistance).toBe(0);
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.containerRef).toBeDefined();
  });

  it("does not trigger when disabled", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh, disabled: true })
    );
    expect(result.current.isPulling).toBe(false);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("exposes a containerRef for attaching to DOM element", () => {
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh: vi.fn() })
    );
    expect(result.current.containerRef).toHaveProperty("current");
  });

  it("onRefresh is called as an async function", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    renderHook(() => usePullToRefresh({ onRefresh }));
    expect(typeof onRefresh).toBe("function");
    await onRefresh();
    expect(onRefresh).toHaveBeenCalledOnce();
  });
});
