import { residuals } from "../analysis/regression";
import type { FeedbackRule, Finding } from "../feedback";
import { decimalsForResolution } from "../sigfigs";
import { findUnit, fromSI, suspectedUnitSlip, type QuantityKind } from "../units";

/** Rules about the observation table: enough readings, the right precision, consistent units. */

const MIN_ROWS = 5;

export const tooFewRows: FeedbackRule = {
  id: "table-too-few-rows",
  stage: "observations",
  check: ({ completeRows }) => {
    const n = completeRows.length;
    if (n >= MIN_ROWS + 1) return [{ rule: "table-too-few-rows", severity: "good", stage: "observations", key: "table.enoughRows", params: { n } }];
    if (n >= MIN_ROWS) return [];
    return [
      {
        rule: "table-too-few-rows",
        severity: n < 3 ? "error" : "warning",
        stage: "observations",
        key: "table.tooFewRows",
        params: { n, min: MIN_ROWS },
      },
    ];
  },
};

export const narrowRange: FeedbackRule = {
  id: "table-narrow-range",
  stage: "observations",
  check: ({ points }) => {
    if (points.length < 3) return [];
    const xs = points.map((p) => p.x);
    const min = Math.min(...xs);
    const max = Math.max(...xs);
    if (min <= 0) return [];
    const ratio = max / min;
    if (ratio >= 1.6) return [];
    return [{ rule: "table-narrow-range", severity: "warning", stage: "observations", key: "table.narrowRange", params: { ratio: ratio.toFixed(2) } }];
  },
};

export const unparseable: FeedbackRule = {
  id: "table-unparseable",
  stage: "observations",
  check: ({ rows, columns }) => {
    const findings: Finding[] = [];
    for (const column of columns) {
      const bad = rows.filter((r) => {
        const cell = r.cells[column.id];
        return cell && cell.raw !== "" && !cell.figure;
      });
      if (bad.length)
        findings.push({
          rule: "table-unparseable",
          severity: "error",
          stage: "observations",
          key: "table.unparseable",
          params: { symbol: column.symbol, value: bad[0]!.cells[column.id]!.raw },
          rows: bad.map((r) => r.id),
          column: column.id,
        });
    }
    return findings;
  },
};

export const inconsistentDecimals: FeedbackRule = {
  id: "table-inconsistent-decimals",
  stage: "observations",
  check: ({ completeRows, columns }) => {
    const findings: Finding[] = [];
    for (const column of columns.filter((c) => c.source === "measured")) {
      const decimals = completeRows.map((r) => r.cells[column.id]?.figure?.decimals).filter((d): d is number => d !== undefined);
      const distinct = new Set(decimals);
      if (distinct.size > 1)
        findings.push({
          rule: "table-inconsistent-decimals",
          severity: "warning",
          stage: "observations",
          key: "table.inconsistentDecimals",
          params: { symbol: column.symbol, list: [...distinct].sort().join(", ") },
          column: column.id,
        });
    }
    return findings;
  },
};

/** A metre rule read in cm gives one decimal place; more is false precision, fewer throws away a digit. */
export const precisionVsInstrument: FeedbackRule = {
  id: "table-precision-vs-instrument",
  stage: "observations",
  check: ({ completeRows, columns }) => {
    const findings: Finding[] = [];
    for (const column of columns) {
      const instrument = column.instrument;
      if (!instrument || column.source !== "measured") continue;
      // Resolution in the column's chosen unit (a 0.1 cm rule read in m has resolution 0.001 m).
      const resolutionSI = convertResolution(instrument.resolution, instrument.unit, column);
      if (resolutionSI === undefined) continue;
      const expected = decimalsForResolution(resolutionSI);
      const over = completeRows.filter((r) => (r.cells[column.id]?.figure?.decimals ?? expected) > expected + 1);
      const under = completeRows.filter((r) => (r.cells[column.id]?.figure?.decimals ?? expected) < expected);
      if (over.length)
        findings.push({
          rule: "table-precision-vs-instrument",
          severity: "warning",
          stage: "observations",
          key: "table.falsePrecision",
          params: { symbol: column.symbol, expected, unit: column.unit },
          rows: over.map((r) => r.id),
          column: column.id,
        });
      else if (under.length)
        findings.push({
          rule: "table-precision-vs-instrument",
          severity: "tip",
          stage: "observations",
          key: "table.underRecorded",
          params: { symbol: column.symbol, expected, unit: column.unit },
          rows: under.map((r) => r.id),
          column: column.id,
        });
    }
    return findings;
  },
};

