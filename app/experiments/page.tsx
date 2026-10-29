import { useTranslations } from "next-intl";

import { PracticalList } from "@/components/lab/practical-list";

export const metadata = { title: "Experiments" };

export default function ExperimentsPage() {
  const t = useTranslations();
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6 md:px-8 md:py-8">
      <h1 className="mb-8 text-ds-heading-3">{t("nav.experiments")}</h1>
      <PracticalList />
    </div>
  );
}
