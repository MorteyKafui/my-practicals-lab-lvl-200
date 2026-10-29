"use client";

import { DownloadSimpleIcon, FileDocIcon, PrinterIcon } from "@phosphor-icons/react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { DIAGRAMS } from "@/components/diagrams";
import { GraphPaper } from "@/components/graph/graph-paper";
import { Tex } from "@/components/tex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toVlab } from "@/core/db";
import { readPref, writePref } from "@/lib/prefs";
import { listItems, methodFromActions, type ReportModel } from "@/core/report";
import { unitOf } from "@/core/session";
import { formatSigFigs } from "@/core/sigfigs";
import { PAPER } from "@/experiments/analyse";
import { buildReportDocx, download } from "@/lib/report-docx";

import type { StageProps } from "../stage-view";

export function ReportStage({ ctx, definition, analysis }: StageProps) {
  const t = useTranslations("workspace.report");
  const tx = useTranslations(`experiments.${ctx.session.experimentId}`);
  const sections = useTranslations().raw("reportSections") as string[];
  const format = useFormatter();
  const { session } = ctx;
  const [student, setStudent] = useState(() => readPref<string>("student-name") ?? "");
  const diagramRef = useRef<SVGSVGElement>(null);
  const Diagram = DIAGRAMS[session.experimentId];

  const model: ReportModel = useMemo(() => {
    const method =
      session.mode === "perform" ? methodFromActions(session.actions, definition.describeAction) : (tx.raw("steps") as string[]);
    const headers = definition.columns.map((c) => `${c.symbol} / ${unitOf(session, c)}`);
    const rows = analysis.context.rows
      .filter((r) => Object.values(r.cells).some((c) => c.raw))
      .map((r) => definition.columns.map((c) => r.cells[c.id]?.raw ?? ""));
    const constants = definition.constants.map((c) => `${c.symbol} = ${session.constants[c.id] ?? "—"} ${session.constantUnits[c.id] ?? c.units[0]}`);
    const calculation = [
      `Slope ${definition.graph.slope.symbol} = ${session.answers.slope || "—"}`,
      ...(definition.graph.intercept ? [`Intercept ${definition.graph.intercept.symbol} = ${session.answers.intercept || "—"}`] : []),
      ...listItems(session.answers.working ?? ""),
      ...analysis.results.filter((r) => r.value !== undefined).map((r) => `${r.symbol} = ${formatSigFigs(r.value!, 3)} ${r.unit}`),
    ];
    return {
      student,
      date: format.dateTime(session.createdAt, { dateStyle: "long" }),
      title: tx("title"),
      aim: tx("aim"),
      apparatus: Object.values(tx.raw("apparatus") as Record<string, string>).map((a) => a.split(": ")[0]!),
      theory: tx.raw("theory") as string[],
      method,
      constants,
      table: { headers, rows },
      graphTitle: session.graph?.title ?? "",
      calculation,
      discussion: session.writing.discussion,
      precautions: listItems(session.writing.precautions),
      sourcesOfError: listItems(session.writing.sourcesOfError),
      conclusion: session.writing.conclusion,
      references: tx.has("references")
        ? (tx.raw("references") as string[])
        : ["Physics Bench virtual laboratory.", "Young, H. D. & Freedman, R. A. University Physics (Pearson)."],
      footer: `${session.mode === "perform" ? "Performed on the Physics Bench virtual bench" : `Data from: ${session.source || "student's own laboratory readings"}`} · session #${session.seed}`,
    };
  }, [session, definition, analysis, tx, format, student]);

  const exportDocx = async () => {
    try {
      const graph = document.querySelector<SVGSVGElement>("#report-graph svg");
      const blob = await buildReportDocx(model, { diagram: diagramRef.current, graph });
      download(blob, `${tx("short")} — lab report.docx`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const missing = <span className="text-text-muted italic">{t("missing")}</span>;

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-6">
      <div className="no-print flex flex-col gap-4">
        <div>
          <h2 className="text-ds-heading-4">{t("title")}</h2>
          <p className="mt-1 text-ds-body-sm text-text-muted">{t("intro")}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-ds-body-xs text-text-secondary">
            {t("name")}
            <Input
              value={student}
              className="w-64"
              onChange={(e) => {
                setStudent(e.target.value);
                writePref("student-name", e.target.value);
              }}
            />
          </label>
          <Button onClick={() => window.print()}>
            <PrinterIcon data-icon="inline-start" />
            {t("print")}
          </Button>
          <Button variant="outline" onClick={exportDocx}>
            <FileDocIcon data-icon="inline-start" />
            {t("docx")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => download(new Blob([JSON.stringify(toVlab(session), null, 2)], { type: "application/json" }), `${tx("short")} #${session.seed}.vlab`)}
          >
            <DownloadSimpleIcon data-icon="inline-start" />
            {t("export")}
          </Button>
        </div>
      </div>

      <article className="report max-w-[80ch] border border-sheet-edge bg-white p-6 text-text-primary md:p-10 print:border-0 print:p-0">
        <h1 className="font-heading text-ds-heading-3">{model.title}</h1>
        {student && <p className="mt-1 text-ds-body-sm text-text-secondary">{student}</p>}
        <Section n={1} title={sections[0]!}>{model.date}</Section>
        <Section n={2} title={sections[1]!}>{model.title}</Section>
        <Section n={3} title={sections[2]!}>{model.aim}</Section>
        <Section n={4} title={sections[3]!}>
          <ul className="list-disc pl-5">
            {model.apparatus.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Section>
        <Section n={5} title={sections[4]!}>{Diagram ? <Diagram ref={diagramRef} className="h-auto w-full max-w-xl" /> : missing}</Section>
        <Section n={6} title={sections[5]!}>
          {model.theory.map((p) => (
            <Tex key={p}>{p}</Tex>
          ))}
        </Section>
        <Section n={7} title={sections[6]!}>
          {model.method.length ? (
            <ol className="list-decimal pl-5">
              {model.method.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ol>
          ) : (
            missing
          )}
        </Section>
        <Section n={8} title={sections[7]!}>
          {model.constants.map((c) => (
            <p key={c} className="figure">
              {c}
            </p>
          ))}
          <table className="figure mt-2 w-full border-collapse text-ds-mono-sm">
            <thead>
              <tr>
                {model.table.headers.map((h) => (
                  <th key={h} className="border border-sheet-edge px-2 py-1 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {model.table.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((c, j) => (
                    <td key={j} className="border border-sheet-edge px-2 py-1 text-right">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
        <Section n={9} title={sections[8]!}>
          {session.graph ? (
            <div id="report-graph">
              <GraphPaper graph={session.graph} squaresX={PAPER.squaresX} squaresY={PAPER.squaresY} points={analysis.context.points} ariaLabel={session.graph.title} />
            </div>
          ) : (
            missing
          )}
        </Section>
        <Section n={10} title={sections[9]!}>
          {model.calculation.map((c, i) => (
            <p key={i} className="figure text-ds-mono-sm">
              {c}
            </p>
          ))}
        </Section>
        <Section n={11} title={sections[10]!}>{model.discussion ? model.discussion.split(/\n+/).map((p, i) => <p key={i} className="mb-2">{p}</p>) : missing}</Section>
        <Section n={12} title={sections[11]!}>{model.precautions.length ? <ul className="list-disc pl-5">{model.precautions.map((p) => <li key={p}>{p}</li>)}</ul> : missing}</Section>
        <Section n={13} title={sections[12]!}>{model.sourcesOfError.length ? <ul className="list-disc pl-5">{model.sourcesOfError.map((p) => <li key={p}>{p}</li>)}</ul> : missing}</Section>
        <Section n={14} title={sections[13]!}>{model.conclusion || missing}</Section>
        <Section n={15} title={sections[14]!}>
          <ul className="list-disc pl-5">
            {model.references.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Section>
        <p className="mt-10 text-ds-body-xs text-text-muted">{model.footer}</p>
      </article>
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid-page">
      <h3 className="mt-6 mb-2 text-ds-heading-5">
        {n}. {title}
      </h3>
      <div className="text-ds-body-md text-text-secondary">{children}</div>
    </section>
  );
}
