import { expect, test } from "@playwright/test";

/** Every top-level page renders without console errors or warnings-as-errors (incl. with saved sessions). */
test("pages load cleanly", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  // Create a session so the home page lists "pick up where you left off".
  await page.goto("/experiments/stretched-wire");
  await page.getByRole("button", { name: /Bring your own data/ }).click();
  await expect(page).toHaveURL(/\?s=/);

  for (const path of ["/", "/experiments", "/apparatus", "/apparatus/sonometer", "/reference", "/settings"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Pick up where you left off/ })).toBeVisible();
  expect(errors.filter((e) => !/Download the React DevTools/.test(e))).toEqual([]);
});
