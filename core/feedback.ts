import type { LabAction } from "./action-log";
import type { LineFit, Point } from "./analysis/regression";
import type { Conditions } from "./environment";
import type { InstrumentSpec } from "./instruments";
import type { ParsedCell, Session, StageId } from "./session";
import type { QuantityKind } from "./units";

/**
 * Feedback is a list of findings produced by rules. Each finding names the stage it belongs
 * to, how serious it is, and carries a message key + params (translated in messages/*.json),
 * plus the rows or cells it points at so the UI can mark them.
 */

export type Severity = "error" | "warning" | "tip" | "good";

export interface Finding {
  rule: string;
  severity: Severity;
  stage: StageId;
  /** Message key under feedback.* in messages; title and detail are `${key}.title` / `${key}.detail`. */
  key: string;
  params?: Record<string, string | number>;
  rows?: string[];
  column?: string;
}

export interface TableColumn {
  id: string;
  symbol: string;
  kind: QuantityKind;
  source: "measured" | "given" | "derived";
  unit: string;
  instrument?: InstrumentSpec;
  derive?: (row: Readonly<Record<string, number>>, constants: Readonly<Record<string, number>>) => number;
}

export interface ParsedRow {
  id: string;
  cells: Record<string, ParsedCell>;
}

export interface FeedbackContext {
  session: Session;
  columns: TableColumn[];
  rows: ParsedRow[];
  /** The rows that have every non-derived cell filled and parseable. */
  completeRows: ParsedRow[];
  /** Points as plotted (display units), for the graph's chosen axes. */
  points: Point[];
  pointRowIds: string[];
  /** Least squares on `points`: the marker's reference line. */
  fit?: LineFit;
  /** Slope and intercept of the student's own drawn line. */
  studentLine?: { slope: number; intercept: number };
  conditions: Conditions;
  /** Constants the student recorded once (SI). */
  constants: Readonly<Record<string, number>>;
  actions: readonly LabAction[];
  /** Number of large squares across and up the virtual graph paper. */
  paper: { squaresX: number; squaresY: number };
}

export interface FeedbackRule {
  id: string;
  stage: StageId;
  check: (ctx: FeedbackContext) => Finding[];
}

const ORDER: Record<Severity, number> = { error: 0, warning: 1, tip: 2, good: 3 };

export function runRules(rules: readonly FeedbackRule[], ctx: FeedbackContext): Finding[] {
  const findings: Finding[] = [];
  for (const rule of rules) {
    try {
      findings.push(...rule.check(ctx));
    } catch {
      // A rule that cannot judge this data stays silent rather than guessing.
    }
  }
  return findings.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}

export function summarise(findings: readonly Finding[]) {
  return {
    errors: findings.filter((f) => f.severity === "error").length,
    warnings: findings.filter((f) => f.severity === "warning").length,
    tips: findings.filter((f) => f.severity === "tip").length,
    good: findings.filter((f) => f.severity === "good").length,
  };
}
