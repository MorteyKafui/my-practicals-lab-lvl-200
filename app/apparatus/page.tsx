import { CubeIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { FIGURES } from "@/anatomy/figures";
import { SETUPS } from "@/experiments/setups";

export const metadata = { title: "Apparatus" };

/** Every instrument the practicals use, what it is for, where it is used, and how it works. */
export default function ApparatusPage() {
  const t = useTranslations();
  const used = new Map<string, string[]>();
  for (const [experiment, spec] of Object.entries(SETUPS)) {
    for (const item of spec.items.filter((i) => i.needed)) used.set(item.id, [...(used.get(item.id) ?? []), experiment]);
  }
  const items = [...used.entries()].sort(([a], [b]) => t(`apparatus.${a}.name`).localeCompare(t(`apparatus.${b}.name`)));

  return (
    <div className="max-w-[1100px] px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-ds-heading-3">{t("nav.apparatus")}</h1>
      <p className="mt-1 mb-8 text-ds-body-sm text-text-muted">{t("apparatusPage.intro", { n: items.length, figures: Object.keys(FIGURES).length })}</p>
      <ul className="border-t border-rule">
        {items.map(([id, experiments]) => (
          <li key={id} className="grid gap-x-6 gap-y-1 border-b border-rule py-3 sm:grid-cols-[240px_1fr_auto]">
            <div>
              <p className="text-ds-label-md">{t(`apparatus.${id}.name`)}</p>
              <p className="text-ds-body-xs text-text-muted">{t(`apparatus.${id}.what`)}</p>
            </div>
            <span className="flex flex-wrap gap-x-4 gap-y-1 text-ds-body-sm">
              {experiments.map((e) => (
                <Link key={e} href={`/experiments/${e}`} className="text-text-secondary underline-offset-2 hover:text-text-primary hover:underline">
                  {t(`experiments.${e}.short`)}
                </Link>
              ))}
            </span>
            {FIGURES[id] && (
              <Link href={`/apparatus/${id}`} className="flex items-center gap-1.5 self-start text-ds-label-sm text-text-primary underline-offset-2 hover:underline">
                <CubeIcon className="size-4 text-data" aria-hidden />
                {t("apparatusPage.howItWorks")}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
