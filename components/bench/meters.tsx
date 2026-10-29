"use client";

import { useEffect, useRef } from "react";

import { benchSignal } from "./signal";

/** A sound-level meter: its needle follows the air column's loudness (also the accessible cue). */
export function SoundMeter() {
  const needle = useRef<SVGLineElement>(null);
  useEffect(() => {
    let raf = 0;
    let shown = 0;
    const tick = () => {
      shown += (Math.min(benchSignal.excitation, 1.2) - shown) * 0.25;
      const angle = -60 + (shown / 1.2) * 120;
      needle.current?.setAttribute("transform", `rotate(${angle} 60 62)`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <svg viewBox="0 0 120 70" className="h-16 w-full" role="img" aria-label="Sound level meter">
      <path d="M12 62 A 48 48 0 0 1 108 62" fill="none" stroke="#9aa0a6" strokeWidth="6" />
      {Array.from({ length: 7 }, (_, i) => {
        const a = ((-60 + i * 20 - 90) * Math.PI) / 180;
        return <line key={i} x1={60 + 40 * Math.cos(a)} y1={62 + 40 * Math.sin(a)} x2={60 + 48 * Math.cos(a)} y2={62 + 48 * Math.sin(a)} stroke="#111" strokeWidth="1.2" />;
      })}
      <line ref={needle} x1="60" y1="62" x2="60" y2="20" stroke="#d3481b" strokeWidth="2" transform="rotate(-60 60 62)" />
      <circle cx="60" cy="62" r="3" fill="#111" />
    </svg>
  );
}
