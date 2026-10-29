import { BalanceDiagram } from "./balance-diagram";
import { FaradayDiagram } from "./faraday-diagram";
import { HelmholtzDiagram } from "./helmholtz-diagram";
import { SlinkyDiagram } from "./slinky-diagram";
import { SonometerDiagram } from "./sonometer-diagram";
import { TubeDiagram } from "./tube-diagram";
import type { DiagramProps } from "./types";

/** The labelled report diagram for each practical (embedded in the printed report and Word export). */
export const DIAGRAMS: Record<string, (props: DiagramProps) => React.ReactNode> = {
  "stretched-wire": SonometerDiagram,
  "ac-sonometer": (props) => <SonometerDiagram {...props} variant="ac" />,
  "resonance-tube-two": (props) => <TubeDiagram {...props} />,
  "resonance-tube-forks": (props) => <TubeDiagram {...props} second={false} />,
  helmholtz: HelmholtzDiagram,
  slinky: SlinkyDiagram,
  "current-balance": BalanceDiagram,
  faraday: FaradayDiagram,
};
