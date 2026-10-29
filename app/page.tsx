import { LockSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";

import { PracticalList } from "@/components/lab/practical-list";
import { CATALOGUE } from "@/experiments/catalogue";

const LOOP = ["brief", "measure", "observations", "graph", "calculate", "feedback", "compare", "report"] as const;

export default function HomePage() {
  const t = useTranslations();
  const ready = CATALOGUE.filter((e) => e.status === "ready").length;

  return (
    <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-6 md:px-8 md:py-8 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
        <h1 className="text-ds-heading-3">{t("home.title")}</h1>
        <p className="mt-1 mb-8 text-ds-body-sm text-text-muted">
          {t("home.subtitle", { ready, total: CATALOGUE.length })}
        </p>
        <PracticalList />
      </div>

      <aside className="flex flex-col gap-8 xl:pt-[72px]">
        <section aria-labelledby="modes">
          <h2 id="modes" className="mb-3 text-ds-heading-5">
            {t("home.modesTitle")}
          </h2>
          <dl className="flex flex-col gap-4 bg-well p-5">
            <div>
              <dt className="text-ds-label-md">{t("home.modePerform")}</dt>
              <dd className="mt-1 text-ds-body-sm text-text-secondary">{t("home.modePerformBody")}</dd>
            </div>
            <div>
              <dt className="text-ds-label-md">{t("home.modeBring")}</dt>
              <dd className="mt-1 text-ds-body-sm text-text-secondary">{t("home.modeBringBody")}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="loop">
          <h2 id="loop" className="mb-3 text-ds-heading-5">
            {t("home.loopTitle")}
          </h2>
          <ol className="flex flex-col">
            {LOOP.map((stage) => (
              <li key={stage} className="flex items-center gap-3 border-b border-rule py-2 text-ds-body-sm">
                <span className="size-1.5 bg-data" aria-hidden />
                <span className="flex-1">{t(`stages.${stage}`)}</span>
                {stage === "compare" && <LockSimpleIcon className="size-4 text-text-muted" aria-label={t("stages.locked")} />}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-ds-body-xs text-text-muted">{t("home.lockedNote")}</p>
        </section>
      </aside>
    </div>
  );
}
