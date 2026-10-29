import { gaussian, type Rng } from "./random";

/**
 * How an instrument turns a true value into what the student sees, and how what the
 * student typed compares with what was shown. The app keeps both, so feedback can say
 * "the rule read 54.3 cm and you wrote 45.3" — but only after the student has submitted.
 */

export interface InstrumentSpec {
  id: string;
  /** Smallest division (or last digit on a display), in the instrument's display unit. */
  resolution: number;
  unit: string;
  /** Systematic offset present until the student zeroes the instrument. */
  zeroError?: number;
  /** Random noise on each reading, 1σ, in display units (meters that flicker, a hand that wobbles). */
  noise?: number;
  /** Height of the pointer/edge above the scale, in display units: drives parallax. */
  pointerHeight?: number;
}

export interface Reading {
  /** The physical value at the moment of reading, in display units. */
  truth: number;
  /** What the instrument shows (analogue: where the eye lines up; digital: the digits). */
  shown: number;
}

/**
 * Parallax: an eye `angleDeg` off the normal to the scale sees the pointer shifted by
 * height · tan(angle). Students who read square-on (eye-level view) get no shift.
 */
export function parallaxShift(pointerHeight: number, angleDeg: number): number {
  return pointerHeight * Math.tan((angleDeg * Math.PI) / 180);
}

export function takeReading(
  spec: InstrumentSpec,
  truth: number,
  opts: { rng: Rng; zeroed?: boolean; viewAngleDeg?: number },
): Reading {
  let shown = truth;
  if (spec.zeroError && !opts.zeroed) shown += spec.zeroError;
  if (spec.noise) shown += gaussian(opts.rng, 0, spec.noise);
  if (spec.pointerHeight && opts.viewAngleDeg) shown += parallaxShift(spec.pointerHeight, opts.viewAngleDeg);
  return { truth, shown };
}

/** Round to what a careful reader records: the nearest division (analogue) or the display digit. */
export function quantise(value: number, resolution: number): number {
  const q = Math.round(value / resolution) * resolution;
  // Clean binary noise so 0.1 steps print as 54.3, not 54.300000000000004.
  return Number(q.toFixed(Math.max(0, Math.ceil(-Math.log10(resolution)) + 1)));
}

export type TranscriptionSlip =
  | { kind: "none" }
  | { kind: "transposed-digits" }
  | { kind: "one-division"; divisions: number }
  | { kind: "misread"; difference: number };

/** Compare the typed value with the shown value and name the most likely slip. */
export function classifySlip(typed: number, shown: number, resolution: number): TranscriptionSlip {
  const diff = typed - shown;
  if (Math.abs(diff) <= resolution * 0.51) return { kind: "none" };

  const digits = (n: number) => n.toFixed(6).replace(/[^0-9]/g, "").replace(/^0+/, "");
  const a = digits(typed);
  const b = digits(shown);
  if (a.length === b.length && a !== b) {
    const differing = [...a].map((ch, i) => (ch === b[i] ? -1 : i)).filter((i) => i >= 0);
    if (differing.length === 2 && differing[1] === differing[0]! + 1 && a[differing[0]!] === b[differing[1]!] && a[differing[1]!] === b[differing[0]!]) {
      return { kind: "transposed-digits" };
    }
  }

  const divisions = Math.round(diff / resolution);
  if (Math.abs(divisions) <= 2) return { kind: "one-division", divisions };
  return { kind: "misread", difference: diff };
}

/** A standard metre rule: 1 mm divisions, read in cm. */
export const METRE_RULE: InstrumentSpec = { id: "metre-rule", resolution: 0.1, unit: "cm", pointerHeight: 0.4 };
