import { HeartIcon } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";

import { ProductMark } from "./product-mark";

/** The closing band of every page: the product, and the people behind it. */
export function SiteFooter() {
  const t = useTranslations();
  const year = new Date().getFullYear();

  return (
    <footer className="no-print mt-auto border-t border-rule bg-well">
      <div className="flex flex-col gap-6 px-4 py-8 md:flex-row md:items-end md:justify-between md:px-8">
        <div className="flex items-center gap-3">
          <ProductMark className="size-9 shrink-0" />
          <div>
            <p className="font-heading text-ds-heading-5 text-text-primary">{t("app.name")}</p>
            <p className="text-ds-body-xs text-text-muted">{t("app.tagline")}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 text-ds-body-sm text-text-secondary md:items-end md:text-right">
          <p>
            {t.rich("footer.supervised", {
              name: (chunks) => <span className="font-medium text-text-primary">{chunks}</span>,
            })}
          </p>
          <p>
            {t.rich("footer.built", {
              heart: (chunks) => (
                <>
                  <HeartIcon weight="fill" className="inline-block size-4 align-[-3px] text-select" aria-hidden />
                  <span className="sr-only">{chunks}</span>
                </>
              ),
              name: (chunks) => <span className="font-medium text-text-primary">{chunks}</span>,
            })}
          </p>
        </div>
      </div>
      <p className="border-t border-rule px-4 py-3 text-ds-body-xs text-text-muted md:px-8">{t("footer.note", { year })}</p>
    </footer>
  );
}
