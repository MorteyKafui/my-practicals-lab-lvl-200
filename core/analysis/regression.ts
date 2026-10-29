/**
 * Least-squares straight line with standard errors. This runs alongside the student's own
 * hand-drawn line: it is the marker's reference, never shown before the student has drawn theirs.
 */

export interface Point {
  x: number;
  y: number;
}

export interface LineFit {
  slope: number;
  intercept: number;
  slopeError: number;
  interceptError: number;
  /** Coefficient of determination. */
  r2: number;
  /** Residual standard deviation (scatter about the line, in y units). */
  residualSd: number;
  n: number;
  centroid: Point;
}

export function fitLine(points: readonly Point[]): LineFit {
  const n = points.length;
  if (n < 2) throw new Error("fitLine needs at least two points");

  const mx = mean(points.map((p) => p.x));
  const my = mean(points.map((p) => p.y));
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of points) {
    sxx += (p.x - mx) ** 2;
    sxy += (p.x - mx) * (p.y - my);
    syy += (p.y - my) ** 2;
  }
  if (sxx === 0) throw new Error("fitLine needs at least two distinct x values");

  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const sse = points.reduce((acc, p) => acc + (p.y - (slope * p.x + intercept)) ** 2, 0);
  const residualSd = n > 2 ? Math.sqrt(sse / (n - 2)) : 0;
  const slopeError = n > 2 ? residualSd / Math.sqrt(sxx) : 0;
  const interceptError = n > 2 ? residualSd * Math.sqrt(1 / n + mx ** 2 / sxx) : 0;
  const r2 = syy === 0 ? 1 : 1 - sse / syy;

  return { slope, intercept, slopeError, interceptError, r2, residualSd, n, centroid: { x: mx, y: my } };
}

/** Line forced through the origin (y = kx), for relations the theory says are proportional. */
export function fitThroughOrigin(points: readonly Point[]): { slope: number; slopeError: number } {
  const sxx = points.reduce((a, p) => a + p.x * p.x, 0);
  const sxy = points.reduce((a, p) => a + p.x * p.y, 0);
  if (sxx === 0) throw new Error("fitThroughOrigin needs a non-zero x");
  const slope = sxy / sxx;
  const n = points.length;
  const sse = points.reduce((a, p) => a + (p.y - slope * p.x) ** 2, 0);
  const slopeError = n > 1 ? Math.sqrt(sse / (n - 1) / sxx) : 0;
  return { slope, slopeError };
}

/** Standardised residuals; |r| > 2.5 marks a reading worth repeating. */
export function residuals(points: readonly Point[], fit: LineFit): number[] {
  return points.map((p) => {
    const r = p.y - (fit.slope * p.x + fit.intercept);
    return fit.residualSd > 0 ? r / fit.residualSd : 0;
  });
}

export function mean(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function percentDifference(measured: number, accepted: number): number {
  return ((measured - accepted) / accepted) * 100;
}
