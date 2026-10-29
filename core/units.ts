/**
 * Units the student can record in. Each column of an observation table has a quantity kind;
 * the student picks the unit (cm or m, g or kg…) and every calculation converts to SI.
 */

export type QuantityKind =
  | "length"
  | "frequency"
  | "mass"
  | "time"
  | "temperature"
  | "current"
  | "voltage"
  | "magnetic-field"
  | "force"
  | "volume"
  | "tension"
  | "angle"
  | "count"
  | "inverse-length"
  | "inverse-frequency"
  | "length-squared"
  | "inverse-frequency-squared";

export interface UnitDef {
  symbol: string;
  /** Multiply a value in this unit by `toSI` to get SI. Temperature uses `offset` too. */
  toSI: number;
  offset?: number;
}

export const UNITS: Record<QuantityKind, UnitDef[]> = {
  length: [
    { symbol: "m", toSI: 1 },
    { symbol: "cm", toSI: 1e-2 },
    { symbol: "mm", toSI: 1e-3 },
  ],
  frequency: [
    { symbol: "Hz", toSI: 1 },
    { symbol: "kHz", toSI: 1e3 },
  ],
  mass: [
    { symbol: "kg", toSI: 1 },
    { symbol: "g", toSI: 1e-3 },
  ],
  time: [
    { symbol: "s", toSI: 1 },
    { symbol: "ms", toSI: 1e-3 },
  ],
  temperature: [
    { symbol: "°C", toSI: 1, offset: 273.15 },
    { symbol: "K", toSI: 1 },
  ],
  current: [
    { symbol: "A", toSI: 1 },
    { symbol: "mA", toSI: 1e-3 },
  ],
  voltage: [
    { symbol: "V", toSI: 1 },
    { symbol: "mV", toSI: 1e-3 },
  ],
  "magnetic-field": [
    { symbol: "T", toSI: 1 },
    { symbol: "mT", toSI: 1e-3 },
    { symbol: "µT", toSI: 1e-6 },
    { symbol: "G", toSI: 1e-4 },
  ],
  force: [
    { symbol: "N", toSI: 1 },
    { symbol: "mN", toSI: 1e-3 },
  ],
  tension: [{ symbol: "N", toSI: 1 }],
  volume: [
    { symbol: "m³", toSI: 1 },
    { symbol: "cm³", toSI: 1e-6 },
    { symbol: "ml", toSI: 1e-6 },
    { symbol: "l", toSI: 1e-3 },
  ],
  angle: [
    { symbol: "°", toSI: Math.PI / 180 },
    { symbol: "rad", toSI: 1 },
  ],
  count: [{ symbol: "", toSI: 1 }],
  "inverse-length": [
    { symbol: "m⁻¹", toSI: 1 },
    { symbol: "cm⁻¹", toSI: 1e2 },
  ],
  "inverse-frequency": [
    { symbol: "s", toSI: 1 },
    { symbol: "ms", toSI: 1e-3 },
  ],
  "length-squared": [
    { symbol: "m²", toSI: 1 },
    { symbol: "cm²", toSI: 1e-4 },
  ],
  "inverse-frequency-squared": [{ symbol: "s²", toSI: 1 }],
};

export function findUnit(kind: QuantityKind, symbol: string): UnitDef | undefined {
  return UNITS[kind].find((u) => u.symbol === symbol);
}

export function toSI(value: number, kind: QuantityKind, symbol: string): number {
  const unit = findUnit(kind, symbol);
  if (!unit) throw new Error(`Unknown unit "${symbol}" for ${kind}`);
  return value * unit.toSI + (unit.offset ?? 0);
}

export function fromSI(value: number, kind: QuantityKind, symbol: string): number {
  const unit = findUnit(kind, symbol);
  if (!unit) throw new Error(`Unknown unit "${symbol}" for ${kind}`);
  return (value - (unit.offset ?? 0)) / unit.toSI;
}

/**
 * When a value looks like it was recorded in a different unit from the column's
 * (45.3 among 0.62 and 0.58, or 0.354 among 35.4 and 44.7), return the factor it is out by.
 * Works on the order of magnitude, so the natural spread of a column (a 2:1 range of
 * lengths) never looks like a slip.
 */
export function suspectedUnitSlip(value: number, typical: number): 10 | 100 | 1000 | undefined {
  if (value === 0 || typical === 0) return undefined;
  const orders = Math.log10(Math.abs(value / typical));
  const nearest = Math.round(Math.abs(orders));
  if (nearest < 1 || nearest > 3 || Math.abs(Math.abs(orders) - nearest) > 0.4) return undefined;
  return (10 ** nearest) as 10 | 100 | 1000;
}
