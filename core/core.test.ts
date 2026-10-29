import { describe, expect, test } from "bun:test";

import { fitLine, fitThroughOrigin, residuals } from "./analysis/regression";
import { stageStatuses } from "./gating";
import { classifySlip, parallaxShift, quantise } from "./instruments";
import { createRng, substream, withTolerance } from "./random";
import { isConvenientScale } from "./rules/graph";
import { decimalsForResolution, formatSigFigs, parseFigure, toSigFigs } from "./sigfigs";
import { fromSI, suspectedUnitSlip, toSI } from "./units";

describe("significant figures (manual rules 1–3)", () => {
  test.each([
    ["123", 3], // rule 1: non-zero digits
    ["1002", 4], // rule 2: zeros between significant digits
    ["2.50", 3], // rule 3: trailing zeros after the decimal point
    ["0.0045", 2], // leading zeros only place the point
    ["45.30", 4],
    ["0.500", 3],
    ["3.0e8", 2],
  ])("%s has %i significant figures", (raw, n) => {
    expect(parseFigure(raw)?.sigFigs).toBe(n);
  });

  test("whole numbers with trailing zeros are flagged as ambiguous", () => {
    const f = parseFigure("1200");
    expect(f?.ambiguousTrailingZeros).toBe(true);
    expect(f?.sigFigs).toBe(2);
  });

  test("decimals as written are kept", () => {
    expect(parseFigure("54.30")?.decimals).toBe(2);
    expect(parseFigure("54")?.decimals).toBe(0);
  });

  test("rejects text", () => {
    expect(parseFigure("about 5")).toBeUndefined();
    expect(parseFigure("")).toBeUndefined();
  });

  test("rounding and formatting keep trailing zeros", () => {
    expect(toSigFigs(0.0045678, 3)).toBeCloseTo(0.00457, 10);
    expect(formatSigFigs(0.5, 3)).toBe("0.500");
    expect(formatSigFigs(228.64, 3)).toBe("229");
    expect(decimalsForResolution(0.1)).toBe(1);
    expect(decimalsForResolution(0.001)).toBe(3);
    expect(decimalsForResolution(1)).toBe(0);
  });
});

describe("least squares", () => {
  test("recovers an exact line", () => {
    const pts = [1, 2, 3, 4, 5].map((x) => ({ x, y: 3 * x + 2 }));
    const fit = fitLine(pts);
    expect(fit.slope).toBeCloseTo(3, 12);
    expect(fit.intercept).toBeCloseTo(2, 12);
    expect(fit.r2).toBeCloseTo(1, 12);
    expect(fit.slopeError).toBeCloseTo(0, 12);
  });

  test("standard errors match the textbook formula", () => {
    // y = 2x + noise with known residuals
    const pts = [
      { x: 1, y: 2.1 },
      { x: 2, y: 3.9 },
      { x: 3, y: 6.2 },
      { x: 4, y: 7.8 },
      { x: 5, y: 10.1 },
    ];
    const fit = fitLine(pts);
    expect(fit.slope).toBeCloseTo(1.99, 2);
    expect(fit.slopeError).toBeGreaterThan(0);
    expect(fit.slopeError).toBeLessThan(0.1);
    expect(residuals(pts, fit).length).toBe(5);
  });

  test("through-origin fit", () => {
    expect(fitThroughOrigin([{ x: 1, y: 2 }, { x: 2, y: 4 }]).slope).toBeCloseTo(2, 12);
  });
});

describe("units", () => {
  test("converts to and from SI", () => {
    expect(toSI(54.3, "length", "cm")).toBeCloseTo(0.543, 12);
    expect(fromSI(0.543, "length", "mm")).toBeCloseTo(543, 9);
    expect(toSI(27, "temperature", "°C")).toBeCloseTo(300.15, 9);
  });

  test("spots a value recorded in the wrong unit", () => {
    expect(suspectedUnitSlip(45.3, 0.5)).toBe(100);
    expect(suspectedUnitSlip(0.48, 0.5)).toBeUndefined();
  });
});

describe("instruments", () => {
  test("parallax grows with viewing angle", () => {
    expect(parallaxShift(0.4, 0)).toBe(0);
    expect(parallaxShift(0.4, 45)).toBeCloseTo(0.4, 9);
  });

  test("quantise to the nearest division without binary noise", () => {
    expect(quantise(54.3499, 0.1)).toBe(54.3);
    expect(String(quantise(0.1 + 0.2, 0.1))).toBe("0.3");
  });

  test("names transcription slips", () => {
    expect(classifySlip(45.3, 54.3, 0.1).kind).toBe("transposed-digits");
    expect(classifySlip(54.4, 54.3, 0.1).kind).toBe("one-division");
    expect(classifySlip(54.3, 54.3, 0.1).kind).toBe("none");
    expect(classifySlip(60.0, 54.3, 0.1).kind).toBe("misread");
  });
});

describe("seeded world", () => {
  test("same seed, same apparatus", () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  test("substreams are independent and reproducible", () => {
    expect(substream(7, "forks")()).toBe(substream(7, "forks")());
    expect(substream(7, "forks")()).not.toBe(substream(7, "wire")());
  });

  test("tolerances stay within bounds", () => {
    const rng = createRng(1);
    for (let i = 0; i < 1000; i++) {
      const v = withTolerance(rng, 100, 0.01);
      expect(v).toBeGreaterThanOrEqual(99);
      expect(v).toBeLessThanOrEqual(101);
    }
  });
});

describe("graph scale convenience", () => {
  test.each([
    [0.5, "good"],
    [20, "good"],
    [0.025, "awkward"],
    [3, "bad"],
    [0.7, "bad"],
  ] as const)("%d per square is %s", (perSquare, verdict) => {
    expect(isConvenientScale(perSquare)).toBe(verdict);
  });
});

describe("gating", () => {
  const base = { mode: "perform" as const, answers: {} as Record<string, string> };
  const compare = (s: Parameters<typeof stageStatuses>[0]) => stageStatuses(s).find((x) => x.stage === "compare")!;

  test("compare stays locked until feedback has been read", () => {
    const line = { x1: 0, y1: 0, x2: 1, y2: 1 };
    const graph = { title: "", x: { column: "x", label: "", start: 0, perSquare: 1 }, y: { column: "y", label: "", start: 0, perSquare: 1 }, line };
    expect(compare({ session: base, completeRows: 2 }).reason).toBe("needRows");
    expect(compare({ session: base, completeRows: 6 }).reason).toBe("needLine");
    expect(compare({ session: { ...base, graph }, completeRows: 6 }).reason).toBe("needSlope");
    expect(compare({ session: { ...base, graph, answers: { slope: "114" } }, completeRows: 6 }).reason).toBe("needFeedback");
    expect(compare({ session: { ...base, graph, answers: { slope: "114" }, feedbackViewedAt: 1 }, completeRows: 6 }).state).toBe("open");
  });

  test("bring-your-data skips the bench", () => {
    const measure = stageStatuses({ session: { ...base, mode: "bring" }, completeRows: 0 }).find((x) => x.stage === "measure")!;
    expect(measure.state).toBe("skipped");
  });
});
