import { describe, expect, test } from "bun:test";

import { MESSAGES_EN } from "@/experiments/messages";
import { SETUPS } from "@/experiments/setups";

import { nets, wrongTerminals } from "./setup";

const series = SETUPS.slinky!.circuit!;

describe("circuit checking by nets", () => {
  test("the reference wiring is correct", () => {
    expect(wrongTerminals(series, series.wires)).toEqual([]);
  });
  test("the same circuit wired in another order is accepted", () => {
    expect(wrongTerminals(series, [["load2", "psu-"], ["am-", "load1"], ["rh1", "psu+"], ["am+", "rh2"]])).toEqual([]);
  });
  test("an ammeter connected the wrong way round is caught", () => {
    const wrong = wrongTerminals(series, [["psu+", "rh1"], ["rh2", "am-"], ["am+", "load1"], ["load2", "psu-"]]);
    expect(wrong).toEqual(expect.arrayContaining(["am+", "am-"]));
  });
  test("an ammeter across the load (in parallel) is caught", () => {
    const wrong = wrongTerminals(series, [["psu+", "rh1"], ["rh2", "load1"], ["load2", "psu-"], ["am+", "load1"], ["am-", "load2"]]);
    expect(wrong.length).toBeGreaterThan(0);
  });
  test("nets join terminals through shared wires", () => {
    const m = nets(["a", "b", "c", "d"], [["a", "b"], ["b", "c"]]);
    expect(m.get("a")).toBe(m.get("c"));
    expect(m.get("a")).not.toBe(m.get("d"));
  });
});

describe("set-up text exists for every practical", () => {
  const msgs = MESSAGES_EN as unknown as {
    apparatus: Record<string, { name?: string; what?: string }>;
    experiments: Record<string, { setup?: { why?: Record<string, string>; hints?: Record<string, string> } }>;
  };
  for (const [id, spec] of Object.entries(SETUPS)) {
    test(id, () => {
      for (const item of spec.items) {
        expect(msgs.apparatus[item.id]?.name, `apparatus.${item.id}.name`).toBeTruthy();
        expect(msgs.apparatus[item.id]?.what, `apparatus.${item.id}.what`).toBeTruthy();
        if (!item.needed) expect(msgs.experiments[id]?.setup?.why?.[item.id], `${id} why ${item.id}`).toBeTruthy();
      }
      for (const part of spec.circuit?.parts ?? []) expect(spec.items.find((i) => i.id === part.item)?.needed).toBe(true);
      for (const hint of Object.values(spec.circuit?.hints ?? {})) expect(msgs.experiments[id]?.setup?.hints?.[hint], `${id} hint ${hint}`).toBeTruthy();
    });
  }
});
