import { MU_0 } from "@/core/environment";
import type { FeedbackRule } from "@/core/feedback";
import type { InstrumentSpec } from "@/core/instruments";

import { getCatalogueEntry } from "../catalogue";
import type { ExperimentDefinition } from "../types";
import { COIL_TURNS, createWorld, idealReadings, LABEL_TURNS_PER_M, type FaradayWorld } from "./model";

/** Oscilloscope graticule: read to 0.1 of a division (minor ticks every 0.2 div). */
export const GRATICULE: InstrumentSpec = { id: "oscilloscope", resolution: 0.1, unit: "div" };
export const GENERATOR: InstrumentSpec = { id: "signal-generator", resolution: 1, unit: "Hz" };
export const AC_AMMETER: InstrumentSpec = { id: "ac-ammeter", resolution: 1, unit: "mA" };

/** At constant current ε₀ ∝ f; a current that wanders bends the line. */
const currentVaries: FeedbackRule = {
  id: "faraday-current",
  stage: "observations",
  check: ({ completeRows }) => {
    const currents = completeRows.map((r) => r.cells.I?.si).filter((v): v is number => v !== undefined && v > 0);
    if (currents.length < 3) return [];
    const mean = currents.reduce((a, b) => a + b, 0) / currents.length;
    const spread = (Math.max(...currents) - Math.min(...currents)) / mean;
    return spread > 0.03 ? [{ rule: "faraday-current", severity: "warning", stage: "observations", key: "faraday.currentVaries", params: { percent: Math.round(spread * 100) } }] : [];
  },
};

/** ε₀ worked out as Y·S (the peak-to-peak value) instead of Y·S/2. */
const peakToPeak: FeedbackRule = {
  id: "faraday-pp",
  stage: "observations",
  check: ({ completeRows }) => {
    const rows = completeRows.filter((r) => {
      const y = r.cells.Y?.si;
      const s = r.cells.S?.si;
      const e = r.cells.e0?.si;
      return y !== undefined && s !== undefined && e !== undefined && Math.abs(e - y * s) < y * s * 0.02;
    });
    return rows.length ? [{ rule: "faraday-pp", severity: "error", stage: "observations", key: "faraday.peakToPeak", rows: rows.map((r) => r.id), column: "e0" }] : [];
  },
};

const offScreen: FeedbackRule = {
  id: "faraday-screen",
  stage: "observations",
  check: ({ completeRows }) => {
    const rows = completeRows.filter((r) => (r.cells.Y?.si ?? 0) > 8);
    const tiny = completeRows.filter((r) => (r.cells.Y?.si ?? 8) < 2);
    const out = [];
    if (rows.length) out.push({ rule: "faraday-screen", severity: "error" as const, stage: "observations" as const, key: "faraday.offScreen", rows: rows.map((r) => r.id), column: "Y" });
    if (tiny.length) out.push({ rule: "faraday-screen", severity: "tip" as const, stage: "observations" as const, key: "faraday.tinyTrace", rows: tiny.map((r) => r.id), column: "Y" });
    return out;
  },
};

export const faraday: ExperimentDefinition<FaradayWorld> = {
  entry: getCatalogueEntry("faraday")!,
  constants: [
    { id: "N", symbol: "N", kind: "count", units: [""] },
    { id: "n", symbol: "n", kind: "inverse-length", units: ["m⁻¹"] },
    { id: "d", symbol: "d", kind: "length", units: ["cm", "mm", "m"] },
  ],
  columns: [
    { id: "f", symbol: "f", kind: "frequency", units: ["Hz"], source: "measured", instrument: GENERATOR },
    { id: "I", symbol: "I (r.m.s.)", kind: "current", units: ["mA", "A"], source: "measured", instrument: AC_AMMETER },
    { id: "Y", symbol: "Y (p-p)", kind: "count", units: [""], source: "measured", instrument: GRATICULE },
    { id: "S", symbol: "S", kind: "voltage", units: ["mV", "V"], source: "given" },
    { id: "e0", symbol: "ε₀", kind: "voltage", units: ["mV", "V"], source: "derived", derive: (r) => ((r.Y ?? 0) * (r.S ?? 0)) / 2 },
  ],
  graph: { x: "f", y: "e0", throughOrigin: true, slope: { symbol: "k", unit: "mV Hz⁻¹" }, intercept: { symbol: "c", unit: "mV" } },
  results: [
    {
      id: "mu0",
      symbol: "μ₀",
      unit: "H m⁻¹",
      // ε₀ = 2πf · N μ₀ n A I₀ with I₀ = √2 I_rms → μ₀ = k / (2π N n A √2 I_rms)
      fromFit: ({ slope }, { constants, rows }) => {
        const currents = rows.map((r) => r.I).filter((v): v is number => v !== undefined);
        if (!constants.N || !constants.n || !constants.d || currents.length === 0) return Number.NaN;
        const irms = currents.reduce((a, b) => a + b, 0) / currents.length;
        const area = (Math.PI * constants.d ** 2) / 4;
        return slope / (2 * Math.PI * constants.N * constants.n * area * Math.SQRT2 * irms);
      },
      accepted: () => MU_0,
      goodWithinPercent: 6,
    },
  ],
  createWorld,
  // A careful run at 100 mA r.m.s. (the Compare overlay only uses f and ε₀).
  idealRows: (world) => idealReadings(world, 0.1).map(({ f, e0, s, y }) => ({ f, I: 0.1, Y: y, S: s, e0 })),
  reveal: (world) => [
    { label: "Turns per metre of the solenoid", value: `${world.n.toFixed(0)} m⁻¹ (label ${LABEL_TURNS_PER_M})` },
    { label: "Search coil diameter", value: `${(world.coilDiameter * 100).toFixed(3)} cm, ${COIL_TURNS} turns` },
    { label: "Solenoid resistance and inductance", value: `${world.resistance.toFixed(1)} Ω, ${(world.inductance * 1000).toFixed(2)} mH` },
    { label: "Ammeter calibration error", value: `${(world.ammeterError * 100).toFixed(1)} %` },
  ],
  rules: [currentVaries, peakToPeak, offScreen],
  describeAction: ({ kind, detail: d }) => {
    switch (kind) {
      case "power":
        return d?.on ? "The signal generator was connected across the solenoid in series with an a.c. ammeter, and the search coil at the centre of the solenoid was connected to the oscilloscope." : undefined;
      case "frequency":
        return "For each frequency, the generator's amplitude was adjusted so that the r.m.s. current on the ammeter stayed the same.";
      case "volts-div":
        return "The oscilloscope's volts/div was set so that the trace was as large as possible on the screen, and its peak-to-peak height was read in divisions.";
      default:
        return undefined;
    }
  },
  logLine: ({ kind, detail: d }) => {
    switch (kind) {
      case "power":
        return d?.on ? "Generator output on" : "Generator output off";
      case "frequency":
        return `Frequency set (${d?.f} Hz)`;
      case "amplitude":
        return "Amplitude adjusted";
      case "volts-div":
        return `Oscilloscope set to ${d?.label}/div`;
      case "record":
        return `Recorded ${d?.column} = ${d?.typed}`;
      default:
        return kind;
    }
  },
  stepChecks: [
    ({ kinds }) => kinds.has("power"),
    ({ kinds }) => kinds.has("amplitude"),
    ({ kinds }) => kinds.has("volts-div"),
    ({ kinds }) => kinds.has("frequency"),
    ({ rows }) => rows >= 6,
  ],
};
