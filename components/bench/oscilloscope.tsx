"use client";

import { useEffect, useRef } from "react";

/**
 * An oscilloscope screen: 10 × 8 divisions with 0.2-division minor ticks on the centre axes.
 * The trace is a sine of the given peak voltage at the chosen volts/div; the time base shows
 * about two cycles. Anything beyond ±4 divisions is clipped by the screen edge, as on a real CRO.
 */
export function OscilloscopeScreen({ peakV, voltsPerDiv, on }: { peakV: number; voltsPerDiv: number; on: boolean }) {
  const path = useRef<SVGPathElement>(null);
  const D = 24; // px per division
  const W = 10 * D;
  const H = 8 * D;

  useEffect(() => {
    let raf = 0;
    const draw = (t: number) => {
      const amp = on ? (peakV / voltsPerDiv) * D : 0;
      const jitter = Math.sin(t / 900) * 0.6;
      let d = "";
      for (let x = 0; x <= W; x += 2) {
        const y = H / 2 - amp * Math.sin((x / W) * 4 * Math.PI + t / 2000) + jitter;
        d += `${x === 0 ? "M" : "L"}${x} ${Math.min(H + 4, Math.max(-4, y)).toFixed(1)} `;
      }
      path.current?.setAttribute("d", d);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [peakV, voltsPerDiv, on, D, W, H]);

  return (
    <svg viewBox={`-6 -6 ${W + 12} ${H + 12}`} className="w-full" role="img" aria-label="Oscilloscope screen, 10 by 8 divisions">
      <rect x={-6} y={-6} width={W + 12} height={H + 12} fill="#0f1a12" />
      <defs>
        <clipPath id="crt">
          <rect x={0} y={0} width={W} height={H} />
        </clipPath>
      </defs>
      {Array.from({ length: 11 }, (_, i) => (
        <line key={`v${i}`} x1={i * D} x2={i * D} y1={0} y2={H} stroke="#3c5a42" strokeWidth={i === 5 ? 1 : 0.6} />
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <line key={`h${i}`} y1={i * D} y2={i * D} x1={0} x2={W} stroke="#3c5a42" strokeWidth={i === 4 ? 1 : 0.6} />
      ))}
      {Array.from({ length: 41 }, (_, i) => (
        <line key={`ty${i}`} x1={W / 2 - 3} x2={W / 2 + 3} y1={(i * D) / 5} y2={(i * D) / 5} stroke="#5f8a66" strokeWidth={0.6} />
      ))}
      {Array.from({ length: 51 }, (_, i) => (
        <line key={`tx${i}`} y1={H / 2 - 3} y2={H / 2 + 3} x1={(i * D) / 5} x2={(i * D) / 5} stroke="#5f8a66" strokeWidth={0.6} />
      ))}
      <path ref={path} clipPath="url(#crt)" fill="none" stroke="#8dff7a" strokeWidth={1.6} />
    </svg>
  );
}
