import { describe, expect, test } from "bun:test";

import { actualConditions, DEFAULT_ENVIRONMENT } from "@/core/environment";
import { fitLine } from "@/core/analysis/regression";
import { quantise } from "@/core/instruments";
import { emptyWriting, type GraphState, type Session } from "@/core/session";

import { analyse } from "../analyse";
import { stretchedWire } from "./definition";
import { createWorld, idealReadings, resonanceBand, resonantLength, riderExcitation, tension, waveSpeed } from "./model";

const SEED = 314159265;
const LOAD = 4.0;
const world = createWorld(SEED, DEFAULT_ENVIRONMENT);
const conditions = actualConditions(DEFAULT_ENVIRONMENT, SEED);

/** A careful student's table: both approaches read to the nearest mm, derived columns worked correctly. */
function goldenRows() {
  return idealReadings(world, LOAD, conditions).map(({ f, l }, i) => {
    const l1 = quantise(l * 100 - 0.1, 0.1);
    const l2 = quantise(l * 100 + 0.1, 0.1);
    const mean = (l1 + l2) / 2;
    return {
      id: `r${i}`,
      cells: { f: String(f), l1: l1.toFixed(1), l2: l2.toFixed(1), l: mean.toFixed(2), invL: (100 / mean).toFixed(3) },
    };
  });
}

function goldenGraph(rows: ReturnType<typeof goldenRows>): GraphState {
  const pts = rows.map((r) => ({ x: Number(r.cells.invL), y: Number(r.cells.f) }));
  const fit = fitLine(pts);
  const at = (x: number) => fit.slope * x + fit.intercept;
  return {
    title: "Graph of frequency f against 1/l",
    x: { column: "invL", label: "1/l / m⁻¹", start: 0, perSquare: 0.5 },
    y: { column: "f", label: "f / Hz", start: 0, perSquare: 100 },
    line: { x1: 0, y1: at(0), x2: 6, y2: at(6) },
    triangle: { x1: 1, y1: at(1), x2: 5, y2: at(5) },
  };
}

function session(overrides: Partial<Session> = {}): Session {
  const rows = goldenRows();
  const graph = goldenGraph(rows);
  const slope = (graph.triangle!.y2 - graph.triangle!.y1) / (graph.triangle!.x2 - graph.triangle!.x1);
  return {
    id: "test",
    experimentId: "stretched-wire",
    mode: "perform",
    seed: SEED,
    environment: DEFAULT_ENVIRONMENT,
    createdAt: 0,
    updatedAt: 0,
    stage: "graph",
    actions: [],
    constants: { load: String(LOAD.toFixed(1)) },
    constantUnits: { load: "kg" },
    units: {},
    rows,
    graph,
    answers: { slope: slope.toPrecision(3), intercept: graph.line!.y1.toFixed(1) },
    writing: emptyWriting(),
    ...overrides,
  };
}

const keys = (s: Session) => analyse(stretchedWire, s).findings.map((f) => f.key);
const errors = (s: Session) => analyse(stretchedWire, s).findings.filter((f) => f.severity === "error").map((f) => f.key);

describe("sonometer model", () => {
  test("fundamental length matches f = (1/2l)√(T/μ)", () => {
    const T = tension(world, LOAD, conditions);
    const l = resonantLength(world, T, 256);
    expect(256).toBeCloseTo(Math.sqrt(T / world.mu) / (2 * l), 9);
  });

  test("resonance is a narrow band around the fundamental", () => {
    const T = tension(world, LOAD, conditions);
    const l0 = resonantLength(world, T, 320);
    const [lo, hi] = resonanceBand(world, T, 320);
    expect(lo).toBeLessThan(l0);
    expect(hi).toBeGreaterThan(l0);
    expect((hi - lo) / l0).toBeLessThan(0.02);
    expect(hi - lo).toBeGreaterThan(0.001); // wider than a millimetre: a judgement, not a point
  });

  test("a centred rider ignores the second harmonic; an off-centre rider is thrown by it", () => {
    const T = tension(world, LOAD, conditions);
    const l2 = (2 * waveSpeed(world, T)) / (2 * 256);
    expect(riderExcitation(world, T, l2, 256, 0.5, 1)).toBeLessThan(0.05);
    expect(riderExcitation(world, T, l2, 256, 0.25, 1)).toBeGreaterThan(1);
  });

  test("a careful run recovers μ within 2%", () => {
    const result = analyse(stretchedWire, session()).results.find((r) => r.id === "mu")!;
    expect(Math.abs(result.value! - world.mu) / world.mu).toBeLessThan(0.02);
  });
});

