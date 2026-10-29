import Link from "next/link";
import { useTranslations } from "next-intl";

import { CATALOGUE } from "@/experiments/catalogue";

export const metadata = { title: "Apparatus" };

/** Every instrument across the practicals, with the practicals that use it. */
export default function ApparatusPage() {
  const t = useTranslations("experiments");
  const byItem = new Map<string, string[]>();
  for (const entry of CATALOGUE) for (const item of entry.apparatus) byItem.set(item, [...(byItem.get(item) ?? []), entry.id]);
  const items = [...byItem.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="max-w-[1100px] px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-ds-heading-3">Apparatus</h1>
      <p className="mt-1 mb-8 text-ds-body-sm text-text-muted">
        {items.length} instruments across {CATALOGUE.length} practicals. Detailed, downloadable views of how each one works are being added practical by practical.
      </p>
      <ul className="border-t border-rule">
        {items.map(([item, ids]) => (
          <li key={item} className="grid gap-x-6 gap-y-1 border-b border-rule py-3 sm:grid-cols-[220px_1fr]">
            <span className="text-ds-label-md">{item}</span>
            <span className="flex flex-wrap gap-x-4 gap-y-1 text-ds-body-sm">
              {ids.map((id) => (
                <Link key={id} href={`/experiments/${id}`} className="text-text-secondary underline-offset-2 hover:text-text-primary hover:underline">
                  {t(`${id}.short`)}
                </Link>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
