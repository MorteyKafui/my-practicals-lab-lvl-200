import { MU_0 } from "@/core/environment";
import type { FeedbackRule } from "@/core/feedback";
import { METRE_RULE, type InstrumentSpec } from "@/core/instruments";

import { getCatalogueEntry } from "../catalogue";
import type { ExperimentDefinition } from "../types";
import { createWorld, idealReadings, type SlinkyWorld } from "./model";

/** A teslameter reading to 0.001 mT. */
export const TESLAMETER: InstrumentSpec = { id: "teslameter", resolution: 0.001, unit: "mT", noise: 0.0005 };

const notZeroed: FeedbackRule = {
  id: "slinky-zero",
  stage: "measure",
  check: ({ actions, session }) => {
    if (session.mode !== "perform") return [];
    const firstRecord = actions.findIndex((a) => a.kind === "record");
    const zeroed = actions.findIndex((a) => a.kind === "zero-probe" && a.detail?.currentOn === false);
    const zeroedWithCurrent = actions.some((a) => a.kind === "zero-probe" && a.detail?.currentOn === true);
    if (zeroedWithCurrent) return [{ rule: "slinky-zero", severity: "error", stage: "measure", key: "slinky.zeroedWithCurrent" }];
    if (firstRecord >= 0 && (zeroed < 0 || zeroed > firstRecord)) return [{ rule: "slinky-zero", severity: "warning", stage: "measure", key: "slinky.notZeroed" }];
    return [];
  },
};

const currentChanged: FeedbackRule = {
  id: "slinky-current",
  stage: "measure",
  check: ({ actions }) => {
    const firstRecord = actions.findIndex((a) => a.kind === "record");
    const changed = firstRecord >= 0 && actions.slice(firstRecord).some((a) => a.kind === "set-current");
    return changed ? [{ rule: "slinky-current", severity: "warning", stage: "measure", key: "slinky.currentChanged" }] : [];
  },
};

/** Short, fat slinkies fall below the long-solenoid line: worth a sentence in the discussion. */
const endEffects: FeedbackRule = {
  id: "slinky-ends",
  stage: "graph",
  check: ({ completeRows }) => {
    const short = completeRows.filter((r) => (r.cells.L?.si ?? 1) < 0.45);
    return short.length ? [{ rule: "slinky-ends", severity: "tip", stage: "graph", key: "slinky.endEffects", rows: short.map((r) => r.id) }] : [];
  },
};

export const slinky: ExperimentDefinition<SlinkyWorld> = {
  entry: getCatalogueEntry("slinky")!,
  constants: [
    { id: "N", symbol: "N", kind: "count", units: [""] },
    { id: "I", symbol: "I", kind: "current", units: ["A", "mA"] },
  ],
  columns: [
    { id: "L", symbol: "L", kind: "length", units: ["cm", "m"], source: "measured", instrument: METRE_RULE },
    { id: "B", symbol: "B", kind: "magnetic-field", units: ["mT", "µT", "T"], source: "measured", instrument: TESLAMETER },
    { id: "nL", symbol: "N/L", kind: "inverse-length", units: ["m⁻¹"], source: "derived", derive: (r, c) => (c.N ?? Number.NaN) / (r.L ?? 1) },
  ],
  graph: { x: "nL", y: "B", throughOrigin: true, slope: { symbol: "k", unit: "mT m" }, intercept: { symbol: "c", unit: "mT" } },
  results: [
    {
      id: "mu0",
      symbol: "μ₀",
      unit: "H m⁻¹",
      // B = μ₀ I (N/L) → slope k = μ₀ I
      fromFit: ({ slope }, { constants }) => (constants.I ? slope / constants.I : Number.NaN),
      accepted: () => MU_0,
      goodWithinPercent: 5,
    },
  ],
  createWorld,
  idealRows: (world, _conditions, constants) =>
    idealReadings(world, constants.I ?? 2).map(({ L, B }) => ({ L, B, nL: world.turns / L })),
  reveal: (world) => [
    { label: "Turns on the slinky", value: String(world.turns) },
    { label: "Slinky diameter", value: `${(world.diameter * 100).toFixed(1)} cm` },
    { label: "Ammeter calibration error", value: `${(world.ammeterError * 100).toFixed(1)} %` },
    { label: "Hall probe offset", value: `${(world.probeOffset * 1e3).toFixed(3)} mT` },
  ],
  rules: [notZeroed, currentChanged, endEffects],
  describeAction: ({ kind, detail: d }) => {
    switch (kind) {
      case "zero-probe":
        return d?.currentOn ? undefined : "With the current switched off, the Hall probe was placed at the centre of the slinky and the teslameter was zeroed.";
      case "set-current":
        return "The current was set with the rheostat and kept constant, read on the ammeter.";
      case "stretch":
        return "The slinky was stretched to a measured length L between its clamps, measured with the metre rule.";
      case "power":
        return d?.on ? "The supply was switched on and the field at the centre of the slinky was read on the teslameter." : undefined;
      default:
        return undefined;
    }
  },
  logLine: ({ kind, detail: d }) => {
    switch (kind) {
      case "zero-probe":
        return d?.currentOn ? "Teslameter zeroed with the current ON" : "Teslameter zeroed (current off)";
      case "set-current":
        return "Current adjusted";
      case "stretch":
        return "Slinky length changed";
      case "power":
        return d?.on ? "Supply on" : "Supply off";
      case "view":
        return d?.mode === "eye" ? "Eye-level view of the rule" : "Bench view";
      case "record":
        return `Recorded ${d?.column} = ${d?.typed}`;
      default:
        return kind;
    }
  },
  stepChecks: [
    ({ kinds }) => kinds.has("zero-probe"),
    ({ kinds }) => kinds.has("set-current"),
    ({ kinds }) => kinds.has("stretch"),
    ({ rows }) => rows >= 1,
    ({ rows }) => rows >= 6,
  ],
};