describe("golden datasets", () => {
  test("a careful student gets no errors and is told what went well", () => {
    expect(errors(session())).toEqual([]);
    expect(keys(session())).toContain("graph.goodLine");
    expect(keys(session())).toContain("calc.slopeOk");
  });

  test("1/l worked out with l in cm", () => {
    const rows = goldenRows().map((r) => ({ ...r, cells: { ...r.cells, invL: (1 / Number(r.cells.l)).toFixed(4) } }));
    expect(errors(session({ rows }))).toContain("stretched.inverseInCm");
  });

  test("one reading recorded in metres in a centimetre column", () => {
    const rows = goldenRows();
    rows[2]!.cells.l1 = (Number(rows[2]!.cells.l1) / 100).toFixed(3);
    expect(errors(session({ rows }))).toContain("table.unitSlip");
  });

  test("second harmonic recorded for one fork", () => {
    const rows = goldenRows();
    const r = rows[4]!.cells;
    const doubled = (Number(r.l1) * 2).toFixed(1);
    rows[4]!.cells = { ...r, l1: doubled, l2: doubled, l: Number(doubled).toFixed(2), invL: (100 / Number(doubled)).toFixed(3) };
    expect(keys(session({ rows }))).toContain("stretched.secondHarmonic");
  });

  test("false precision from a metre rule", () => {
    const rows = goldenRows();
    rows[0]!.cells.l1 = `${rows[0]!.cells.l1}27`;
    expect(keys(session({ rows }))).toContain("table.falsePrecision");
  });

  test("too few readings", () => {
    const rows = goldenRows().slice(0, 2);
    expect(errors(session({ rows }))).toContain("table.tooFewRows");
  });

  test("a line drawn too steep", () => {
    const s = session();
    const line = s.graph!.line!;
    s.graph = { ...s.graph!, line: { ...line, y2: line.y2 * 1.15 } };
    expect(keys(s)).toContain("graph.lineTooSteep");
  });

  test("graph without a title or units on the axes", () => {
    const s = session();
    s.graph = { ...s.graph!, title: "", x: { ...s.graph!.x, label: "1/l" } };
    expect(errors(s)).toEqual(expect.arrayContaining(["graph.noTitle", "graph.axisNoUnit"]));
  });

  test("slope worked the wrong way up", () => {
    const s = session();
    s.answers = { ...s.answers, slope: (1 / Number(s.answers.slope)).toPrecision(3) };
    expect(errors(s)).toContain("calc.slopeInverted");
  });

  test("forks struck on the bench are caught from the action log", () => {
    const s = session({ actions: [{ t: 1000, kind: "strike-fork", detail: { f: 256, surface: "bench" } }] });
    expect(keys(s)).toContain("stretched.struckOnBench");
  });
});

describe("technique from the bench log", () => {
  test("recording the scale position instead of the length", () => {
    const s = session({ actions: [{ t: 5000, kind: "record", detail: { column: "l₁", typed: "54.3", lastThrownCm: 54.3, bridgeCm: 54.3, view: "eye" } }] });
    expect(errors(s)).toContain("stretched.scaleNotLength");
  });

  test("swapped digits against what the rule showed", () => {
    const s = session({ actions: [{ t: 5000, kind: "record", detail: { column: "l₁", typed: "34.4", lastThrownCm: 53.4, bridgeCm: 53.4, view: "bench" } }] });
    expect(keys(s)).toContain("stretched.transposed");
  });

  test("a correct reading raises nothing", () => {
    const s = session({ actions: [{ t: 5000, kind: "record", detail: { column: "l₁", typed: "43.4", lastThrownCm: 53.4, bridgeCm: 53.4, view: "eye" } }] });
    expect(keys(s).filter((k) => k.startsWith("stretched.scale") || k === "stretched.transposed")).toEqual([]);
  });
});
