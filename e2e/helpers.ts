import { expect, type Page } from "@playwright/test";

import { SETUPS } from "../experiments/setups";
import en from "../messages/en.json";

const name = (item: string) => (en.apparatus as Record<string, { name: string }>)[item]!.name;

/** Do the set-up as a student would: pick every needed item, wire the reference circuit, check it. */
export async function completeSetup(page: Page, experimentId: string) {
  const spec = SETUPS[experimentId];
  if (!spec) return;
  await expect(page.getByRole("heading", { name: "Set up the apparatus" })).toBeVisible();
  for (const item of spec.items.filter((i) => i.needed)) {
    await page.getByRole("button", { name: new RegExp(`^${escape(name(item.id))}`) }).click();
  }
  if (spec.circuit) {
    const label = (terminal: string) => {
      const part = spec.circuit!.parts.find((p) => p.terminals.some((t) => t.id === terminal))!;
      return `${name(part.item)} ${part.terminals.find((t) => t.id === terminal)!.label}`;
    };
    for (const [a, b] of spec.circuit.wires) {
      await page.getByRole("button", { name: label(a), exact: true }).click();
      await page.getByRole("button", { name: label(b), exact: true }).click();
    }
    await page.getByRole("button", { name: "Check circuit" }).click();
    await expect(page.getByText("Your circuit is correct.")).toBeVisible();
  }
  await page.getByRole("button", { name: "Go to the bench" }).last().click();
}

/** Open a practical in perform mode and get to its bench. */
export async function openBench(page: Page, experimentId: string) {
  await page.goto(`/experiments/${experimentId}`);
  await page.getByRole("button", { name: /Perform it on the bench/ }).click();
  await page.getByRole("button", { name: /Go to the bench/ }).click();
  await completeSetup(page, experimentId);
  await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
