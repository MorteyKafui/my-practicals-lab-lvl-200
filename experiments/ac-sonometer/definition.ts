import type { FeedbackRule } from "@/core/feedback";
import { METRE_RULE } from "@/core/instruments";

import { getCatalogueEntry } from "../catalogue";
import { approachesRule, transcriptionRule } from "../shared-rules";
import type { ExperimentDefinition } from "../types";
import { createWorld, FIXED_BRIDGE_CM, idealReadings, type AcSonometerWorld } from "./model";

const G_STANDARD = 9.81;

/** Perform mode: the magnet should straddle the middle of the vibrating length when resonance is found. */
const magnetPlacement: FeedbackRule = {
  id: "ac-magnet",
  stage: "measure",
  check: ({ actions }) => {
    const thrown = actions.filter((a) => a.kind === "rider-thrown");
    const offCentre = thrown.filter((a) => Math.abs(Number(a.detail?.magnetFraction ?? 0.5) - 0.5) > 0.2).length;
    return offCentre ? [{ rule: "ac-magnet", severity: "warning", stage: "measure", key: "ac.magnetOffCentre", params: { n: offCentre } }] : [];
  },
};

/** The load must be recorded as T = Mg in newtons, with g = 9.81 N kg⁻¹. */
const tensionColumn: FeedbackRule = {
  id: "ac-tension",
  stage: "observations",
  check: ({ completeRows }) => {
    const rows = completeRows.filter((r) => {
      const m = r.cells.M?.si;
      const t = r.cells.T?.si;
      return m !== undefined && t !== undefined && Math.abs(t - m) < 1e-9;
    });
    return rows.length ? [{ rule: "ac-tension", severity: "error", stage: "observations", key: "ac.massNotTension", rows: rows.map((r) => r.id), column: "T" }] : [];
  },
};

export const acSonometer: ExperimentDefinition<AcSonometerWorld> = {
  entry: getCatalogueEntry("ac-sonometer")!,
  constants: [{ id: "mu", symbol: "μ", kind: "linear-density", units: ["g m⁻¹", "kg m⁻¹"] }],
  columns: [
    { id: "M", symbol: "M", kind: "mass", units: ["kg", "g"], source: "given" },
    { id: "T", symbol: "T", kind: "tension", units: ["N"], source: "derived", derive: (r) => (r.M ?? 0) * G_STANDARD },
    { id: "l1", symbol: "l₁", kind: "length", units: ["cm", "m", "mm"], source: "measured", instrument: METRE_RULE },
    { id: "l2", symbol: "l₂", kind: "length", units: ["cm", "m", "mm"], source: "measured", instrument: METRE_RULE },
    { id: "l", symbol: "l", kind: "length", units: ["cm", "m"], source: "derived", derive: (r) => ((r.l1 ?? 0) + (r.l2 ?? 0)) / 2 },
    { id: "lsq", symbol: "l²", kind: "length-squared", units: ["m²"], source: "derived", derive: (r) => (((r.l1 ?? 0) + (r.l2 ?? 0)) / 2) ** 2 },
  ],
  graph: { x: "T", y: "lsq", throughOrigin: true, slope: { symbol: "k", unit: "m² N⁻¹" }, intercept: { symbol: "c", unit: "m²" } },
  results: [
    {
      id: "f",
      symbol: "f",
      unit: "Hz",
      // l² = T/(4f²μ) → slope k = 1/(4f²μ) → f = 1/(2√(kμ))
      fromFit: ({ slope }, { constants }) => (constants.mu && slope > 0 ? 1 / (2 * Math.sqrt(slope * constants.mu)) : Number.NaN),
      accepted: (_world, conditions) => conditions.mainsHz,
      goodWithinPercent: 3,
    },
  ],
  createWorld,
  idealRows: (world, conditions) =>
    idealReadings(world, conditions).map(({ kg, l }) => ({ M: kg, T: kg * G_STANDARD, l1: l, l2: l, l, lsq: l * l })),
  reveal: (world) => [
    { label: "True mass per unit length of the wire", value: `${(world.mu * 1000).toFixed(3)} g m⁻¹` },
    { label: "Value printed on the reel", value: `${(world.muLabel * 1000).toFixed(2)} g m⁻¹` },
    { label: "Tension lost to pulley friction", value: `${(world.pulleyLoss * 100).toFixed(1)} %` },
  ],
  rules: [tensionColumn, approachesRule("l1", "l2"), magnetPlacement, transcriptionRule(FIXED_BRIDGE_CM)],
  describeAction: ({ kind, detail: d }) => {
    switch (kind) {
      case "set-load":
        return `A load of ${d?.kg} kg was hung from the wire over the pulley.`;
      case "place-magnet":
        return "A horseshoe magnet was placed so that its poles straddled the wire at the middle of the vibrating length.";
      case "place-rider":
        return "A paper rider was placed on the wire at the middle of the vibrating length.";
      case "switch":
        return d?.on ? "The low-voltage alternating supply from the step-down transformer was switched on." : undefined;
      case "rider-thrown":
        return "The movable bridge was adjusted until the wire vibrated with maximum amplitude and the rider was thrown off; the length between the bridges was read from the metre rule.";
      default:
        return undefined;
    }
  },
  logLine: ({ kind, detail: d }) => {
    switch (kind) {
      case "set-load":
        return `Load set to ${d?.kg} kg`;
      case "place-magnet":
        return `Magnet placed at ${Number(d?.at).toFixed(1)} cm`;
      case "place-rider":
        return "Rider placed on the wire";
      case "switch":
        return d?.on ? "AC supply on" : "AC supply off";
      case "move-bridge":
        return `Bridge moved to ${Number(d?.to).toFixed(1)} cm`;
      case "rider-thrown":
        return "Rider thrown off — maximum vibration";
      case "view":
        return d?.mode === "eye" ? "Eye-level view of the scale" : "Bench view";
      default:
        return kind;
    }
  },
  stepChecks: [
    ({ kinds }) => kinds.has("set-load"),
    ({ kinds }) => kinds.has("place-magnet"),
    ({ kinds }) => kinds.has("switch"),
    ({ kinds }) => kinds.has("move-bridge"),
    ({ kinds }) => kinds.has("rider-thrown"),
    ({ rows }) => rows >= 1,
    ({ rows }) => rows >= 5,
  ],
};
