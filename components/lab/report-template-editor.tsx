"use client";

import { ArrowDownIcon, ArrowUpIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolveTemplate, type TemplateSection } from "@/core/report";
import { usePref, writePref } from "@/lib/prefs";

const KEY = "report-template";

/** Rename, reorder or hide report sections so the report matches a school's own format. */
export function ReportTemplateEditor() {
  const t = useTranslations("settings.report");
  const defaults = useTranslations().raw("reportSections") as string[];
  const saved = usePref<TemplateSection[]>(KEY);
  const template = useMemo(() => resolveTemplate(saved, defaults), [saved, defaults]);
  const save = (next: TemplateSection[]) => writePref(KEY, next);
  const patch = (i: number, p: Partial<TemplateSection>) => save(template.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const move = (i: number, by: -1 | 1) => {
    const next = [...template];
    const [s] = next.splice(i, 1);
    next.splice(i + by, 0, s!);
    save(next);
  };
  let n = 0;

  return (
    <div className="flex flex-col gap-3">
      <ol className="border-t border-rule">
        {template.map((section, i) => {
          const number = section.include ? ++n : undefined;
          return (
            <li key={section.id} className="flex items-center gap-2 border-b border-rule py-1.5">
              <span className="figure w-6 text-right text-ds-mono-xs text-text-muted">{number ?? "—"}</span>
              <input
                type="checkbox"
                checked={section.include}
                onChange={(e) => patch(i, { include: e.target.checked })}
                aria-label={t("include", { title: section.title })}
                className="size-4 accent-[var(--data)]"
              />
              <Input value={section.title} onChange={(e) => patch(i, { title: e.target.value })} aria-label={t("rename", { n: i + 1 })} className="h-8 flex-1" />
              <Button size="icon-sm" variant="ghost" aria-label={t("up", { title: section.title })} disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUpIcon />
              </Button>
              <Button size="icon-sm" variant="ghost" aria-label={t("down", { title: section.title })} disabled={i === template.length - 1} onClick={() => move(i, 1)}>
                <ArrowDownIcon />
              </Button>
            </li>
          );
        })}
      </ol>
      <div>
        <Button variant="outline" size="sm" onClick={() => writePref(KEY, null)}>
          {t("reset")}
        </Button>
      </div>
    </div>
  );
}
