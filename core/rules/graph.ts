import type { FeedbackContext, FeedbackRule, Finding } from "../feedback";
import type { Axis } from "../session";

/**
 * The five graph criteria from the report format:
 *   1. title  2. axes labelled with units  3. reasonable scale
 *   4. best straight line  5. intercept (checked with the calculations)
 */

export function isConvenientScale(perSquare: number): "good" | "awkward" | "bad" {
  if (!(perSquare > 0)) return "bad";
  const mantissa = Number((perSquare / 10 ** Math.floor(Math.log10(perSquare))).toPrecision(6));
  if ([1, 2, 5].includes(mantissa)) return "good";
  if ([2.5, 4].includes(mantissa)) return "awkward";
  return "bad";
}

/**
 * How much of the paper the plot uses along one axis: from the axis start to the furthest point
 * (1 = reaches the edge). A plot that starts at the origin and reaches most of the way is fine
 * even if the points themselves sit in the upper part.
 */
export function axisUsage(values: readonly number[], axis: Axis, squares: number): { usage: number; offPaper: boolean } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const end = axis.start + axis.perSquare * squares;
  return { usage: (max - axis.start) / (end - axis.start), offPaper: min < axis.start - 1e-12 || max > end + 1e-12 };
}

const title: FeedbackRule = {
  id: "graph-title",
  stage: "graph",
  check: ({ session }) =>
    session.graph && session.graph.title.trim().length >= 6
      ? []
      : [{ rule: "graph-title", severity: "error", stage: "graph", key: "graph.noTitle" }],
};

const axisLabels: FeedbackRule = {
  id: "graph-axis-labels",
  stage: "graph",
  check: ({ session, columns }) => {
    const graph = session.graph;
    if (!graph) return [];
    const findings: Finding[] = [];
    for (const [name, axis] of [["x", graph.x], ["y", graph.y]] as const) {
      const column = columns.find((c) => c.id === axis.column);
      if (!column) continue;
      const label = axis.label.trim();
      if (label === "") {
        findings.push({ rule: "graph-axis-labels", severity: "error", stage: "graph", key: "graph.noAxisLabel", params: { axis: name } });
      } else if (column.unit !== "" && !label.includes(column.unit)) {
        findings.push({ rule: "graph-axis-labels", severity: "error", stage: "graph", key: "graph.axisNoUnit", params: { axis: name, unit: column.unit } });
      }
    }
    return findings;
  },
};

const scale: FeedbackRule = {
  id: "graph-scale",
  stage: "graph",
  check: ({ session, points, paper }) => {
    const graph = session.graph;
    if (!graph || points.length < 2) return [];
    const findings: Finding[] = [];
    const axes = [
      ["x", graph.x, points.map((p) => p.x), paper.squaresX],
      ["y", graph.y, points.map((p) => p.y), paper.squaresY],
    ] as const;
    for (const [name, axis, values, squares] of axes) {
      const convenience = isConvenientScale(axis.perSquare);
      if (convenience !== "good")
        findings.push({
          rule: "graph-scale",
          severity: convenience === "bad" ? "warning" : "tip",
          stage: "graph",
          key: "graph.awkwardScale",
          params: { axis: name, perSquare: axis.perSquare },
        });
      const { usage, offPaper } = axisUsage(values, axis, squares);
      if (offPaper) findings.push({ rule: "graph-scale", severity: "error", stage: "graph", key: "graph.offPaper", params: { axis: name } });
      else if (usage < 0.5)
        findings.push({ rule: "graph-scale", severity: "warning", stage: "graph", key: "graph.smallScale", params: { axis: name, percent: Math.round(usage * 100) } });
    }
    return findings;
  },
};

/** How far the student's line may sit from least squares before we call it out. */
export function lineTolerances(ctx: Pick<FeedbackContext, "fit" | "points">) {
  const fit = ctx.fit!;
  const ys = ctx.points.map((p) => p.y);
  const ySpan = Math.max(...ys) - Math.min(...ys) || Math.abs(fit.centroid.y) || 1;
  return {
    slope: Math.max(2 * fit.slopeError, Math.abs(fit.slope) * 0.04),
    centroid: Math.max(fit.residualSd, ySpan * 0.02),
  };
}

const bestLine: FeedbackRule = {
  id: "graph-best-line",
  stage: "graph",
  check: (ctx) => {
    const { fit, studentLine, points } = ctx;
    if (!fit || points.length < 3) return [];
    if (!studentLine) return [{ rule: "graph-best-line", severity: "error", stage: "graph", key: "graph.noLine" }];

    const tol = lineTolerances(ctx);
    const findings: Finding[] = [];
    const slopeOff = Math.abs(studentLine.slope - fit.slope);
    const atCentroid = studentLine.slope * fit.centroid.x + studentLine.intercept;
    const centroidOff = Math.abs(atCentroid - fit.centroid.y);

    if (slopeOff > tol.slope)
      findings.push({
        rule: "graph-best-line",
        severity: "warning",
        stage: "graph",
        key: studentLine.slope > fit.slope ? "graph.lineTooSteep" : "graph.lineTooShallow",
        params: { percent: Math.round((slopeOff / Math.abs(fit.slope)) * 100) },
      });
    if (centroidOff > tol.centroid)
      findings.push({ rule: "graph-best-line", severity: "warning", stage: "graph", key: "graph.missesCentroid" });

    const above = points.filter((p) => p.y > studentLine.slope * p.x + studentLine.intercept).length;
    const below = points.length - above;
    if (Math.abs(above - below) > Math.max(2, points.length * 0.3))
      findings.push({ rule: "graph-best-line", severity: "tip", stage: "graph", key: "graph.unbalanced", params: { above, below } });

    if (findings.length === 0) findings.push({ rule: "graph-best-line", severity: "good", stage: "graph", key: "graph.goodLine" });
    return findings;
  },
};

const triangle: FeedbackRule = {
  id: "graph-triangle",
  stage: "calculate",
  check: ({ session, points, studentLine }) => {
    const tri = session.graph?.triangle;
    if (!studentLine || points.length < 2) return [];
    if (!tri) return [{ rule: "graph-triangle", severity: "warning", stage: "calculate", key: "graph.noTriangle" }];
    const xs = points.map((p) => p.x);
    const dataSpan = Math.max(...xs) - Math.min(...xs);
    const findings: Finding[] = [];
    if (Math.abs(tri.x2 - tri.x1) < dataSpan * 0.5)
      findings.push({ rule: "graph-triangle", severity: "tip", stage: "calculate", key: "graph.smallTriangle" });
    const onLine = (x: number, y: number) => Math.abs(y - (studentLine.slope * x + studentLine.intercept));
    const ys = points.map((p) => p.y);
    const ySpan = Math.max(...ys) - Math.min(...ys) || 1;
    if (Math.max(onLine(tri.x1, tri.y1), onLine(tri.x2, tri.y2)) > ySpan * 0.02)
      findings.push({ rule: "graph-triangle", severity: "warning", stage: "calculate", key: "graph.triangleOffLine" });
    return findings;
  },
};

export const GRAPH_RULES: FeedbackRule[] = [title, axisLabels, scale, bestLine, triangle];
