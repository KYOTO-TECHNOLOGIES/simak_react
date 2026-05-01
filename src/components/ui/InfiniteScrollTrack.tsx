import React, { useEffect, useRef, useState } from "react";

interface InfiniteScrollTrackProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  speed?: number;
  copies?: number;
  outerClassName?: string;
  gap?: string;
  fadeEdges?: boolean;
  edgeColor?: string;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}

function InfiniteScrollTrack<T,>({
  items,
  renderItem,
  speed = 0.6,
  copies = 4,
  outerClassName = "",
  gap = "gap-5",
  fadeEdges = false,
  edgeColor = "#ffffff",
  scrollRef,
}: InfiniteScrollTrackProps<T>) {
  const internalScrollRef = useRef<HTMLDivElement>(null);
  const trackScrollRef = scrollRef ?? internalScrollRef;
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (items.length === 0 || isPaused) return;
    const el = trackScrollRef.current;
    if (!el) return;

    let animId: number;
    const step = () => {
      el.scrollLeft += speed;
      if (el.scrollLeft >= el.scrollWidth / copies) {
        el.scrollLeft -= el.scrollWidth / copies;
      }
      animId = requestAnimationFrame(step);
    };
    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [items.length, isPaused, speed, copies, trackScrollRef]);

  return (
    <div
      className={`relative ${outerClassName}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {fadeEdges && (
        <>
          <div
            className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 sm:w-24 z-10"
            style={{ background: `linear-gradient(to right, ${edgeColor} 0%, transparent 100%)` }}
          />
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 sm:w-24 z-10"
            style={{ background: `linear-gradient(to left, ${edgeColor} 0%, transparent 100%)` }}
          />
        </>
      )}
      <div
        ref={trackScrollRef}
        className={`flex ${gap} py-5 overflow-x-auto overflow-y-hidden touch-pan-y scrollbar-hide cursor-grab active:cursor-grabbing select-none`}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {Array.from({ length: copies }, (_, copyIdx) =>
          items.map((item, i) => (
            <React.Fragment key={`${copyIdx}-${i}`}>
              {renderItem(item, i)}
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  );
}

export default InfiniteScrollTrack;
