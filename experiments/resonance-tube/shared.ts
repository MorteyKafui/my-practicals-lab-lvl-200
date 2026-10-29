import { speedOfSound } from "@/core/environment";
import type { FeedbackRule } from "@/core/feedback";
import type { InstrumentSpec } from "@/core/instruments";

import type { ExperimentDefinition, ResultSpec } from "../types";
import type { TubeWorld } from "./physics";

/** The rule beside the tube: 1 mm divisions read in cm, the water surface (meniscus) 1 mm above the scale. */
export const TUBE_RULE: InstrumentSpec = { id: "tube-rule", resolution: 0.1, unit: "cm", pointerHeight: 0.2 };

export const theta = { id: "theta", symbol: "θ", kind: "temperature" as const, units: ["°C"] };

/** v corrected to 0 °C with the student's own thermometer reading: v₀ = v·√(273/(273 + θ)). */
export function v0Result(vFromSlope: (slope: number) => number): ResultSpec<TubeWorld> {
  return {
    id: "v0",
    symbol: "v₀",
    unit: "m s⁻¹",
    fromFit: ({ slope }, { constants }) => (constants.theta === undefined ? Number.NaN : vFromSlope(slope) * Math.sqrt(273.15 / constants.theta)),
    accepted: () => 331.3,
    goodWithinPercent: 3,
  };
}

export function vResult(vFromSlope: (slope: number) => number): ResultSpec<TubeWorld> {
  return {
    id: "v",
    symbol: "v",
    unit: "m s⁻¹",
    fromFit: ({ slope }) => vFromSlope(slope),
    // Speed of sound at the room's actual temperature (or the student's reading in bring-your-data mode).
    accepted: (world, conditions, constants) =>
      speedOfSound(world ? conditions.temperatureC : constants.theta !== undefined ? constants.theta - 273.15 : conditions.temperatureC),
    goodWithinPercent: 3,
  };
}

export const noTemperature: FeedbackRule = {
  id: "tube-temperature",
  stage: "observations",
  check: ({ session }) =>
    session.constants.theta?.trim() ? [] : [{ rule: "tube-temperature", severity: "warning", stage: "observations", key: "tube.noTemperature" }],
};

export function tubeDescribe(action: Parameters<ExperimentDefinition["describeAction"]>[0]): string | undefined {
  const d = action.detail ?? {};
  switch (action.kind) {
    case "strike-fork":
      return `A tuning fork of frequency ${d.f} Hz was struck on a rubber pad and held horizontally over the mouth of the tube.`;
    case "move-water":
      return "The water level in the tube was raised or lowered by moving the reservoir.";
    case "mark-resonance":
      return "The level was adjusted until the sound was loudest, and the length of the air column from the mouth to the water surface was read on the metre rule.";
    default:
      return undefined;
  }
}

export function tubeLogLine({ kind, detail: d }: Parameters<ExperimentDefinition["logLine"]>[0]): string {
  switch (kind) {
    case "strike-fork":
      return `${d?.f} Hz fork struck and held over the tube`;
    case "move-water":
      return "Water level changed";
    case "mark-resonance":
      return `Loudest sound marked (fork ${d?.f} Hz)`;
    case "view":
      return d?.mode === "eye" ? "Eye-level view at the water surface" : "Bench view";
    default:
      return kind;
  }
}
