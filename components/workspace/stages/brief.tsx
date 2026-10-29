"use client";

import { WarningIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";

import { Tex } from "@/components/tex";

/** Aim, theory, apparatus, safety and method: everything a student reads before touching the bench. */
export function BriefContent({ experimentId }: { experimentId: string }) {
  const t = useTranslations("workspace.brief");
  const tx = useTranslations(`experiments.${experimentId}`);
  const has = (key: string) => tx.has(key);

  return (
    <div className="flex max-w-[75ch] flex-col gap-8">
      {has("theory") && (
        <section aria-labelledby="brief-theory">
          <h2 id="brief-theory" className="mb-2 text-ds-heading-5">
            {t("theory")}
          </h2>
          <div className="flex flex-col gap-2 text-ds-body-md text-text-secondary">
            {(tx.raw("theory") as string[]).map((p) => (
              <Tex key={p}>{p}</Tex>
            ))}
          </div>
        </section>
      )}

      {has("apparatus") && (
        <section aria-labelledby="brief-apparatus">
          <h2 id="brief-apparatus" className="mb-2 text-ds-heading-5">
            {t("apparatus")}
          </h2>
          <ul className="border-t border-rule">
            {Object.entries(tx.raw("apparatus") as Record<string, string>).map(([id, line]) => {
              const [name, ...rest] = line.split(": ");
              return (
                <li key={id} className="grid gap-x-6 border-b border-rule py-2 text-ds-body-sm sm:grid-cols-[180px_1fr]">
                  <span className="text-ds-label-md">{name}</span>
                  <span className="text-text-secondary">{rest.join(": ")}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {has("safety") && (
        <section aria-labelledby="brief-safety">
          <h2 id="brief-safety" className="mb-2 text-ds-heading-5">
            {t("safety")}
          </h2>
          <ul className="flex flex-col gap-2">
            {(tx.raw("safety") as string[]).map((line) => (
              <li key={line} className="flex gap-2 text-ds-body-sm text-text-secondary">
                <WarningIcon className="mt-0.5 size-4 shrink-0 text-ds-amber-500" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}

      {has("steps") && (
        <section aria-labelledby="brief-method">
          <h2 id="brief-method" className="mb-2 text-ds-heading-5">
            {t("method")}
          </h2>
          <ol className="list-decimal pl-5 text-ds-body-sm text-text-secondary marker:text-text-muted">
            {(tx.raw("steps") as string[]).map((step) => (
              <li key={step} className="py-1 pl-1">
                {step}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
