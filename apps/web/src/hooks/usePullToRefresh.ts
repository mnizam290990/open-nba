"use client";

import { useEffect, useRef, useState } from "react";

const PULL_THRESHOLD = 80;

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

export function usePullToRefresh({ onRefresh, disabled = false }: UsePullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || disabled) return;

    function onTouchStart(e: TouchEvent) {
      if (el && el.scrollTop === 0) {
        startYRef.current = e.touches[0].clientY;
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (startYRef.current === null) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta > 0 && el && el.scrollTop === 0) {
        e.preventDefault();
        setPullDistance(Math.min(delta, PULL_THRESHOLD * 1.5));
        setIsPulling(delta >= PULL_THRESHOLD);
      }
    }

    async function onTouchEnd() {
      if (isPulling && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
      startYRef.current = null;
      setPullDistance(0);
      setIsPulling(false);
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [disabled, isPulling, isRefreshing, onRefresh]);

  return { containerRef, isPulling, pullDistance, isRefreshing };
}
