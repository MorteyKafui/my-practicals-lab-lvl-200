"use client";

import { UploadSimpleIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { newRowId } from "@/core/session";

import { FindingItem } from "../finding-item";
import { ObservationTable } from "../observation-table";
import type { StageProps } from "../stage-view";

export function ObservationsStage({ ctx, definition, analysis }: StageProps) {
  const t = useTranslations("workspace.observations");
  const { session, update } = ctx;
  const fileRef = useRef<HTMLInputElement>(null);
  const findings = analysis.findings.filter((f) => f.stage === "observations");

  const importCsv = async (file: File) => {
    const lines = (await file.text()).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const header = lines[0]!.split(/[,;\t]/).map((h) => h.trim().toLowerCase());
    const known = definition.columns.map((c) => ({ c, keys: [c.id.toLowerCase(), c.symbol.toLowerCase()] }));
    const mapping = header.map((h) => known.find((k) => k.keys.some((key) => h === key || h.startsWith(`${key} `) || h.startsWith(`${key}/`)))?.c.id);
    const hasHeader = mapping.some(Boolean);
    const order = hasHeader ? mapping : definition.columns.filter((c) => c.source !== "derived").map((c) => c.id);
    const body = hasHeader ? lines.slice(1) : lines;
    const rows = body.map((line) => {
      const cells: Record<string, string> = {};
      line.split(/[,;\t]/).forEach((value, i) => {
        const id = order[i];
        if (id) cells[id] = value.trim();
      });
      return { id: newRowId(), cells };
    });
    update((s) => ({ ...s, rows }));
    toast.success(`${rows.length} rows imported`);
  };

  return (
    <div className="flex flex-col gap-8 px-4 py-6 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-ds-heading-4">{t("title")}</h2>
        {session.mode === "bring" && (
          <>
            <input ref={fileRef} type="file" accept=".csv,text/csv,.txt" hidden onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <UploadSimpleIcon data-icon="inline-start" />
              {t("importCsv")}
            </Button>
          </>
        )}
      </div>

      {session.mode === "bring" && (
        <label className="flex max-w-xl flex-col gap-1 text-ds-body-sm">
          <span className="text-ds-label-sm text-text-secondary">{t("source")}</span>
          <Input value={session.source ?? ""} placeholder={t("sourcePlaceholder")} onChange={(e) => update((s) => ({ ...s, source: e.target.value }))} />
        </label>
      )}

      <ConstantsFields ctx={ctx} definition={definition} />

      <ObservationTable ctx={ctx} definition={definition} findings={analysis.findings} />

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

export function ConstantsFields({ ctx, definition }: Pick<StageProps, "ctx" | "definition">) {
  const t = useTranslations("workspace.observations");
  const { session, update } = ctx;
  if (definition.constants.length === 0) return null;
  return (
    <fieldset className="flex flex-wrap gap-6">
      <legend className="mb-2 text-ds-label-sm text-text-secondary">{t("constants")}</legend>
      {definition.constants.map((c) => {
        const unit = session.constantUnits[c.id] ?? c.units[0]!;
        return (
          <label key={c.id} className="flex items-center gap-2 text-ds-body-sm">
            <span className="figure">{c.symbol} =</span>
            <Input
              className="figure w-24 text-right"
              inputMode="decimal"
              aria-label={c.id === "load" ? t("load") : c.symbol}
              value={session.constants[c.id] ?? ""}
              onChange={(e) => update((s) => ({ ...s, constants: { ...s.constants, [c.id]: e.target.value } }))}
            />
            {c.units.length > 1 ? (
              <select
                aria-label={`${t("unit")} ${c.symbol}`}
                value={unit}
                onChange={(e) => update((s) => ({ ...s, constantUnits: { ...s.constantUnits, [c.id]: e.target.value } }))}
                className="figure border-b border-dashed border-text-muted bg-transparent text-ds-mono-sm outline-none"
              >
                {c.units.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            ) : (
              <span className="figure text-ds-mono-sm text-text-muted">{unit}</span>
            )}
            {c.id === "load" && <span className="text-ds-body-xs text-text-muted">{t("load")}</span>}
          </label>
        );
      })}
    </fieldset>
  );
}
