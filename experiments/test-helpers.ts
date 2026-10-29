import { fitLine } from "@/core/analysis/regression";
import { DEFAULT_ENVIRONMENT } from "@/core/environment";
import { emptyWriting, type Axis, type Session, type TableRow } from "@/core/session";

import { analyse, PAPER } from "./analyse";
import type { ExperimentDefinition } from "./types";

/** A 1-2-5 scale per large square that fits `max` on `squares` squares. */
export function niceScale(max: number, squares: number): number {
  const raw = max / squares;
  const p = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 5, 10]) if (m * p >= raw) return m * p;
  return 10 * p;
}

/**
 * Build the session a careful student would hand in from their typed rows: graph with title,
 * labelled axes, a 1-2-5 scale from the origin, a well-drawn line, a large triangle and the slope.
 */
export function goldenSession(
  def: ExperimentDefinition,
  rows: Record<string, string>[],
  opts: { seed: number; constants?: Record<string, string>; constantUnits?: Record<string, string>; units?: Record<string, string>; mode?: Session["mode"] } ,
): Session {
  const tableRows: TableRow[] = rows.map((cells, i) => ({ id: `r${i}`, cells }));
  const xs = rows.map((r) => Number(r[def.graph.x]));
  const ys = rows.map((r) => Number(r[def.graph.y]));
  const fit = fitLine(xs.map((x, i) => ({ x, y: ys[i]! })));
  const at = (x: number) => fit.slope * x + fit.intercept;
  const unit = (id: string) => opts.units?.[id] ?? def.columns.find((c) => c.id === id)!.units[0]!;
  const axis = (id: string, values: number[], squares: number): Axis => {
    const min = Math.min(0, ...values);
    const perSquare = niceScale(Math.max(...values) - min, squares);
    return { column: id, label: `${def.columns.find((c) => c.id === id)!.symbol} / ${unit(id)}`, start: Math.floor(min / perSquare) * perSquare, perSquare };
  };
  const x = axis(def.graph.x, xs, PAPER.squaresX);
  const y = axis(def.graph.y, [...ys, at(0)], PAPER.squaresY);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const t1 = xMin + (xMax - xMin) * 0.05;
  const t2 = xMax - (xMax - xMin) * 0.05;
  const session: Session = {
    id: "golden",
    experimentId: def.entry.id,
    mode: opts.mode ?? "perform",
    seed: opts.seed,
    environment: DEFAULT_ENVIRONMENT,
    createdAt: 0,
    updatedAt: 0,
    stage: "graph",
    actions: [],
    constants: opts.constants ?? {},
    constantUnits: opts.constantUnits ?? {},
    units: opts.units ?? {},
    rows: tableRows,
    graph: {
      title: `Graph of ${def.columns.find((c) => c.id === def.graph.y)!.symbol} against ${def.columns.find((c) => c.id === def.graph.x)!.symbol}`,
      x,
      y,
      line: { x1: x.start, y1: at(x.start), x2: x.start + x.perSquare * PAPER.squaresX, y2: at(x.start + x.perSquare * PAPER.squaresX) },
      triangle: { x1: t1, y1: at(t1), x2: t2, y2: at(t2) },
    },
    answers: { slope: ((at(t2) - at(t1)) / (t2 - t1)).toPrecision(3), intercept: fit.intercept.toPrecision(3) },
    writing: emptyWriting(),
  };
  return session;
}

export const findingKeys = (def: ExperimentDefinition, s: Session) => analyse(def, s).findings.map((f) => f.key);
export const errorKeys = (def: ExperimentDefinition, s: Session) =>
  analyse(def, s).findings.filter((f) => f.severity === "error").map((f) => f.key);
export const result = (def: ExperimentDefinition, s: Session, id: string) => analyse(def, s).results.find((r) => r.id === id)!;
