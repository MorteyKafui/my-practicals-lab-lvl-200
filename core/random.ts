/**
 * Seeded randomness for the hidden world. The same seed always builds the same apparatus,
 * so a lecturer can reproduce any student's session from the seed printed in the report.
 */

export type Rng = () => number;

/** mulberry32: small, fast, good enough for physical tolerances. Returns floats in [0, 1). */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal via Box–Muller. */
export function gaussian(rng: Rng, mean = 0, sd = 1): number {
  const u = Math.max(rng(), Number.EPSILON);
  const v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** A value within ±tolerance (fractional) of nominal, normally distributed with 3σ = tolerance. */
export function withTolerance(rng: Rng, nominal: number, tolerance: number): number {
  const clipped = Math.max(-3, Math.min(3, gaussian(rng)));
  return nominal * (1 + (clipped * tolerance) / 3);
}

export function uniform(rng: Rng, min: number, max: number): number {
  return min + (max - min) * rng();
}

/** A fresh seed for a new session: 9 digits, easy to read aloud and type. */
export function newSeed(): number {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return 100_000_000 + (buf[0]! % 900_000_000);
}

/** Derive an independent stream for a named part of the world from the session seed. */
export function substream(seed: number, name: string): Rng {
  let h = 2166136261 ^ seed;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  return createRng(h >>> 0);
}
