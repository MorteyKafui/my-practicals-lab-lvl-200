import type { DiagramProps } from "./sonometer-diagram";

/** Labelled narrow-neck resonator set-up: flask with water, loudspeaker at the mouth, signal generator. */
export function HelmholtzDiagram({ className, ref }: DiagramProps) {
  const ink = "#111111";
  return (
    <svg ref={ref} viewBox="0 0 520 300" className={className} role="img" aria-label="Diagram of the narrow-neck resonator set-up" fontFamily="Inter, Arial, sans-serif" fontSize="12">
      <rect width="520" height="300" fill="#ffffff" />
      <path d="M232 70 L232 120 A70 70 0 1 0 268 120 L268 70" fill="none" stroke={ink} strokeWidth="1.5" />
      <path d="M197 228 A70 70 0 0 0 303 228 L303 228 Q250 236 197 228 Z" fill="#cfe6f5" stroke="#2f6fa0" />
      <rect x="262" y="34" width="34" height="26" fill="none" stroke={ink} strokeWidth="1.5" />
      <path d="M262 40 L250 34 L250 60 L262 54" fill="none" stroke={ink} />
      <rect x="380" y="40" width="110" height="60" fill="none" stroke={ink} strokeWidth="1.5" />
      <rect x="392" y="52" width="56" height="18" fill="none" stroke={ink} />
      <path d="M296 47 Q 340 30 380 60" fill="none" stroke={ink} strokeDasharray="4 3" />
      <rect x="60" y="120" width="36" height="140" fill="none" stroke={ink} strokeWidth="1.5" />
      <path d="M60 200 L96 200" stroke="#2f6fa0" />
      <g fill={ink}>
        <text x="290" y="24">Loudspeaker</text>
        <text x="390" y="118">Signal generator</text>
        <text x="320" y="210">Water, volume V_w</text>
        <text x="320" y="160">Air, volume V = V₀ − V_w</text>
        <text x="170" y="96" textAnchor="end">Neck (area A, length L)</text>
        <text x="40" y="280">Measuring cylinder</text>
      </g>
      <line x1="172" y1="92" x2="230" y2="96" stroke={ink} strokeWidth="0.6" />
    </svg>
  );
}
