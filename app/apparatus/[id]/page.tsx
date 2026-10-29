import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { FIGURES } from "@/anatomy/figures";
import { AnatomyView } from "@/components/lab/anatomy-view";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(FIGURES).map((id) => ({ id }));
}

export async function generateMetadata({ params }: PageProps<"/apparatus/[id]">) {
  const { id } = await params;
  const t = await getTranslations("apparatus");
  return { title: t(`${id}.name`) };
}

export default async function ApparatusFigurePage({ params }: PageProps<"/apparatus/[id]">) {
  const { id } = await params;
  const figure = FIGURES[id];
  if (!figure) notFound();
  const t = await getTranslations();
  return (
    <div className="max-w-[1100px] px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-ds-heading-3">{t(`apparatus.${id}.name`)}</h1>
      <p className="mt-1 mb-6 text-ds-body-sm text-text-muted">{t(`apparatus.${id}.what`)}</p>
      <AnatomyView figure={figure} title={t(`apparatus.${id}.name`)} />
    </div>
  );
}
