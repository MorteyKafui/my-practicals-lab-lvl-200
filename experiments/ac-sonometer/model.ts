import type { Conditions, Environment } from "@/core/environment";
import { substream, uniform, withTolerance } from "@/core/random";

/**
 * AC through a sonometer wire lying between the poles of a horseshoe magnet feels a force
 * F = BIL that alternates at the supply frequency f. The wire resonates in its fundamental when
 *   f = (1/2l)·√(T/μ)   ⇒   l² = T / (4 f² μ)
 * so l² against T is a line through the origin with slope 1/(4f²μ). The magnet drives mode n in
 * proportion to |sin(nπ·sₘ)| at its position sₘ along the wire; the rider feels |sin(nπ·sᵣ)|.
 */

export const FIXED_BRIDGE_CM = 10;
export const LOADS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5];

export interface AcSonometerWorld {
  /** True mass per unit length, kg m⁻¹ (a brass wire, non-magnetic). */
  mu: number;
  /** What the label on the wire's reel says, kg m⁻¹ (to 2 s.f., within ±2 %). */
  muLabel: number;
  q: number;
  pulleyLoss: number;
}

export function createWorld(seed: number, env: Environment): AcSonometerWorld {
  void env;
  const rng = substream(seed, "ac-sonometer");
  const mu = uniform(rng, 2.6e-3, 3.4e-3);
  const muLabel = Number(withTolerance(rng, mu, 0.02).toPrecision(2));
  return { mu, muLabel, q: uniform(rng, 150, 220), pulleyLoss: uniform(rng, 0.002, 0.008) };
}

export function tension(world: AcSonometerWorld, loadKg: number, conditions: Pick<Conditions, "g">) {
  return loadKg * conditions.g * (1 - world.pulleyLoss);
}

export function resonantLength(world: AcSonometerWorld, tensionN: number, f: number, n = 1) {
  return (n / (2 * f)) * Math.sqrt(tensionN / world.mu);
}

/** Normalised rider excitation (1 throws it) for length l, magnet at fraction sm, rider at sr. */
export function excitation(world: AcSonometerWorld, tensionN: number, l: number, f: number, sm: number, sr: number): number {
  const c = Math.sqrt(tensionN / world.mu);
  let best = 0;
  for (let n = 1; n <= 4; n++) {
    const r = (n * c) / (2 * l) / f;
    const response = 1 / Math.sqrt((1 - r * r) ** 2 + (r / world.q) ** 2);
    best = Math.max(best, response * Math.abs(Math.sin(n * Math.PI * sm)) * Math.abs(Math.sin(n * Math.PI * sr)));
  }
  return best / (0.5 * world.q);
}

/** What a careful student records, for each load that fits on the sonometer. */
export function idealReadings(world: AcSonometerWorld, conditions: Pick<Conditions, "g" | "mainsHz">) {
  return LOADS.map((kg) => ({ kg, l: resonantLength(world, tension(world, kg, conditions), conditions.mainsHz) })).filter(
    ({ l }) => l * 100 + FIXED_BRIDGE_CM <= 96,
  );
}