/** An instrument's resolution expressed in the column's chosen unit (a 0.1 cm rule read in m → 0.001). */
function convertResolution(resolution: number, instrumentUnit: string, column: { kind: QuantityKind; unit: string }) {
  const from = findUnit(column.kind, instrumentUnit);
  const to = findUnit(column.kind, column.unit);
  return from && to ? (resolution * from.toSI) / to.toSI : undefined;
}

export const unitSlip: FeedbackRule = {
  id: "table-unit-slip",
  stage: "observations",
  check: ({ completeRows, columns }) => {
    const findings: Finding[] = [];
    for (const column of columns.filter((c) => c.source !== "derived")) {
      const values = completeRows.map((r) => ({ id: r.id, v: r.cells[column.id]?.figure?.value })).filter((x): x is { id: string; v: number } => x.v !== undefined);
      if (values.length < 3) continue;
      const sorted = values.map((x) => x.v).sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)]!;
      for (const { id, v } of values) {
        // A slip sits well outside the range of the column's other values, not just far from the median
        // (a volume column running 0, 50 … 350 is a wide range, not a slip).
        const others = values.filter((x) => x.id !== id && x.v !== 0).map((x) => Math.abs(x.v));
        const outside = v !== 0 && others.length > 0 && (Math.abs(v) < Math.min(...others) / 6 || Math.abs(v) > Math.max(...others) * 6);
        const factor = outside ? suspectedUnitSlip(v, median) : undefined;
        if (factor)
          findings.push({
            rule: "table-unit-slip",
            severity: "error",
            stage: "observations",
            key: "table.unitSlip",
            params: { symbol: column.symbol, value: v, factor },
            rows: [id],
            column: column.id,
          });
      }
    }
    return findings;
  },
};

/** The student computes derived columns (1/l, l²); check the arithmetic row by row. */
export const derivedArithmetic: FeedbackRule = {
  id: "table-derived-arithmetic",
  stage: "observations",
  check: ({ completeRows, columns, constants }) => {
    const findings: Finding[] = [];
    for (const column of columns.filter((c) => c.source === "derived" && c.derive)) {
      const wrong: string[] = [];
      let example: { typed: number; expected: string } | undefined;
      for (const row of completeRows) {
        const typed = row.cells[column.id];
        if (!typed?.figure || typed.si === undefined) continue;
        const inputs: Record<string, number> = {};
        for (const [id, cell] of Object.entries(row.cells)) if (cell.si !== undefined) inputs[id] = cell.si;
        const expectedSI = column.derive!(inputs, constants);
        if (!Number.isFinite(expectedSI)) continue;
        const tolerance = Math.max(Math.abs(expectedSI) * 0.01, 10 ** -typed.figure.decimals * 0.6 * Math.abs(expectedSI / (typed.figure.value || 1)));
        if (Math.abs(typed.si - expectedSI) > tolerance) {
          wrong.push(row.id);
          example ??= { typed: typed.figure.value, expected: fromSI(expectedSI, column.kind, column.unit).toPrecision(4) };
        }
      }
      if (wrong.length)
        findings.push({
          rule: "table-derived-arithmetic",
          severity: "error",
          stage: "observations",
          key: "table.derivedArithmetic",
          params: { symbol: column.symbol, count: wrong.length, typed: example!.typed, expected: example!.expected, unit: column.unit },
          rows: wrong,
          column: column.id,
        });
    }
    return findings;
  },
};

export const outliers: FeedbackRule = {
  id: "table-outlier",
  stage: "graph",
  check: ({ points, pointRowIds, fit }) => {
    if (!fit || points.length < 5) return [];
    const r = residuals(points, fit);
    const flagged = r.map((z, i) => ({ z, id: pointRowIds[i]! })).filter((x) => Math.abs(x.z) > 2.5);
    return flagged.map(({ id, z }) => ({
      rule: "table-outlier",
      severity: "warning" as const,
      stage: "graph" as const,
      key: "table.outlier",
      params: { sigma: Math.abs(z).toFixed(1) },
      rows: [id],
    }));
  },
};

export const TABLE_RULES: FeedbackRule[] = [
  tooFewRows,
  narrowRange,
  unparseable,
  inconsistentDecimals,
  precisionVsInstrument,
  unitSlip,
  derivedArithmetic,
  outliers,
];
