"use client";

import { create } from "zustand";

/**
 * Live state of the bench that isn't part of the saved record: where the bridge is right now,
 * which view the student is using, the last time the rider was thrown. The notebook reads it
 * so a typed reading can be compared with what the instrument actually showed.
 */
export interface BenchState {
  bridgeCm: number;
  view: "bench" | "eye";
  lastThrown?: { f: number; bridgeCm: number; at: number };
  set: (patch: Partial<Omit<BenchState, "set">>) => void;
}

export const useBench = create<BenchState>((set) => ({
  bridgeCm: 30,
  view: "bench",
  set: (patch) => set(patch),
}));
