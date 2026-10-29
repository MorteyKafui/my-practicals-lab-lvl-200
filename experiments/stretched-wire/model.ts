import type { Conditions, Environment } from "@/core/environment";
import { substream, uniform, withTolerance } from "@/core/random";

/**
 * Sonometer physics.
 *   Wave speed on the wire  c = √(T/μ)
 *   Harmonic n of length l   fₙ = n·c / 2l
 * A struck fork (frequency f, amplitude decaying with time constant τ) drives the wire through
 * the sonometer box. Mode n responds like a damped driven oscillator with quality factor Q,
 * and the paper rider at fraction s of the length feels that mode in proportion to |sin(nπs)|.
 * The rider is thrown when the response exceeds a threshold, so resonance is a narrow band
 * of bridge positions, not a point — careful students approach it from both sides.
 */

export const NOMINAL_FORKS = [256, 288, 320, 341.3, 384, 426.7, 480, 512] as const;
/** The sonometer's scale runs 0–100 cm; the fixed bridge sits at 10.0 cm. */
export const FIXED_BRIDGE_CM = 10.0;
export const SCALE_END_CM = 100.0;
export const HANGER_MASS_KG = 0.5;

export interface Fork {
  /** Stamped on the fork. */
  nominal: number;
  /** What it really vibrates at (manufacturing tolerance, temperature). */
  actual: number;
}

export interface StretchedWireWorld {
  /** Mass per unit length of this wire, kg m⁻¹. */
  mu: number;
  forks: Fork[];
  /** Quality factor of the wire's resonance. */
  q: number;
  /** Fork amplitude time constant after a strike on the rubber pad, s. */
  tau: number;
  /** Pulley friction as a fraction of the load (tension is slightly less than Mg). */
  pulleyLoss: number;
  /** Height of the bridge edge above the scale, cm (parallax when read at an angle). */
  bridgeHeightCm: number;
}

export function createWorld(seed: number, env: Environment): StretchedWireWorld {
  void env; // the wire does not depend on the room; other practicals use it
  const rng = substream(seed, "stretched-wire");
  return {
    // A 30–32 SWG steel wire: about 0.55–0.85 g per metre.
    mu: uniform(rng, 5.5e-4, 8.5e-4),
    forks: NOMINAL_FORKS.map((nominal) => ({ nominal, actual: withTolerance(rng, nominal, 0.004) })),
    q: uniform(rng, 140, 200),
    tau: uniform(rng, 3.5, 5),
    pulleyLoss: uniform(rng, 0.002, 0.008),
    bridgeHeightCm: 0.4,
  };
}

export function tension(world: StretchedWireWorld, loadKg: number, conditions: Pick<Conditions, "g">): number {
  return loadKg * conditions.g * (1 - world.pulleyLoss);
}

export function waveSpeed(world: StretchedWireWorld, tensionN: number): number {
  return Math.sqrt(tensionN / world.mu);
}

/** Length (m) at which harmonic n resonates with frequency f. */
export function resonantLength(world: StretchedWireWorld, tensionN: number, f: number, n = 1): number {
  return (n * waveSpeed(world, tensionN)) / (2 * f);
}

/**
 * Normalised rider excitation (0 at rest, 1 at the threshold that throws it) for vibrating
 * length l (m), drive frequency f, rider at fraction s along the wire, fork amplitude a ∈ [0,1].
 */
export function riderExcitation(world: StretchedWireWorld, tensionN: number, l: number, f: number, s: number, a: number): number {
  const c = waveSpeed(world, tensionN);
  let best = 0;
  for (let n = 1; n <= 4; n++) {
    const fn = (n * c) / (2 * l);
    const r = fn / f;
    const response = 1 / Math.sqrt((1 - r * r) ** 2 + (r / world.q) ** 2);
    const coupling = Math.abs(Math.sin(n * Math.PI * s));
    best = Math.max(best, response * coupling);
  }
  // Thrown at half the peak response of a centred rider with a fresh strike.
  return (a * best) / (0.5 * world.q);
}

/** Fork amplitude t seconds after a strike. Striking on the bench gives a harsher, faster-decaying tone. */
export function forkAmplitude(world: StretchedWireWorld, t: number, struckOnPad: boolean): number {
  if (t < 0) return 0;
  return (struckOnPad ? 1 : 0.85) * Math.exp(-t / (struckOnPad ? world.tau : world.tau * 0.6));
}

/** The band of lengths (m) over which a centred rider is thrown by a fresh strike. */
export function resonanceBand(world: StretchedWireWorld, tensionN: number, f: number): [number, number] {
  const l0 = resonantLength(world, tensionN, f);
  let lo = l0;
  let hi = l0;
  const step = l0 * 1e-4;
  while (riderExcitation(world, tensionN, lo - step, f, 0.5, 1) >= 1) lo -= step;
  while (riderExcitation(world, tensionN, hi + step, f, 0.5, 1) >= 1) hi += step;
  return [lo, hi];
}

/** What a careful student would record: centre of the band, read to the nearest mm. */
export function idealReadings(world: StretchedWireWorld, loadKg: number, conditions: Pick<Conditions, "g">) {
  const T = tension(world, loadKg, conditions);
  return world.forks
    .map((fork) => ({ f: fork.nominal, l: resonantLength(world, T, fork.actual) }))
    .filter(({ l }) => l * 100 + FIXED_BRIDGE_CM <= SCALE_END_CM - 2);
}
