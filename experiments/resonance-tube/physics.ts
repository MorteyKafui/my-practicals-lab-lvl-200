import { speedOfSound, type Conditions, type Environment } from "@/core/environment";
import { substream, uniform, withTolerance } from "@/core/random";

/**
 * A tube closed at the bottom by water. A fork held over the mouth drives the air column, which
 * resonates when its effective length (L + e) is an odd number of quarter wavelengths:
 *   L + e = (2n − 1)·λ/4,  λ = v/f,  e ≈ 0.6 r (unflanged end correction)
 * L is read from the rule as the distance from the mouth down to the water surface.
 * The air column's resonance is broad (Q ≈ 25–35): the loudest point is a judgement.
 */

export const TUBE_LENGTH_CM = 100;
export const FORKS = [256, 288, 320, 341.3, 384, 426.7, 480, 512] as const;

export interface TubeWorld {
  /** Internal radius, m. */
  radius: number;
  /** End correction actually present (≈ 0.6 r, with a little variation). */
  endCorrection: number;
  q: number;
  forks: { nominal: number; actual: number }[];
  /** Fork decay time constant, s. */
  tau: number;
  /** Thermometer zero error, °C. */
  thermometerError: number;
}

export function createTubeWorld(seed: number, env: Environment, name: string): TubeWorld {
  void env;
  const rng = substream(seed, name);
  const radius = uniform(rng, 0.0175, 0.0225);
  return {
    radius,
    endCorrection: radius * uniform(rng, 0.58, 0.64),
    q: uniform(rng, 25, 35),
    forks: FORKS.map((nominal) => ({ nominal, actual: withTolerance(rng, nominal, 0.004) })),
    tau: uniform(rng, 3.5, 5),
    thermometerError: uniform(rng, -0.3, 0.3),
  };
}

export function soundSpeed(conditions: Pick<Conditions, "temperatureC">) {
  return speedOfSound(conditions.temperatureC);
}

/** Length L (m, mouth to water) of the n-th resonance for frequency f. */
export function resonanceLength(world: TubeWorld, conditions: Pick<Conditions, "temperatureC">, f: number, n: number) {
  return ((2 * n - 1) * soundSpeed(conditions)) / (4 * f) - world.endCorrection;
}

/** Loudness of the air column (0–1 scale, 1 at a fresh strike exactly at resonance). */
export function loudness(world: TubeWorld, conditions: Pick<Conditions, "temperatureC">, lengthM: number, f: number, forkAmp: number) {
  const v = soundSpeed(conditions);
  let best = 0;
  for (let n = 1; n <= 4; n++) {
    const fn = ((2 * n - 1) * v) / (4 * (lengthM + world.endCorrection));
    const r = fn / f;
    best = Math.max(best, 1 / Math.sqrt((1 - r * r) ** 2 + (r / world.q) ** 2));
  }
  return (forkAmp * best) / world.q;
}

export function forkAmplitude(world: TubeWorld, seconds: number) {
  return seconds < 0 ? 0 : Math.exp(-seconds / world.tau);
}

/** What a careful student records: resonances that fit in the tube, in m. */
export function idealResonances(world: TubeWorld, conditions: Pick<Conditions, "temperatureC">) {
  return world.forks.map((fork) => ({
    f: fork.nominal,
    l1: resonanceLength(world, conditions, fork.actual, 1),
    l2: resonanceLength(world, conditions, fork.actual, 2),
  }));
}

export const fitsInTube = (lengthM: number) => lengthM * 100 <= TUBE_LENGTH_CM - 4;
