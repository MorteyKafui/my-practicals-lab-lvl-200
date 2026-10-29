"use client";

import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import type { Finding } from "@/core/feedback";
import { newRowId, unitOf, type Session, type TableRow } from "@/core/session";
import type { ColumnSpec, ExperimentDefinition } from "@/experiments/types";
import { cn } from "@/lib/utils";

import { useBench } from "./bench-store";
import type { WorkspaceContextValue } from "./workspace";

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, TableRow>();

/** Severity of the worst finding pointing at a cell, if any. */
function cellMark(findings: readonly Finding[], rowId: string, columnId: string) {
  const hits = findings.filter((f) => f.rows?.includes(rowId) && (!f.column || f.column === columnId) && f.severity !== "good");
  if (hits.some((f) => f.severity === "error")) return "error";
  if (hits.length) return "warning";
  return undefined;
}

export function ObservationTable({
  ctx,
  definition,
  findings,
}: {
  ctx: WorkspaceContextValue;
  definition: ExperimentDefinition;
  findings: readonly Finding[];
}) {
  const t = useTranslations("workspace.observations");
  const { session, update, act } = ctx;

  const columns = useMemo(
    () =>
      helper.columns([
        helper.display({
          id: "n",
          header: () => <span className="sr-only">Row</span>,
          cell: (info) => <span className="figure text-ds-mono-xs text-text-muted">{info.row.index + 1}</span>,
        }),
        ...definition.columns.map((col) =>
          helper.accessor((row: TableRow) => row.cells[col.id] ?? "", {
            id: col.id,
            header: () => <ColumnHeader column={col} session={session} onUnit={(unit) => update((s) => ({ ...s, units: { ...s.units, [col.id]: unit } }))} />,
            cell: (info) => {
              const row = info.row.original;
              const mark = cellMark(findings, row.id, col.id);
              return (
                <input
                  aria-label={`${col.symbol}, row ${info.row.index + 1}`}
                  inputMode="decimal"
                  autoComplete="off"
                  value={row.cells[col.id] ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    update((s) => ({
                      ...s,
                      rows: s.rows.map((r) => (r.id === row.id ? { ...r, cells: { ...r.cells, [col.id]: value } } : r)),
                    }));
                  }}
                  onBlur={(e) => {
                    const typed = e.target.value.trim();
                    if (session.mode !== "perform" || col.source !== "measured" || typed === "") return;
                    const bench = useBench.getState();
                    act({
                      kind: "record",
                      detail: {
                        column: col.symbol,
                        typed,
                        bridgeCm: bench.bridgeCm,
                        lastThrownCm: bench.lastThrown?.bridgeCm ?? -1,
                        view: bench.view,
                      },
                    });
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    const next = document.querySelector<HTMLInputElement>(
                      `[data-cell="${col.id}:${info.row.index + 1}"]`,
                    );
                    next?.focus();
                  }}
                  data-cell={`${col.id}:${info.row.index}`}
                  className={cn(
                    "figure h-9 w-full min-w-[84px] border border-transparent bg-transparent px-2 text-right text-ds-mono-sm outline-none focus:border-ring focus:bg-sheet",
                    col.source === "derived" && "bg-well",
                    mark === "error" && "border-negative",
                    mark === "warning" && "border-ds-amber-400",
                  )}
                />
              );
            },
          }),
        ),
        helper.display({
          id: "remove",
          header: () => <span className="sr-only">{t("removeRow")}</span>,
          cell: (info) => (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`${t("removeRow")} ${info.row.index + 1}`}
              onClick={() => update((s) => ({ ...s, rows: s.rows.filter((r) => r.id !== info.row.original.id) }))}
            >
              <XIcon />
            </Button>
          ),
        }),
      ]),
    [definition.columns, findings, session, update, act, t],
  );

  const table = useTable({ features, columns, data: session.rows });

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-ds-body-sm">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="border-b border-sheet-edge">
                {group.headers.map((header) => (
                  <th key={header.id} scope="col" className="px-2 py-2 text-right align-bottom font-normal text-text-muted first:w-8 last:w-8">
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b border-rule">
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} className="p-0 text-right first:pr-2">
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <Button variant="outline" size="sm" onClick={() => update((s) => ({ ...s, rows: [...s.rows, { id: newRowId(), cells: {} }] }))}>
          <PlusIcon data-icon="inline-start" />
          {t("addRow")}
        </Button>
      </div>
    </div>
  );
}

function ColumnHeader({ column, session, onUnit }: { column: ColumnSpec; session: Session; onUnit: (unit: string) => void }) {
  const t = useTranslations("workspace.observations");
  const unit = unitOf(session, column);
  return (
    <span className="flex flex-col items-end gap-0.5">
      {column.source === "derived" && <span className="text-[11px] text-text-muted">{t("derivedHint")}</span>}
      <span className="flex items-center gap-1 whitespace-nowrap text-text-primary">
        <span className="figure text-ds-mono-sm">{column.symbol}</span>
        {unit && <span className="text-text-muted">/</span>}
        {column.units.length > 1 ? (
          <select
            aria-label={`${t("unit")} ${column.symbol}`}
            value={unit}
            onChange={(e) => onUnit(e.target.value)}
            className="figure border-b border-dashed border-text-muted bg-transparent text-ds-mono-sm outline-none focus:border-ring"
          >
            {column.units.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        ) : (
          <span className="figure text-ds-mono-sm">{unit}</span>
        )}
      </span>
    </span>
  );
}
