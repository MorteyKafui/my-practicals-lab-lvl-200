import { expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import en from "@/messages/en.json";

/** Every feedback key a rule can emit must have a title and a detail in English. */
test("all feedback keys have messages", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith(".ts") && !name.endsWith(".test.ts")) files.push(path);
    }
  };
  walk("core");
  walk("experiments");

  // Matches key: "group.name" and the two branches of key: cond ? "a.b" : "c.d".
  const keys = new Set<string>();
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const m of source.matchAll(/key:[^,\n]*/g)) {
      for (const k of m[0].matchAll(/"([a-z]+\.[A-Za-z]+)"/g)) keys.add(k[1]!);
    }
  }
  expect(keys.size).toBeGreaterThan(30);

  const feedback = en.feedback as unknown as Record<string, Record<string, { title?: string; detail?: string }>>;
  const missing = [...keys].filter((k) => {
    const [group, name] = k.split(".") as [string, string];
    const entry = feedback[group]?.[name];
    return !entry?.title || !entry.detail;
  });
  expect(missing).toEqual([]);
});
