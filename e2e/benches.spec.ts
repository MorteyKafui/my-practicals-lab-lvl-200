import { expect, test } from "@playwright/test";

import { CATALOGUE } from "../experiments/catalogue";

/** Every ready practical: the bench renders, its controls work, and nothing logs an error. */
for (const entry of CATALOGUE.filter((e) => e.status === "ready")) {
  test(`${entry.id}: bench renders and toggles without errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

    await page.goto(`/experiments/${entry.id}`);
    await page.getByRole("button", { name: /Perform it on the bench/ }).click();
    await page.getByRole("button", { name: /Go to the bench/ }).click();
    await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[aria-live="polite"]').first()).not.toBeEmpty();

    const labels = page.getByRole("button", { name: "Show labels" });
    if (await labels.count()) await labels.click();
    const eye = page.getByRole("button", { name: /^Eye level/ });
    if (await eye.count()) {
      await eye.click();
      await page.getByRole("button", { name: "Bench view" }).click();
    }
    const stages = page.getByRole("navigation", { name: "Stages" });
    await stages.getByRole("button", { name: /^Observations/ }).click();
    await stages.getByRole("button", { name: /^Measure/ }).click();
    await expect(page.locator("canvas")).toBeVisible();
    expect(errors.filter((e) => !/Download the React DevTools/.test(e))).toEqual([]);
  });
}
