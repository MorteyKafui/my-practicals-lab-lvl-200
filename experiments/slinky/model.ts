import { MU_0, type Conditions, type Environment } from "@/core/environment";
import { substream, uniform, withTolerance } from "@/core/random";

/**
 * A slinky of N turns stretched to length L carrying current I. At its centre
 *   B = μ₀ N I / √(L² + D²)
 * which tends to the long-solenoid value μ₀ N I / L when L ≫ D. A Hall probe on the axis reads
 * B plus Earth's field along the axis plus its own offset — until it is zeroed with the
 * current off. B against N/L gives a line of slope μ₀ I.
 */

export interface SlinkyWorld {
  turns: number;
  diameter: number;
  /** Ammeter calibration error (fraction). */
  ammeterError: number;
  /** Hall probe offset, T. */
  probeOffset: number;
  /** Component of Earth's field along the slinky's axis, as a fraction of the horizontal field. */
  earthAlongAxis: number;
}

export function createWorld(seed: number, env: Environment): SlinkyWorld {
  void env;
  const rng = substream(seed, "slinky");
  return {
    turns: Math.round(uniform(rng, 70, 90)),
    diameter: uniform(rng, 0.07, 0.08),
    ammeterError: withTolerance(rng, 1, 0.01) - 1,
    probeOffset: uniform(rng, 8e-6, 20e-6) * (rng() < 0.5 ? -1 : 1),
    earthAlongAxis: uniform(rng, -0.8, 0.8),
  };
}

export function fieldAtCentre(w: SlinkyWorld, lengthM: number, currentA: number) {
  return (MU_0 * w.turns * currentA) / Math.sqrt(lengthM ** 2 + w.diameter ** 2);
}

/** What the teslameter shows (T): field + Earth's axial component + offset, minus whatever was zeroed out. */
export function probeReading(w: SlinkyWorld, conditions: Pick<Conditions, "earthFieldT">, lengthM: number, currentA: number, zeroT: number) {
  return fieldAtCentre(w, lengthM, currentA) + conditions.earthFieldT * w.earthAlongAxis + w.probeOffset - zeroT;
}

/** The background the probe sees with the current off (what zeroing removes). */
export function background(w: SlinkyWorld, conditions: Pick<Conditions, "earthFieldT">) {
  return conditions.earthFieldT * w.earthAlongAxis + w.probeOffset;
}

export const LENGTHS_CM = [40, 50, 60, 70, 80, 100, 120, 140];

export function idealReadings(w: SlinkyWorld, currentA: number) {
  return LENGTHS_CM.map((cm) => ({ L: cm / 100, B: fieldAtCentre(w, cm / 100, currentA) }));
}
