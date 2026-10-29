import { fitLine, type LineFit, type Point } from "@/core/analysis/regression";
import { actualConditions, type Conditions } from "@/core/environment";
import { runRules, type FeedbackContext, type Finding, type ParsedRow, type TableColumn } from "@/core/feedback";
import { CALCULATE_RULES } from "@/core/rules/calculate";
import { GRAPH_RULES } from "@/core/rules/graph";
import { TABLE_RULES } from "@/core/rules/table";
import { WRITING_RULES } from "@/core/rules/writing";
import { parseCell, unitOf, type Session } from "@/core/session";
import { findUnit } from "@/core/units";

import type { ExperimentDefinition } from "./types";

/** Graph paper: 13 large (2 cm) squares across, 9 up — A4 landscape with margins. */
export const PAPER = { squaresX: 13, squaresY: 9 } as const;

export interface Analysis {
  context: FeedbackContext;
  findings: Finding[];
  /** Results from the student's own line, in SI. */
  results: { id: string; symbol: string; unit: string; value?: number; accepted?: number; goodWithinPercent: number }[];
  /** Student slope and intercept converted to SI (for results). */
  studentSI?: { slope: number; intercept: number };
  conditions: Conditions;
}

export function tableColumns(def: ExperimentDefinition, session: Session): TableColumn[] {
  return def.columns.map((c) => ({
    id: c.id,
    symbol: c.symbol,
    kind: c.kind,
    source: c.source,
    unit: unitOf(session, c),
    instrument: c.instrument,
    derive: c.derive,
  }));
}

export function parseRows(def: ExperimentDefinition, session: Session): { rows: ParsedRow[]; complete: ParsedRow[] } {
  const rows = session.rows.map((row) => ({
    id: row.id,
    cells: Object.fromEntries(def.columns.map((c) => [c.id, parseCell(row.cells[c.id], c, unitOf(session, c))])),
  }));
  const required = def.columns.filter((c) => c.source !== "derived");
  const complete = rows.filter((r) => required.every((c) => r.cells[c.id]?.figure));
  return { rows, complete };
}

/** Constants (e.g. hanging mass) in SI. */
export function parseConstants(def: ExperimentDefinition, session: Session): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of def.constants) {
    const parsed = parseCell(session.constants[c.id], c, session.constantUnits[c.id] ?? c.units[0]);
    if (parsed.si !== undefined) out[c.id] = parsed.si;
  }
  return out;
}

function siFactor(def: ExperimentDefinition, session: Session, columnId: string): number {
  const column = def.columns.find((c) => c.id === columnId);
  if (!column) return 1;
  return findUnit(column.kind, unitOf(session, column))?.toSI ?? 1;
}

export function analyse(def: ExperimentDefinition, session: Session): Analysis {
  const conditions = actualConditions(session.environment, session.seed);
  const { rows, complete } = parseRows(def, session);
  const xCol = session.graph?.x.column ?? def.graph.x;
  const yCol = session.graph?.y.column ?? def.graph.y;

  const points: Point[] = [];
  const pointRowIds: string[] = [];
  for (const row of complete) {
    const x = row.cells[xCol]?.figure?.value;
    const y = row.cells[yCol]?.figure?.value;
    if (x !== undefined && y !== undefined) {
      points.push({ x, y });
      pointRowIds.push(row.id);
    }
  }

  let fit: LineFit | undefined;
  try {
    if (points.length >= 2) fit = fitLine(points);
  } catch {
    fit = undefined;
  }

  const line = session.graph?.line;
  const studentLine =
    line && line.x2 !== line.x1
      ? { slope: (line.y2 - line.y1) / (line.x2 - line.x1), intercept: line.y1 - ((line.y2 - line.y1) / (line.x2 - line.x1)) * line.x1 }
      : undefined;

  const context: FeedbackContext = {
    session,
    columns: tableColumns(def, session),
    rows,
    completeRows: complete,
    points,
    pointRowIds,
    fit,
    studentLine,
    conditions,
    actions: session.actions,
    paper: PAPER,
  };

  const findings = runRules([...TABLE_RULES, ...GRAPH_RULES, ...CALCULATE_RULES, ...WRITING_RULES, ...def.rules], context);

  // Results come from the slope/intercept the student typed if they parse, else their drawn line.
  const typedSlope = Number(session.answers.slope);
  const typedIntercept = Number(session.answers.intercept);
  const slope = Number.isFinite(typedSlope) && session.answers.slope?.trim() ? typedSlope : studentLine?.slope;
  const intercept = Number.isFinite(typedIntercept) && session.answers.intercept?.trim() ? typedIntercept : studentLine?.intercept ?? 0;
  const xf = siFactor(def, session, xCol);
  const yf = siFactor(def, session, yCol);
  const studentSI = slope === undefined ? undefined : { slope: (slope * yf) / xf, intercept: intercept * yf };

  const world = session.mode === "perform" ? def.createWorld(session.seed, session.environment) : undefined;
  const constants = parseConstants(def, session);
  const rowsSI = complete.map((r) => Object.fromEntries(Object.entries(r.cells).flatMap(([id, c]) => (c.si === undefined ? [] : [[id, c.si]]))));
  const results = def.results.map((r) => ({
    id: r.id,
    symbol: r.symbol,
    unit: r.unit,
    value: finite(studentSI ? r.fromFit(studentSI, { conditions, constants, rows: rowsSI }) : undefined),
    accepted: r.accepted(world, conditions, constants),
    goodWithinPercent: r.goodWithinPercent,
  }));

  return { context, findings, results, studentSI, conditions };
}

function finite(v: number | undefined): number | undefined {
  return v !== undefined && Number.isFinite(v) ? v : undefined;
}
