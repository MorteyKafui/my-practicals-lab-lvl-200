import type { FeedbackRule, Finding } from "../feedback";
import { parseFigure } from "../sigfigs";

/**
 * Calculations are checked against the student's OWN graph, not the textbook: a correct
 * slope from a poorly drawn line is still a correct calculation.
 */

function within(typed: number, expected: number, fraction: number) {
  return Math.abs(typed - expected) <= Math.abs(expected) * fraction + 1e-12;
}

/** The slope the student's own triangle gives (or their line, if they skipped the triangle). */
export function studentSlope(ctx: Parameters<FeedbackRule["check"]>[0]): number | undefined {
  const tri = ctx.session.graph?.triangle;
  if (tri && tri.x2 !== tri.x1) return (tri.y2 - tri.y1) / (tri.x2 - tri.x1);
  return ctx.studentLine?.slope;
}

const slope: FeedbackRule = {
  id: "calc-slope",
  stage: "calculate",
  check: (ctx) => {
    const raw = ctx.session.answers.slope?.trim();
    const expected = studentSlope(ctx);
    if (expected === undefined) return [];
    if (!raw) return [{ rule: "calc-slope", severity: "error", stage: "calculate", key: "calc.noSlope" }];
    const typed = parseFigure(raw);
    if (!typed) return [{ rule: "calc-slope", severity: "error", stage: "calculate", key: "calc.unreadable", params: { what: "slope", value: raw } }];
    if (within(typed.value, expected, 0.02)) return [{ rule: "calc-slope", severity: "good", stage: "calculate", key: "calc.slopeOk" }];
    const findings: Finding[] = [];
    if (within(typed.value, 1 / expected, 0.02)) findings.push({ rule: "calc-slope", severity: "error", stage: "calculate", key: "calc.slopeInverted" });
    else if (within(-typed.value, expected, 0.02)) findings.push({ rule: "calc-slope", severity: "error", stage: "calculate", key: "calc.slopeSign" });
    else
      findings.push({
        rule: "calc-slope",
        severity: "error",
        stage: "calculate",
        key: "calc.slopeWrong",
        params: { typed: typed.value, expected: expected.toPrecision(3) },
      });
    return findings;
  },
};

const intercept: FeedbackRule = {
  id: "calc-intercept",
  stage: "calculate",
  check: (ctx) => {
    const line = ctx.studentLine;
    const raw = ctx.session.answers.intercept?.trim();
    if (!line || !raw) return [];
    const typed = parseFigure(raw);
    if (!typed) return [{ rule: "calc-intercept", severity: "error", stage: "calculate", key: "calc.unreadable", params: { what: "intercept", value: raw } }];
    const ys = ctx.points.map((p) => p.y);
    const ySpan = Math.max(...ys) - Math.min(...ys) || 1;
    if (Math.abs(typed.value - line.intercept) <= ySpan * 0.03)
      return [{ rule: "calc-intercept", severity: "good", stage: "calculate", key: "calc.interceptOk" }];
    const graph = ctx.session.graph;
    const falseOrigin = graph && graph.x.start !== 0;
    return [
      {
        rule: "calc-intercept",
        severity: "error",
        stage: "calculate",
        key: falseOrigin ? "calc.interceptFalseOrigin" : "calc.interceptWrong",
        params: { typed: typed.value, expected: line.intercept.toPrecision(3) },
      },
    ];
  },
};

export const CALCULATE_RULES: FeedbackRule[] = [slope, intercept];
