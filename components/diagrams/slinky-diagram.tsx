import type { DiagramProps } from "./types";

/** Labelled slinky circuit: supply, rheostat, ammeter in series with the slinky; Hall probe at the centre. */
export function SlinkyDiagram({ className, ref }: DiagramProps) {
  const ink = "#111111";
  const turns = Array.from({ length: 22 }, (_, i) => 120 + i * 13);
  return (
    <svg ref={ref} viewBox="0 0 560 300" className={className} role="img" aria-label="Diagram of the slinky circuit" fontFamily="Inter, Arial, sans-serif" fontSize="12">
      <rect width="560" height="300" fill="#ffffff" />
      <g fill="none" stroke={ink} strokeWidth="1.4">
        {turns.map((x) => (
          <ellipse key={x} cx={x} cy="150" rx="6" ry="30" />
        ))}
        <path d="M114 150 L60 150 L60 60 L140 60 M200 60 L250 60 M330 60 L500 60 L500 150 L402 150" />
        <rect x="140" y="48" width="60" height="24" />
        <circle cx="290" cy="60" r="16" />
        <path d="M262 150 L262 240 L330 240" strokeWidth="2.5" />
        <rect x="330" y="226" width="70" height="30" />
        <path d="M100 280 L404 280" markerStart="url(#s)" markerEnd="url(#s)" />
      </g>
      <defs>
        <marker id="s" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={ink} />
        </marker>
      </defs>
      <g fill={ink}>
        <text x="286" y="65" textAnchor="middle">A</text>
        <text x="140" y="40">Rheostat</text>
        <text x="40" y="44">DC supply</text>
        <text x="320" y="110">Slinky, N turns</text>
        <text x="336" y="246">Teslameter</text>
        <text x="200" y="232">Hall probe</text>
        <text x="252" y="276" textAnchor="middle" fontStyle="italic">L</text>
      </g>
    </svg>
  );
}
