import type { Rng } from "./random";
import { decimalsForResolution, formatSigFigs, parseFigure, toSigFigs } from "./sigfigs";

/** Practice questions for the significant-figures trainer, checked with the same parser as the lab. */

export type Question =
  | { kind: "count"; number: string; answer: number }
  | { kind: "round"; value: number; n: number; answer: string }
  | { kind: "record"; instrument: string; resolution: number; unit: string; truth: number; answer: string };

const pick = <T>(rng: Rng, xs: readonly T[]) => xs[Math.floor(rng() * xs.length)]!;

/** Numbers whose significant figures exercise each rule (no ambiguous "1200"-style whole numbers). */
function countNumber(rng: Rng): string {
  const forms = [
    () => `${Math.floor(rng() * 900 + 100)}`, // rule 1
    () => `${Math.floor(rng() * 9 + 1)}0${Math.floor(rng() * 9 + 1)}`, // rule 2: zero between
    () => `${(rng() * 9 + 1).toFixed(1)}0`, // rule 3: trailing zero after the point
    () => `0.00${Math.floor(rng() * 90 + 10)}`, // leading zeros
    () => `${Math.floor(rng() * 90 + 10)}.${Math.floor(rng() * 9)}0`,
    () => `0.${Math.floor(rng() * 9 + 1)}0${Math.floor(rng() * 9 + 1)}`,
    () => `${(rng() * 9 + 1).toFixed(2)} × 10⁵`,
  ];
  return pick(rng, forms)();
}

const INSTRUMENTS = [
  { instrument: "metre rule with 1 mm divisions", resolution: 0.1, unit: "cm" },
  { instrument: "thermometer with 1 °C divisions, read to half a division", resolution: 0.5, unit: "°C" },
  { instrument: "top-pan balance reading to 0.01 g", resolution: 0.01, unit: "g" },
  { instrument: "measuring cylinder with 1 ml graduations", resolution: 1, unit: "ml" },
  { instrument: "vernier calliper reading to 0.01 cm", resolution: 0.01, unit: "cm" },
];

export function makeQuestion(rng: Rng): Question {
  const kind = pick(rng, ["count", "round", "record"] as const);
  if (kind === "count") {
    const number = countNumber(rng);
    return { kind, number, answer: parseFigure(number.replace(" × 10⁵", "e5"))!.sigFigs };
  }
  if (kind === "round") {
    // Skip values whose rounded form is ambiguous ("30" for 2 s.f.): it cannot be marked fairly.
    for (;;) {
      const value = Number((rng() * 10 ** Math.floor(rng() * 6 - 3)).toPrecision(6)) || 0.004567;
      const n = pick(rng, [2, 3, 4]);
      const answer = formatSigFigs(value, n);
      const parsed = parseFigure(answer);
      if (parsed && !parsed.ambiguousTrailingZeros && parsed.sigFigs === n) return { kind, value, n, answer };
    }
  }
  const spec = pick(rng, INSTRUMENTS);
  // A reading sitting exactly on a mark: the trap is dropping the trailing zero(s).
  const whole = Math.floor(rng() * 80 + 10);
  const truth = spec.resolution >= 1 ? whole : whole + (spec.resolution === 0.5 ? 0.5 * Math.round(rng()) : 0);
  const d = decimalsForResolution(spec.resolution);
  return { kind, ...spec, truth, answer: truth.toFixed(d) };
}

export interface Marked {
  correct: boolean;
  /** Message key under reference.trainer.why */
  why: string;
}

export function mark(q: Question, typed: string): Marked {
  const t = typed.trim();
  if (q.kind === "count") {
    const ok = Number(t) === q.answer;
    return { correct: ok, why: "count" };
  }
  const f = parseFigure(t);
  if (!f) return { correct: false, why: "notNumber" };
  if (q.kind === "round") {
    const valueOk = Math.abs(f.value - toSigFigs(q.value, q.n)) <= Math.abs(toSigFigs(q.value, q.n)) * 1e-9;
    if (!valueOk) return { correct: false, why: "roundValue" };
    return f.sigFigs === q.n ? { correct: true, why: "round" } : { correct: false, why: "roundZeros" };
  }
  const d = decimalsForResolution(q.resolution);
  if (Math.abs(f.value - q.truth) > q.resolution / 2) return { correct: false, why: "recordValue" };
  return f.decimals === d ? { correct: true, why: "record" } : { correct: false, why: f.decimals < d ? "recordDropped" : "recordFalse" };
}
