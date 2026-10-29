"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createRng } from "@/core/random";
import { mark, makeQuestion, type Marked } from "@/core/sigfig-questions";
import { cn } from "@/lib/utils";

/** Interactive practice on the significant-figure rules, marked by the same parser as the lab. */
export function SigFigTrainer() {
  const t = useTranslations("reference.trainer");
  const [seed, setSeed] = useState(20261029);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<Marked>();
  const [score, setScore] = useState({ right: 0, total: 0 });
  const q = useMemo(() => makeQuestion(createRng(seed + index * 7919)), [seed, index]);

  const prompt =
    q.kind === "count"
      ? t("count", { number: q.number })
      : q.kind === "round"
        ? t("round", { value: String(q.value), n: q.n })
        : t("record", { instrument: q.instrument, truth: String(q.truth), unit: q.unit });

  const submit = () => {
    if (result || answer.trim() === "") return;
    const r = mark(q, answer);
    setResult(r);
    setScore((s) => ({ right: s.right + (r.correct ? 1 : 0), total: s.total + 1 }));
  };
  const next = () => {
    setIndex((i) => i + 1);
    setAnswer("");
    setResult(undefined);
  };

  return (
    <section aria-labelledby="trainer" className="flex flex-col gap-3 bg-well p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="trainer" className="text-ds-heading-5">
          {t("title")}
        </h2>
        <span className="figure text-ds-mono-xs text-text-muted">{t("score", score)}</span>
      </div>
      <p className="text-ds-body-md">{prompt}</p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (result) next();
          else submit();
        }}
      >
        <Input value={answer} onChange={(e) => setAnswer(e.target.value)} disabled={Boolean(result)} inputMode="decimal" aria-label={t("answer")} className="figure w-40" />
        <Button type="submit">{result ? t("next") : t("check")}</Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setSeed(Math.floor(Math.random() * 1e9));
            next();
          }}
        >
          {t("shuffle")}
        </Button>
      </form>
      {result && (
        <p aria-live="polite" className={cn("border-l-2 p-3 text-ds-body-sm", result.correct ? "border-data" : "border-negative")}>
          <span className="text-ds-label-md">{result.correct ? t("right") : t("wrong", { answer: String(q.answer) })}</span> {t(`why.${result.why}`)}
        </p>
      )}
    </section>
  );
}
