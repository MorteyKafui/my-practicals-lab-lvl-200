import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { CATALOGUE, type Topic } from "@/experiments/catalogue";
import { cn } from "@/lib/utils";

const TOPICS: Topic[] = ["waves", "acoustics", "electromagnetism"];

/** The practical catalogue as rows grouped by topic: what you do, what you plot, what you find. */
export function PracticalList() {
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-8">
      {TOPICS.map((topic) => {
        const entries = CATALOGUE.filter((e) => e.topic === topic);
        return (
          <section key={topic} aria-labelledby={`topic-${topic}`}>
            <h2 id={`topic-${topic}`} className="mb-2 text-ds-heading-5 text-text-secondary">
              {t(`home.topic.${topic}`)}
            </h2>
            <ul className="border-t border-rule">
              {entries.map((entry) => (
                <li key={entry.id} className="border-b border-rule">
                  <Link
                    href={`/experiments/${entry.id}`}
                    className="group grid gap-x-6 gap-y-1 py-4 outline-none focus-visible:bg-muted sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_220px_96px]"
                  >
                    <div className="min-w-0">
                      <p className="text-ds-label-md text-text-primary group-hover:underline">
                        {t(`experiments.${entry.id}.title`)}
                      </p>
                      <p className="mt-1 line-clamp-2 text-ds-body-sm text-text-muted">
                        {entry.apparatus.join(" · ")}
                      </p>
                    </div>
                    <div className="text-ds-body-sm text-text-secondary lg:text-right">
                      <span className="figure text-ds-mono-xs">
                        {entry.graph.y} vs {entry.graph.x}
                      </span>
                      <p className="text-ds-body-xs text-text-muted">→ {entry.determines}</p>
                    </div>
                    <div className="flex items-center gap-2 sm:col-start-2 sm:row-start-1 sm:justify-end lg:col-start-3">
                      <span
                        className={cn(
                          "px-2 py-0.5 text-[12px] font-medium whitespace-nowrap",
                          entry.status === "ready"
                            ? "bg-status-success-bg text-text-success"
                            : "bg-muted text-text-muted",
                        )}
                      >
                        {entry.status === "ready" ? t("home.ready") : t("home.comingSoon")}
                      </span>
                      <ArrowRightIcon className="size-4 text-text-muted group-hover:text-text-primary" aria-hidden />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
