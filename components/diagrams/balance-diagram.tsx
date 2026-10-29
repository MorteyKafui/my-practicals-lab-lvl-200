import type { DiagramProps } from "./types";

/** Labelled current balance: magnets on a top-pan balance, copper rod between the poles, series circuit. */
export function BalanceDiagram({ className, ref }: DiagramProps) {
  const ink = "#111111";
  return (
    <svg ref={ref} viewBox="0 0 560 300" className={className} role="img" aria-label="Diagram of the current balance" fontFamily="Inter, Arial, sans-serif" fontSize="12">
      <rect width="560" height="300" fill="#ffffff" />
      <g fill="none" stroke={ink} strokeWidth="1.5">
        <rect x="200" y="210" width="160" height="50" />
        <rect x="246" y="222" width="68" height="18" />
        <path d="M220 206 L340 206" strokeWidth="3" />
        <path d="M240 200 L240 140 L320 140 L320 200 L300 200 L300 156 L260 156 L260 200 Z" />
        <path d="M120 150 L440 150" stroke="#c47a3a" strokeWidth="3" />
        <path d="M120 150 L120 260 M440 150 L440 260" />
        <path d="M120 60 L120 150 M440 60 L440 150 M120 60 L190 60 M250 60 L310 60 M370 60 L440 60" />
        <rect x="190" y="48" width="60" height="24" />
        <circle cx="340" cy="60" r="16" />
      </g>
      <rect x="262" y="160" width="10" height="34" fill="#b3261e" />
      <rect x="288" y="160" width="10" height="34" fill="#2c5f9e" />
      <g fill={ink}>
        <text x="336" y="65" textAnchor="middle">A</text>
        <text x="190" y="40">Supply, rheostat</text>
        <text x="380" y="40">Ammeter</text>
        <text x="370" y="236">Top-pan balance</text>
        <text x="350" y="146">Copper rod (current I)</text>
        <text x="140" y="130">Magnets on steel yoke</text>
        <text x="140" y="290">Clamp stands hold the rod clear of the magnets</text>
      </g>
      <line x1="230" y1="134" x2="262" y2="172" stroke={ink} strokeWidth="0.6" />
    </svg>
  );
}
