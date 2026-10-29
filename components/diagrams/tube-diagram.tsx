import type { DiagramProps } from "./sonometer-diagram";

/** Labelled resonance-tube set-up: tube, reservoir, rule, fork over the mouth, lengths l₁ and l₂. */
export function TubeDiagram({ className, ref, second = true }: DiagramProps & { second?: boolean }) {
  const ink = "#111111";
  return (
    <svg ref={ref} viewBox="0 0 480 360" className={className} role="img" aria-label="Diagram of the resonance tube set-up" fontFamily="Inter, Arial, sans-serif" fontSize="12">
      <rect width="480" height="360" fill="#ffffff" />
      <g fill="none" stroke={ink} strokeWidth="1.5">
        <path d="M200 40 L200 330 M232 40 L232 330 M200 330 L232 330" />
        <path d="M201 200 L231 200" stroke="#2f6fa0" strokeWidth="2" />
        <path d="M70 230 L110 230 L110 290 L70 290 Z" />
        <path d="M90 290 Q 90 345 216 330" />
        <path d="M250 40 L250 330" strokeWidth="3" />
        <path d="M186 22 L246 22 M186 16 L246 16 M246 19 L262 19" />
      </g>
      <path d="M201 200 L231 200 L231 329 L201 329 Z" fill="#cfe6f5" />
      <path d="M71 245 L109 245 L109 289 L71 289 Z" fill="#cfe6f5" />
      <g stroke={ink} fill="none">
        <line x1="290" y1="40" x2="290" y2="120" markerStart="url(#t)" markerEnd="url(#t)" />
        {second && <line x1="330" y1="40" x2="330" y2="200" markerStart="url(#t)" markerEnd="url(#t)" />}
      </g>
      <defs>
        <marker id="t" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={ink} />
        </marker>
      </defs>
      <g fill={ink}>
        <text x="296" y="84" fontStyle="italic">{second ? "l₁" : "l"}</text>
        {second && <text x="336" y="124" fontStyle="italic">l₂</text>}
        <text x="140" y="14">Tuning fork over the mouth</text>
        <text x="20" y="222">Reservoir</text>
        <text x="256" y="350">Metre rule (0 at the mouth)</text>
        <text x="110" y="200" textAnchor="end">Water surface</text>
        <text x="120" y="120" textAnchor="end">Resonance tube</text>
      </g>
      <line x1="112" y1="197" x2="198" y2="200" stroke={ink} strokeWidth="0.6" />
    </svg>
  );
}
