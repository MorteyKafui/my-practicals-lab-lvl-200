import { speedOfSound } from "@/core/environment";
import type { FeedbackRule } from "@/core/feedback";
import type { InstrumentSpec } from "@/core/instruments";

import { getCatalogueEntry } from "../catalogue";
import type { ExperimentDefinition } from "../types";
import { createWorld, idealReadings, neckConstant, type HelmholtzWorld } from "./model";

/** A 100 ml measuring cylinder with 1 ml graduations; the meniscus is read square-on. */
export const MEASURING_CYLINDER: InstrumentSpec = { id: "measuring-cylinder", resolution: 1, unit: "cm³" };
/** The signal generator's display: whole hertz. */
export const SIGNAL_GENERATOR: InstrumentSpec = { id: "signal-generator", resolution: 1, unit: "Hz" };

/** More water → less air → higher frequency. A frequency that falls as water is added was misread. */
const trend: FeedbackRule = {
  id: "helmholtz-trend",
  stage: "observations",
  check: ({ completeRows }) => {
    const pts = completeRows
      .map((r) => ({ id: r.id, v: r.cells.water?.si, f: r.cells.f?.si }))
      .filter((p): p is { id: string; v: number; f: number } => p.v !== undefined && p.f !== undefined)
      .sort((a, b) => a.v - b.v);
    const bad = pts.filter((p, i) => i > 0 && p.f < pts[i - 1]!.f * 0.995).map((p) => p.id);
    return bad.length ? [{ rule: "helmholtz-trend", severity: "warning", stage: "observations", key: "helmholtz.frequencyFalls", rows: bad }] : [];
  },
};

const unknownMissing: FeedbackRule = {
  id: "helmholtz-unknown",
  stage: "calculate",
  check: ({ session }) =>
    session.constants.fu?.trim() ? [] : [{ rule: "helmholtz-unknown", severity: "tip", stage: "calculate", key: "helmholtz.noUnknown" }],
};

/** Speed of sound used in results: the student's thermometer if recorded, else the room's. */
const c = (conditions: { temperatureC: number }, constants: Readonly<Record<string, number>>) =>
  speedOfSound(constants.theta !== undefined ? constants.theta - 273.15 : conditions.temperatureC);

export const helmholtz: ExperimentDefinition<HelmholtzWorld> = {
  entry: getCatalogueEntry("helmholtz")!,
  constants: [
    { id: "theta", symbol: "θ", kind: "temperature", units: ["°C"] },
    { id: "fu", symbol: "f (unknown)", kind: "frequency", units: ["Hz"] },
  ],
  columns: [
    { id: "water", symbol: "V_w", kind: "volume", units: ["cm³", "ml"], source: "measured", instrument: MEASURING_CYLINDER },
    { id: "f", symbol: "f", kind: "frequency", units: ["Hz"], source: "measured", instrument: SIGNAL_GENERATOR },
    { id: "invF2", symbol: "1/f²", kind: "inverse-frequency-squared", units: ["s²"], source: "derived", derive: (r) => 1 / (r.f ?? 1) ** 2 },
  ],
  graph: { x: "water", y: "invF2", throughOrigin: false, slope: { symbol: "m", unit: "s² cm⁻³" }, intercept: { symbol: "c", unit: "s²" } },
  results: [
    {
      id: "v0",
      symbol: "V₀",
      unit: "cm³",
      // 1/f² = c₀ + m·V_w meets the V_w-axis at V₀ = −c₀/m
      fromFit: ({ slope, intercept }) => (-intercept / slope) * 1e6,
      accepted: (world) => (world ? world.v0 * 1e6 : undefined),
      goodWithinPercent: 4,
    },
    {
      id: "neck",
      symbol: "A/L′",
      unit: "m",
      // slope m = −4π²L′/(c²A) → A/L′ = −4π²/(c²m)
      fromFit: ({ slope }, { conditions, constants }) => (-4 * Math.PI ** 2) / (c(conditions, constants) ** 2 * slope),
      accepted: (world) => (world ? neckConstant(world) : undefined),
      goodWithinPercent: 6,
    },
    {
      id: "unknown",
      symbol: "V_unknown",
      unit: "cm³",
      // Read the unknown off the calibration line: V = (1/f_u² − c₀)/m
      fromFit: ({ slope, intercept }, { constants }) => (constants.fu ? ((1 / constants.fu ** 2 - intercept) / slope) * 1e6 : Number.NaN),
      accepted: (world) => (world ? world.unknownWater * 1e6 : undefined),
      goodWithinPercent: 8,
    },
  ],
  createWorld,
  idealRows: (world, conditions) => idealReadings(world, conditions).map(({ water, f }) => ({ water, f, invF2: 1 / f ** 2 })),
  reveal: (world) => [
    { label: "Air volume of the empty flask", value: `${(world.v0 * 1e6).toFixed(0)} cm³` },
    { label: "Neck radius", value: `${(world.neckRadius * 100).toFixed(2)} cm` },
    { label: "Neck length (effective)", value: `${(world.neckLength * 100).toFixed(1)} cm (${(world.effectiveLength * 100).toFixed(1)} cm)` },
    { label: "Unknown volume of water", value: `${(world.unknownWater * 1e6).toFixed(0)} cm³` },
  ],
  rules: [trend, unknownMissing],
  describeAction: ({ kind, detail: d }) => {
    switch (kind) {
      case "pour":
        return "A measured volume of water was poured into the flask from a measuring cylinder, read at the bottom of the meniscus.";
      case "sweep":
        return "The signal generator, connected to a small loudspeaker held at the mouth of the flask, was swept slowly in frequency until the sound was loudest; the frequency was read from its display.";
      case "unknown":
        return "The flask was emptied and an unknown volume of water was poured in, and its resonant frequency was found in the same way.";
      case "empty":
        return d?.reason === "unknown" ? undefined : "The flask was emptied and dried before starting.";
      default:
        return undefined;
    }
  },
  logLine: ({ kind, detail: d }) => {
    switch (kind) {
      case "fill-cylinder":
        return "Measuring cylinder filled";
      case "pour":
        return "Water poured into the flask";
      case "sweep":
        return "Signal generator frequency changed";
      case "speaker":
        return d?.on ? "Loudspeaker on" : "Loudspeaker off";
      case "unknown":
        return "Unknown sample poured in";
      case "empty":
        return "Flask emptied";
      default:
        return kind;
    }
  },
  stepChecks: [
    ({ kinds }) => kinds.has("speaker"),
    ({ kinds }) => kinds.has("sweep"),
    ({ kinds }) => kinds.has("pour"),
    ({ rows }) => rows >= 5,
    ({ kinds }) => kinds.has("unknown"),
  ],
};
