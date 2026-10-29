import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { Workspace } from "@/components/workspace/workspace";
import { CATALOGUE, getCatalogueEntry } from "@/experiments/catalogue";

export const dynamicParams = false;

export function generateStaticParams() {
  return CATALOGUE.map((entry) => ({ id: entry.id }));
}

export async function generateMetadata({ params }: PageProps<"/experiments/[id]">) {
  const { id } = await params;
  const t = await getTranslations(`experiments.${id}`);
  return { title: t("short") };
}

export default async function ExperimentPage({ params }: PageProps<"/experiments/[id]">) {
  const { id } = await params;
  if (!getCatalogueEntry(id)) notFound();
  // The session id lives in ?s=… (static export has no per-session routes), so the workspace is client-side.
  return (
    <Suspense fallback={<div className="h-64" aria-busy />}>
      <Workspace experimentId={id} />
    </Suspense>
  );
}
