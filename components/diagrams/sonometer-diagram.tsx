import { HelmholtzDiagram } from "./helmholtz-diagram";
import { TubeDiagram } from "./tube-diagram";

/** Labelled side view of the sonometer set-up, as a student would draw it in a report. */
export function SonometerDiagram({ className, ref, variant = "fork" }: DiagramProps & { variant?: "fork" | "ac" }) {
  const ink = "#111111";
  return (
    <svg ref={ref} viewBox="0 0 640 300" className={className} role="img" aria-label="Diagram of the sonometer set-up" fontFamily="Inter, Arial, sans-serif" fontSize="12">
      <rect width="640" height="300" fill="#ffffff" />
      {/* Box */}
      <rect x="40" y="150" width="500" height="60" fill="none" stroke={ink} strokeWidth="1.5" />
      <circle cx="290" cy="180" r="10" fill="none" stroke={ink} />
      {/* Wire over bridges to pulley */}
      <line x1="44" y1="128" x2="560" y2="128" stroke={ink} strokeWidth="1.2" />
      <path d="M560 128 A 14 14 0 0 1 574 142 L 574 230" fill="none" stroke={ink} strokeWidth="1.2" />
      <circle cx="560" cy="142" r="14" fill="none" stroke={ink} strokeWidth="1.5" />
      <line x1="540" y1="160" x2="556" y2="148" stroke={ink} />
      {/* Fixed and movable bridges */}
      <path d="M90 150 L100 128 L110 150 Z" fill="none" stroke={ink} strokeWidth="1.5" />
      <path d="M380 150 L390 128 L400 150 Z" fill="none" stroke={ink} strokeWidth="1.5" />
      {/* Rider at the middle */}
      <path d="M239 128 L245 116 L251 128" fill="none" stroke="#d3481b" strokeWidth="1.5" />
      {/* Load */}
      <line x1="574" y1="230" x2="574" y2="236" stroke={ink} />
      <rect x="558" y="236" width="32" height="10" fill="none" stroke={ink} />
      <rect x="558" y="246" width="32" height="10" fill="none" stroke={ink} />
      <rect x="558" y="256" width="32" height="10" fill="none" stroke={ink} />
      {variant === "fork" ? (
        <path d="M180 150 L180 136 M174 136 L174 92 M186 136 L186 92 M174 136 Q180 142 186 136" fill="none" stroke={ink} strokeWidth="1.5" />
      ) : (
        <g fill="none" stroke={ink} strokeWidth="1.5">
          {/* Horseshoe magnet straddling the wire, transformer feeding the wire ends */}
          <path d="M236 150 L236 104 Q245 96 254 104 L254 150" />
          <rect x="20" y="40" width="70" height="40" />
          <path d="M55 80 L55 128 L44 128 M90 60 L590 60 L590 128" strokeDasharray="4 3" />
        </g>
      )}
      {/* Length l */}
      <line x1="100" y1="96" x2="390" y2="96" stroke={ink} markerStart="url(#a)" markerEnd="url(#a)" />
      <defs>
        <marker id="a" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={ink} />
        </marker>
      </defs>
      <text x="245" y="88" textAnchor="middle" fontStyle="italic">l</text>
      {/* Labels */}
      <g fill={ink}>
        <text x="60" y="240">Sonometer box</text>
        <text x="66" y="118">Fixed bridge</text>
        <text x="400" y="118">Movable bridge</text>
        <text x="215" y="72">{variant === "fork" ? "Paper rider at middle" : "Magnet and rider at middle"}</text>
        {variant === "fork" ? <text x="150" y="80" textAnchor="end">Tuning fork</text> : <text x="24" y="34">Step-down transformer (AC)</text>}
        <text x="600" y="150">Pulley</text>
        <text x="600" y="256">Load M</text>
        <text x="40" y="285" fill="#5a5042">Metre rule fixed along the box (not shown)</text>
      </g>
      <line x1="245" y1="76" x2="245" y2="112" stroke={ink} strokeWidth="0.6" />
    </svg>
  );
}

export interface DiagramProps {
  className?: string;
  ref?: React.Ref<SVGSVGElement>;
}

export const DIAGRAMS: Record<string, (props: DiagramProps) => React.ReactNode> = {
  "stretched-wire": SonometerDiagram,
  "ac-sonometer": (props) => <SonometerDiagram {...props} variant="ac" />,
  "resonance-tube-two": (props) => <TubeDiagram {...props} />,
  "resonance-tube-forks": (props) => <TubeDiagram {...props} second={false} />,
  helmholtz: HelmholtzDiagram,
};
