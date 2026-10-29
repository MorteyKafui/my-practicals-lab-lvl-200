"use client";

import { ArrowRightIcon, CheckCircleIcon, PlugsConnectedIcon, XCircleIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { createRng } from "@/core/random";
import { emptySetup, sameWire, wrongTerminals, type SetupSpec, type SetupState } from "@/core/setup";
import { cn } from "@/lib/utils";

import type { StageProps } from "../stage-view";

/** Do-it-yourself set-up: choose the apparatus from the shelf, then wire the circuit. */
export function SetupStage({ ctx, definition }: StageProps) {
  const t = useTranslations("workspace.setup");
  const tx = useTranslations(`experiments.${ctx.session.experimentId}.setup`);
  const ta = useTranslations("apparatus");
  const spec = definition.setup!;
  const state = ctx.session.setup ?? emptySetup();
  const [lastWrong, setLastWrong] = useState<string>();
  const [problems, setProblems] = useState<string[] | null>(null);

  // Shelf order is shuffled once per session (seeded), so it is not a giveaway list.
  const shelf = useMemo(() => {
    const rng = createRng(ctx.session.seed);
    return [...spec.items].map((item) => ({ item, k: rng() })).sort((a, b) => a.k - b.k).map((x) => x.item);
  }, [spec.items, ctx.session.seed]);

  const needed = spec.items.filter((i) => i.needed);
  const allPlaced = needed.every((i) => state.placed.includes(i.id));
  const setState = (patch: Partial<SetupState>) => ctx.update((s) => ({ ...s, setup: { ...(s.setup ?? emptySetup()), ...patch } }));

  const pick = (id: string) => {
    const item = spec.items.find((i) => i.id === id)!;
    ctx.act({ kind: "setup-pick", detail: { item: id, needed: item.needed } });
    if (!item.needed) {
      setLastWrong(id);
      return;
    }
    setLastWrong(undefined);
    const placed = state.placed.includes(id) ? state.placed : [...state.placed, id];
    const done = !spec.circuit && needed.every((i) => placed.includes(i.id));
    setState({ placed, done });
    if (done) ctx.act({ kind: "setup-check", detail: { ok: true } });
  };

  return (
    <div className="flex flex-col gap-8 px-4 py-6 md:px-6">
      <div>
        <h2 className="text-ds-heading-4">{t("title")}</h2>
        <p className="mt-1 max-w-[70ch] text-ds-body-sm text-text-secondary">{t("intro")}</p>
      </div>

      <section aria-labelledby="shelf" className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div>
          <h3 id="shelf" className="mb-1 text-ds-heading-5">
            {t("shelfTitle")}
          </h3>
          <p className="mb-3 text-ds-body-xs text-text-muted">{t("shelfHint")}</p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {shelf.map((item) => {
              const placed = state.placed.includes(item.id);
              const wrong = lastWrong === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={placed}
                    onClick={() => pick(item.id)}
                    className={cn(
                      "flex h-full min-h-16 w-full flex-col items-start gap-1 border p-3 text-left text-ds-body-sm transition-colors",
                      placed ? "border-data bg-status-success-bg text-text-muted" : "border-sheet-edge bg-sheet hover:border-text-primary",
                      wrong && "border-negative",
                    )}
                  >
                    <span className="flex w-full items-center gap-2 text-ds-label-md text-text-primary">
                      {placed && <CheckCircleIcon className="size-4 shrink-0 text-data" weight="fill" aria-label={t("onBench")} />}
                      {wrong && <XCircleIcon className="size-4 shrink-0 text-negative" weight="fill" aria-hidden />}
                      {ta(`${item.id}.name`)}
                    </span>
                    <span className="text-ds-body-xs text-text-muted">{ta(`${item.id}.what`)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div aria-live="polite" className="flex flex-col gap-3">
          <h3 className="text-ds-heading-5">{t("benchTitle")}</h3>
          {lastWrong && (
            <p className="border-l-2 border-negative bg-status-error-bg/40 p-3 text-ds-body-sm text-text-secondary">
              <span className="text-ds-label-md text-text-primary">{t("notNeeded", { item: ta(`${lastWrong}.name`) })}</span> {tx(`why.${lastWrong}`)}
            </p>
          )}
          <p className="text-ds-body-sm text-text-muted">{t("progress", { placed: state.placed.length, needed: needed.length })}</p>
          <ul className="flex flex-col">
            {state.placed.map((id) => (
              <li key={id} className="flex items-center gap-2 border-b border-rule py-1.5 text-ds-body-sm">
                <CheckCircleIcon className="size-4 text-data" weight="fill" aria-hidden />
                {ta(`${id}.name`)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {spec.circuit && allPlaced && (
        <Wiring
          spec={spec}
          state={state}
          problems={problems}
          onWires={(wires) => {
            setProblems(null);
            setState({ wires, done: false });
          }}
          onCheck={() => {
            const wrong = wrongTerminals(spec.circuit!, state.wires);
            const ok = wrong.length === 0;
            ctx.act({ kind: "setup-check", detail: { ok, wrong: wrong.length } });
            setProblems(ok ? [] : wrong);
            if (ok) setState({ done: true });
          }}
          experimentId={ctx.session.experimentId}
        />
      )}

      {state.done && (
        <div className="flex flex-wrap items-center gap-4 border-l-2 border-data bg-status-success-bg/50 p-4">
          <p className="text-ds-body-md text-text-primary">{t("ready")}</p>
          <Button onClick={() => ctx.goTo("measure")}>
            {t("goBench")}
            <ArrowRightIcon data-icon="inline-start" />
          </Button>
        </div>
      )}
    </div>
  );
}

const BOX_W = 150;
const BOX_H = 64;
const GAP_X = 40;
const GAP_Y = 70;
const PER_ROW = 3;

function Wiring({
  spec,
  state,
  problems,
  onWires,
  onCheck,
  experimentId,
}: {
  spec: SetupSpec;
  state: SetupState;
  problems: string[] | null;
  onWires: (wires: [string, string][]) => void;
  onCheck: () => void;
  experimentId: string;
}) {
  const t = useTranslations("workspace.setup");
  const tx = useTranslations(`experiments.${experimentId}.setup`);
  const ta = useTranslations("apparatus");
  const circuit = spec.circuit!;
  const [selected, setSelected] = useState<string>();

  const layout = useMemo(() => {
    const pos = new Map<string, { x: number; y: number }>();
    const boxes = circuit.parts.map((part, i) => {
      const x = 20 + (i % PER_ROW) * (BOX_W + GAP_X);
      const y = 20 + Math.floor(i / PER_ROW) * (BOX_H + GAP_Y);
      part.terminals.forEach((term, j) => {
        pos.set(term.id, { x: x + ((j + 1) * BOX_W) / (part.terminals.length + 1), y: y + BOX_H });
      });
      return { part, x, y };
    });
    const rows = Math.ceil(circuit.parts.length / PER_ROW);
    return { boxes, pos, width: 20 + PER_ROW * (BOX_W + GAP_X), height: 20 + rows * (BOX_H + GAP_Y) + 50 };
  }, [circuit.parts]);

  const owner = (terminal: string) => circuit.parts.find((p) => p.terminals.some((x) => x.id === terminal))!;
  const clickTerminal = (id: string) => {
    if (!selected) return setSelected(id);
    if (selected === id || owner(selected) === owner(id)) return setSelected(id === selected ? undefined : id);
    const wire: [string, string] = [selected, id];
    const exists = state.wires.some((w) => sameWire(w, wire));
    onWires(exists ? state.wires.filter((w) => !sameWire(w, wire)) : [...state.wires, wire]);
    setSelected(undefined);
  };

  const hintKeys = problems ? [...new Set(problems.map((p) => circuit.hints?.[p]).filter((h): h is string => Boolean(h)))] : [];
  const labelOf = (id: string) => {
    const part = owner(id);
    return `${ta(`${part.item}.name`)} ${part.terminals.find((x) => x.id === id)!.label}`;
  };

  return (
    <section aria-labelledby="wiring" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id="wiring" className="text-ds-heading-5">
            {t("wiringTitle")}
          </h3>
          <p className="max-w-[70ch] text-ds-body-xs text-text-muted">{t("wiringHint")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onWires([])} disabled={state.wires.length === 0}>
            {t("clear")}
          </Button>
          <Button size="sm" onClick={onCheck} disabled={state.wires.length === 0}>
            <PlugsConnectedIcon data-icon="inline-start" />
            {t("check")}
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto bg-well p-2">
        <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="h-auto w-full min-w-[520px] max-w-[760px]" role="group" aria-label={t("wiringTitle")}>
          {layout.boxes.map(({ part, x, y }) => (
            <g key={part.item}>
              <rect x={x} y={y} width={BOX_W} height={BOX_H} fill="#ffffff" stroke="#3e3529" />
              <text x={x + 8} y={y + 20} fontSize="12" fill="#111">
                {ta(`${part.item}.name`)}
              </text>
            </g>
          ))}
          {state.wires.map(([a, b]) => {
            const p = layout.pos.get(a);
            const q = layout.pos.get(b);
            if (!p || !q) return null;
            const sag = 40 + Math.abs(p.x - q.x) * 0.08;
            return (
              <path
                key={`${a}-${b}`}
                d={`M${p.x} ${p.y} C${p.x} ${p.y + sag} ${q.x} ${q.y + sag} ${q.x} ${q.y}`}
                fill="none"
                stroke={problems?.length && (problems.includes(a) || problems.includes(b)) ? "#b8321a" : "#2c5f9e"}
                strokeWidth={2.5}
                className="cursor-pointer"
                onClick={() => onWires(state.wires.filter((w) => !sameWire(w, [a, b])))}
              >
                <title>{t("removeWire")}</title>
              </path>
            );
          })}
          {layout.boxes.flatMap(({ part }) =>
            part.terminals.map((term) => {
              const p = layout.pos.get(term.id)!;
              const isSel = selected === term.id;
              return (
                <g
                  key={term.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSel}
                  aria-label={labelOf(term.id)}
                  onClick={() => clickTerminal(term.id)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), clickTerminal(term.id))}
                  className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-[#3aa3c4]"
                >
                  <circle cx={p.x} cy={p.y} r={14} fill="transparent" />
                  <circle cx={p.x} cy={p.y} r={7} fill={isSel ? "#d3481b" : "#ffffff"} stroke="#111" strokeWidth={2} />
                  <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="11" fill="#3e3529">
                    {term.label}
                  </text>
                </g>
              );
            }),
          )}
        </svg>
      </div>
      {problems && (
        <div aria-live="polite" className={cn("border-l-2 p-3 text-ds-body-sm", problems.length ? "border-negative" : "border-data")}>
          {problems.length === 0 ? (
            <p className="text-text-primary">{t("ok")}</p>
          ) : (
            <>
              <p className="text-ds-label-md text-text-primary">{t("wrong")}</p>
              {hintKeys.length > 0 ? (
                <ul className="mt-1 list-disc pl-5 text-text-secondary">
                  {hintKeys.map((k) => (
                    <li key={k}>{tx(`hints.${k}`)}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-text-secondary">{t("generic", { list: problems.slice(0, 4).map(labelOf).join(", ") })}</p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
