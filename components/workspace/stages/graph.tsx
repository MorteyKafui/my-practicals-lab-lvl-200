"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { GraphPaper } from "@/components/graph/graph-paper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Axis, GraphState } from "@/core/session";
import { PAPER } from "@/experiments/analyse";

import { FindingItem } from "../finding-item";
import type { StageProps } from "../stage-view";

export function GraphStage({ ctx, definition, analysis }: StageProps) {
  const t = useTranslations("workspace.graph");
  const { session, update } = ctx;
  const graph = session.graph;

  // A fresh graph has no title, labels or scale: choosing them is part of the work.
  useEffect(() => {
    if (!session.graph)
      update((s) => ({
        ...s,
        graph: {
          title: "",
          x: { column: definition.graph.x, label: "", start: 0, perSquare: 0 },
          y: { column: definition.graph.y, label: "", start: 0, perSquare: 0 },
        },
      }));
  }, [session.graph, definition.graph, update]);

  if (!graph) return null;

  const setGraph = (patch: Partial<GraphState>) => update((s) => ({ ...s, graph: { ...s.graph!, ...patch } }));
  const setAxis = (axis: "x" | "y", patch: Partial<Axis>) =>
    update((s) => ({ ...s, graph: { ...s.graph!, [axis]: { ...s.graph![axis], ...patch } } }));

  const { points, pointRowIds } = analysis.context;
  const findings = analysis.findings.filter((f) => f.stage === "graph");
  const flaggedRows = new Set(findings.filter((f) => f.rule === "table-outlier").flatMap((f) => f.rows ?? []));
  const flagged = new Set(pointRowIds.map((id, i) => (flaggedRows.has(id) ? i : -1)).filter((i) => i >= 0));

  // A starting line from the first to the last point — never the least-squares line.
  const startLine = () => {
    if (points.length < 2) return;
    const sorted = [...points].sort((a, b) => a.x - b.x);
    const a = sorted[0]!;
    const b = sorted[sorted.length - 1]!;
    setGraph({ line: { x1: a.x, y1: a.y, x2: b.x, y2: b.y }, triangle: undefined });
  };
  const startTriangle = () => {
    const l = graph.line;
    if (!l) return;
    const m = (l.y2 - l.y1) / (l.x2 - l.x1);
    const xa = l.x1 + (l.x2 - l.x1) * 0.15;
    const xb = l.x1 + (l.x2 - l.x1) * 0.85;
    setGraph({ triangle: { x1: xa, y1: l.y1 + m * (xa - l.x1), x2: xb, y2: l.y1 + m * (xb - l.x1) } });
  };

  const columnOptions = definition.columns;

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-6">
      <h2 className="text-ds-heading-4">{t("title")}</h2>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
        {(["x", "y"] as const).map((axis) => (
          <fieldset key={axis} className="flex flex-col gap-2 bg-well p-3">
            <legend className="float-left mb-1 text-ds-label-sm">{t(axis === "x" ? "xAxis" : "yAxis")}</legend>
            <label className="flex items-center gap-2 text-ds-body-xs text-text-secondary">
              <span className="w-24 shrink-0">{t("plot")}</span>
              <select
                value={graph[axis].column}
                onChange={(e) => setAxis(axis, { column: e.target.value })}
                className="figure h-8 flex-1 border border-input bg-sheet px-2 text-ds-mono-sm"
              >
                {columnOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.symbol}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-ds-body-xs text-text-secondary">
              <span className="w-24 shrink-0">{t("label")}</span>
              <Input value={graph[axis].label} onChange={(e) => setAxis(axis, { label: e.target.value })} className="h-8 flex-1" />
            </label>
            <div className="flex gap-2">
              <label className="flex flex-1 items-center gap-2 text-ds-body-xs text-text-secondary">
                <span className="w-24 shrink-0">{t("start")}</span>
                <NumberField value={graph[axis].start} onChange={(v) => setAxis(axis, { start: v })} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-ds-body-xs text-text-secondary">
              <span className="w-24 shrink-0">{t("perSquare")}</span>
              <NumberField value={graph[axis].perSquare} onChange={(v) => setAxis(axis, { perSquare: v })} />
            </label>
          </fieldset>
        ))}
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-ds-body-xs text-text-secondary">
            {t("graphTitle")}
            <Input value={graph.title} onChange={(e) => setGraph({ title: e.target.value })} />
          </label>
          <p className="text-ds-body-xs text-text-muted">{t("hint")}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={graph.line ? "outline" : "default"} onClick={startLine} disabled={points.length < 2}>
              {graph.line ? t("resetLine") : t("drawLine")}
            </Button>
            <Button size="sm" variant="outline" onClick={startTriangle} disabled={!graph.line}>
              {t("addTriangle")}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1000px] overflow-x-auto">
        <div className="min-w-[560px]">
          <GraphPaper
            graph={graph}
            squaresX={PAPER.squaresX}
            squaresY={PAPER.squaresY}
            points={points}
            flagged={flagged}
            interactive
            onLine={(line) => setGraph({ line, triangle: undefined })}
            onTriangle={(triangle) => setGraph({ triangle })}
            ariaLabel={graph.title || t("title")}
          />
        </div>
      </div>

      {findings.length > 0 && (
        <ul className="max-w-3xl">
          {findings.map((f, i) => (
            <FindingItem key={`${f.rule}-${i}`} finding={f} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** A number input that lets the student type freely and only commits valid numbers. */
function NumberField({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <Input
      key={value}
      defaultValue={value === 0 ? "" : String(value)}
      placeholder="0"
      inputMode="decimal"
      className="figure h-8 flex-1 text-right"
      onBlur={(e) => {
        const v = Number(e.target.value || 0);
        if (Number.isFinite(v) && v >= 0) onChange(v);
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
}
