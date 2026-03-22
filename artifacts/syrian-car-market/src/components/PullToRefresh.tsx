import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * PullToRefresh
 * Attaches touch listeners to a given scroll container (default: #app-main).
 * When the user pulls down ≥ THRESHOLD px while the container is at the top,
 * it calls onRefresh() — which by default reloads the page.
 */
interface PullToRefreshProps {
  onRefresh?: () => void | Promise<void>;
  threshold?: number;      // px to pull before triggering (default 80)
  maxPull?: number;        // max px the indicator travels (default 100)
  containerId?: string;    // id of the scroll container (default "app-main")
}

export function PullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 100,
  containerId = "app-main",
}: PullToRefreshProps) {
  const [pullY, setPullY] = useState(0);          // current pull distance (px)
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);

  useEffect(() => {
    const el = document.getElementById(containerId);
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      // Only start if container is scrolled to the top
      if (el.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        pulling.current = false;
        setPullY(0);
        return;
      }
      // Rubber-band: each extra px of finger travel contributes less
      const clamped = Math.min(dy * 0.5, maxPull);
      setPullY(clamped);
      // Prevent the page from scrolling upward while we animate the indicator
      if (dy > 8) e.preventDefault();
    };

    const onTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      const triggered = pullY >= threshold;
      setPullY(0);

      if (triggered) {
        setIsRefreshing(true);
        try {
          if (onRefresh) {
            await onRefresh();
          } else {
            window.location.reload();
          }
        } finally {
          setIsRefreshing(false);
        }
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [containerId, threshold, maxPull, pullY, onRefresh]);

  // Nothing to render when idle
  const visible = pullY > 0 || isRefreshing;
  if (!visible) return null;

  const progress = Math.min(pullY / threshold, 1);            // 0 → 1
  const reached  = pullY >= threshold || isRefreshing;
  const translateY = isRefreshing ? 52 : pullY + 8;           // px from top of main

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 z-[150] flex justify-center transition-transform duration-150"
      style={{ top: `var(--ptr-top, 104px)`, transform: `translateY(${translateY - 52}px)` }}
    >
      <div
        className={`
          flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border text-sm font-medium
          transition-colors duration-200
          ${reached
            ? "bg-primary text-primary-foreground border-primary/30"
            : "bg-card text-muted-foreground border-border"}
        `}
        style={{ opacity: Math.max(progress, isRefreshing ? 1 : 0) }}
      >
        <Loader2
          className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
          style={
            !isRefreshing
              ? { transform: `rotate(${progress * 360}deg)`, transition: "none" }
              : undefined
          }
        />
        <span>{isRefreshing ? "جارٍ التحديث…" : reached ? "أطلق للتحديث" : "اسحب للتحديث"}</span>
      </div>
    </div>
  );
}
