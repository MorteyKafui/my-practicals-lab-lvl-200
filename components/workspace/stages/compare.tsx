"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { GraphPaper } from "@/components/graph/graph-paper";
import { fitLine, percentDifference, type Point } from "@/core/analysis/regression";
import { formatSigFigs } from "@/core/sigfigs";
import { fromSI } from "@/core/units";
import { PAPER, parseConstants } from "@/experiments/analyse";
import { cn } from "@/lib/utils";

import type { StageProps } from "../stage-view";

/** Opens only after feedback: the student's result beside the accepted value and a careful run. */
export function CompareStage({ ctx, definition, analysis }: StageProps) {
  const t = useTranslations("workspace.compare");
  const { session } = ctx;
  const world = useMemo(
    () => (session.mode === "perform" ? definition.createWorld(session.seed, session.environment) : undefined),
    [definition, session.mode, session.seed, session.environment],
  );

  const overlay = useMemo(() => {
    if (!world || !session.graph) return undefined;
    const xCol = definition.columns.find((c) => c.id === session.graph!.x.column);
    const yCol = definition.columns.find((c) => c.id === session.graph!.y.column);
    if (!xCol || !yCol) return undefined;
    const unit = (c: typeof xCol) => session.units[c.id] ?? c.units[0]!;
    const points: Point[] = definition
      .idealRows(world, analysis.conditions, parseConstants(definition, session))
      .filter((r) => r[xCol.id] !== undefined && r[yCol.id] !== undefined)
      .map((r) => ({ x: fromSI(r[xCol.id]!, xCol.kind, unit(xCol)), y: fromSI(r[yCol.id]!, yCol.kind, unit(yCol)) }));
    if (points.length < 2) return undefined;
    const fit = fitLine(points);
    return { points, line: { slope: fit.slope, intercept: fit.intercept } };
  }, [world, session, definition, analysis.conditions]);

  return (
    <div className="flex flex-col gap-8 px-4 py-6 md:px-6">
      <h2 className="text-ds-heading-4">{t("title")}</h2>

      <table className="w-full max-w-3xl border-collapse text-ds-body-sm">
        <thead>
          <tr className="border-b border-sheet-edge text-left text-text-muted">
            <th className="py-2 font-normal" />
            <th className="py-2 text-right font-normal">{t("yours")}</th>
            <th className="py-2 text-right font-normal">{t("accepted")}</th>
            <th className="py-2 text-right font-normal">{t("difference")}</th>
          </tr>
        </thead>
        <tbody>
          {analysis.results.map((r) => {
            const diff = r.value !== undefined && r.accepted !== undefined ? percentDifference(r.value, r.accepted) : undefined;
            const good = diff !== undefined && Math.abs(diff) <= r.goodWithinPercent;
            return (
              <tr key={r.id} className="border-b border-rule">
                <th scope="row" className="figure py-3 text-left font-normal">
                  {r.symbol} <span className="text-text-muted">/ {r.unit}</span>
                </th>
                <td className="figure py-3 text-right">{r.value === undefined ? "—" : formatSigFigs(r.value, 3)}</td>
                <td className="figure py-3 text-right text-reference">{r.accepted === undefined ? "—" : formatSigFigs(r.accepted, 3)}</td>
                <td className={cn("figure py-3 text-right", diff === undefined ? "text-text-muted" : good ? "text-positive" : "text-negative")}>
                  {diff === undefined ? "—" : `${diff > 0 ? "+" : ""}${diff.toFixed(1)} %`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="max-w-3xl text-ds-body-sm text-text-secondary">
        {analysis.results.map((r) => {
          if (r.value === undefined || r.accepted === undefined) return null;
          const diff = Math.abs(percentDifference(r.value, r.accepted));
          return (
            <p key={r.id}>
              <span className="figure">{r.symbol}</span>: {diff <= r.goodWithinPercent ? t("good", { n: r.goodWithinPercent }) : t("fair", { n: r.goodWithinPercent })}
            </p>
          );
        })}
        {session.mode === "bring" && <p>{t("noAccepted")}</p>}
      </div>

      {session.graph && (
        <section aria-labelledby="compare-graph" className="max-w-[1000px]">
          <h3 id="compare-graph" className="mb-1 text-ds-heading-5">
            {session.graph.title}
          </h3>
          {overlay && <p className="mb-2 text-ds-body-xs text-text-muted">{t("overlay")}</p>}
          <div className="overflow-x-auto">
            <div className="min-w-[560px]">
              <GraphPaper graph={session.graph} squaresX={PAPER.squaresX} squaresY={PAPER.squaresY} points={analysis.context.points} overlay={overlay} ariaLabel={session.graph.title} />
            </div>
          </div>
        </section>
      )}

      {world !== undefined && definition.reveal && (
        <section aria-labelledby="hidden" className="max-w-3xl">
          <h3 id="hidden" className="mb-2 text-ds-heading-5">
            {t("hidden")}
          </h3>
          <dl className="grid grid-cols-[1fr_auto] border-t border-rule text-ds-body-sm">
            {definition.reveal(world).map((item) => (
              <div key={item.label} className="contents">
                <dt className="border-b border-rule py-1.5 text-text-secondary">{item.label}</dt>
                <dd className="figure border-b border-rule py-1.5 text-right">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
