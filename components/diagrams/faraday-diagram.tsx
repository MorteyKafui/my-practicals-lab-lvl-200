import type { DiagramProps } from "./types";

/** Labelled Faraday's-law set-up: generator, a.c. ammeter, solenoid with search coil, oscilloscope. */
export function FaradayDiagram({ className, ref }: DiagramProps) {
  const ink = "#111111";
  const turns = Array.from({ length: 24 }, (_, i) => 150 + i * 11);
  return (
    <svg ref={ref} viewBox="0 0 560 300" className={className} role="img" aria-label="Diagram of the Faraday's law set-up" fontFamily="Inter, Arial, sans-serif" fontSize="12">
      <rect width="560" height="300" fill="#ffffff" />
      <g fill="none" stroke={ink} strokeWidth="1.4">
        <rect x="146" y="120" width="264" height="60" />
        {turns.map((x) => (
          <path key={x} d={`M${x} 120 L${x + 6} 180`} />
        ))}
        <ellipse cx="278" cy="150" rx="5" ry="16" stroke="#2c5f9e" strokeWidth="2" />
        <path d="M146 150 L80 150 L80 60 L120 60 M180 60 L230 60 M262 60 L470 60 L470 150 L410 150" />
        <rect x="120" y="44" width="60" height="32" />
        <circle cx="246" cy="60" r="16" />
        <path d="M278 166 L278 240 L380 240" stroke="#2c5f9e" />
        <rect x="380" y="214" width="100" height="56" />
        <path d="M392 242 Q 405 222 418 242 T 444 242 T 470 242" stroke="#2f8f3c" />
      </g>
      <g fill={ink}>
        <text x="246" y="65" textAnchor="middle">A</text>
        <text x="110" y="36">Signal generator</text>
        <text x="220" y="36">a.c. ammeter</text>
        <text x="300" y="112">Solenoid, n turns per metre</text>
        <text x="186" y="230">Search coil, N turns, diameter d</text>
        <text x="390" y="290">Oscilloscope</text>
      </g>
    </svg>
  );
}
