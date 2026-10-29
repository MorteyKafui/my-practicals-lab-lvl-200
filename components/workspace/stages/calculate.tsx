"use client";

import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { formatSigFigs } from "@/core/sigfigs";

import { FindingItem } from "../finding-item";
import type { StageProps } from "../stage-view";

export function CalculateStage({ ctx, definition, analysis }: StageProps) {
  const t = useTranslations("workspace.calculate");
  const { session, update } = ctx;
  const tri = session.graph?.triangle;
  const findings = analysis.findings.filter((f) => f.stage === "calculate");
  const setAnswer = (key: string, value: string) => update((s) => ({ ...s, answers: { ...s.answers, [key]: value } }));
  const xCol = definition.columns.find((c) => c.id === (session.graph?.x.column ?? definition.graph.x));
  const yCol = definition.columns.find((c) => c.id === (session.graph?.y.column ?? definition.graph.y));
  const slopeUnit = `${session.units[yCol?.id ?? ""] ?? yCol?.units[0] ?? ""} / ${session.units[xCol?.id ?? ""] ?? xCol?.units[0] ?? ""}`;

  if (!session.graph?.line) return <p className="px-4 py-6 text-ds-body-sm text-text-muted md:px-6">{t("noLine")}</p>;

  return (
    <div className="flex flex-col gap-8 px-4 py-6 md:px-6">
      <h2 className="text-ds-heading-4">{t("title")}</h2>

      <div className="grid max-w-3xl gap-6 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-ds-label-md">
            {t("slope")} <span className="figure text-text-muted">({definition.graph.slope.symbol})</span>
          </span>
          {tri && (
            <span className="figure text-ds-mono-xs text-text-muted">
              {t("fromTriangle", { dy: formatSigFigs(tri.y2 - tri.y1, 3), dx: formatSigFigs(tri.x2 - tri.x1, 3) })}
            </span>
          )}
          <span className="flex items-center gap-2">
            <Input className="figure w-40 text-right" inputMode="decimal" value={session.answers.slope ?? ""} onChange={(e) => setAnswer("slope", e.target.value)} />
            <span className="figure text-ds-mono-xs text-text-muted">{slopeUnit}</span>
          </span>
        </label>

        {definition.graph.intercept && (
          <label className="flex flex-col gap-1.5">
            <span className="text-ds-label-md">
              {t("intercept")} <span className="figure text-text-muted">({definition.graph.intercept.symbol})</span>
            </span>
            <span className="h-4" aria-hidden />
            <span className="flex items-center gap-2">
              <Input className="figure w-40 text-right" inputMode="decimal" value={session.answers.intercept ?? ""} onChange={(e) => setAnswer("intercept", e.target.value)} />
              <span className="figure text-ds-mono-xs text-text-muted">{session.units[yCol?.id ?? ""] ?? yCol?.units[0]}</span>
            </span>
          </label>
        )}
      </div>

      <label className="flex max-w-3xl flex-col gap-1.5">
        <span className="text-ds-label-md">{t("working")}</span>
        <textarea
          rows={6}
          value={session.answers.working ?? ""}
          onChange={(e) => setAnswer("working", e.target.value)}
          className="figure border border-input bg-sheet p-3 text-ds-mono-sm outline-none focus:border-ring"
        />
      </label>

      <section aria-labelledby="results" className="max-w-3xl">
        <h3 id="results" className="text-ds-heading-5">
          {t("result")}
        </h3>
        <p className="mb-3 text-ds-body-xs text-text-muted">{t("resultFrom")}</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-rule pt-3">
          {analysis.results.map((r) => (
            <div key={r.id} className="contents">
              <dt className="figure text-ds-mono-md">{r.symbol} =</dt>
              <dd className="figure text-ds-mono-md">
                {r.value === undefined ? <span className="text-text-muted">—</span> : formatSigFigs(r.value, 3)}{" "}
                <span className="text-ds-mono-xs text-text-muted">{r.unit}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

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
