/**
 * Significant figures, following the rules taught with the practical manual:
 *   1. Non-zero digits are always significant.
 *   2. Zeros between two significant digits are significant.
 *   3. A final zero or trailing zeros in the decimal portion are significant.
 *   (and) Leading zeros only locate the decimal point and are not significant.
 * Trailing zeros in a whole number without a decimal point ("1200") are ambiguous;
 * we count them as not significant and say so in feedback.
 */

export interface ParsedFigure {
  value: number;
  /** Significant figures as written. */
  sigFigs: number;
  /** Digits after the decimal point as written (0 for whole numbers). */
  decimals: number;
  /** "1200" style: trailing zeros with no decimal point. */
  ambiguousTrailingZeros: boolean;
}

const NUMBER = /^\s*([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?\s*$/;

/** Parse a number exactly as the student typed it, keeping what the notation says about precision. */
export function parseFigure(raw: string): ParsedFigure | undefined {
  const m = NUMBER.exec(raw.replace(/,/g, ""));
  if (!m) return undefined;
  const [, , intPart = "", fracPart, exp] = m;
  if (intPart === "" && (fracPart === undefined || fracPart === "")) return undefined;

  const value = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(value)) return undefined;

  const decimals = fracPart?.length ?? 0;
  const digits = (intPart + (fracPart ?? "")).replace(/^0+/, "");
  let sigFigs: number;
  let ambiguous = false;

  if (digits === "") {
    // A written zero: "0", "0.0", "0.00" — count the decimal zeros as its precision.
    sigFigs = Math.max(1, decimals);
  } else if (fracPart === undefined && exp === undefined && /0+$/.test(intPart) && intPart.replace(/^0+/, "").length > 1) {
    ambiguous = true;
    sigFigs = intPart.replace(/^0+/, "").replace(/0+$/, "").length;
  } else {
    sigFigs = digits.length;
  }

  return { value, sigFigs, decimals, ambiguousTrailingZeros: ambiguous };
}

/** Round to n significant figures. */
export function toSigFigs(value: number, n: number): number {
  if (value === 0 || !Number.isFinite(value)) return value;
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  const factor = 10 ** (n - 1 - magnitude);
  return Math.round(value * factor) / factor;
}

/** Format to n significant figures, keeping trailing zeros ("0.500", not "0.5"). */
export function formatSigFigs(value: number, n: number): string {
  if (value === 0) return n > 1 ? `0.${"0".repeat(n - 1)}` : "0";
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  if (magnitude >= 6 || magnitude <= -4) return value.toExponential(n - 1);
  const decimals = Math.max(0, n - 1 - magnitude);
  return toSigFigs(value, n).toFixed(decimals);
}

/** Decimal places that match an instrument's resolution (0.1 cm → 1, 0.001 m → 3, 1 Hz → 0). */
export function decimalsForResolution(resolution: number): number {
  if (resolution >= 1) return 0;
  // Decimal places of the resolution itself: 0.1 → 1, 0.5 → 1 (half a degree), 0.25 → 2, 0.005 → 3.
  const [, fraction = ""] = Number(resolution.toPrecision(6)).toString().split(".");
  return fraction.length;
}
