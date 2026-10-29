import { expect, test, type Page } from "@playwright/test";

import { openBench } from "./helpers";

/** A careful student's sonometer readings (load 4.0 kg), as they would bring them from a real lab. */
const CSV = `f,l1,l2
256,44.1,44.3
288,39.2,39.4
320,35.3,35.5
341.3,33.1,33.3
384,29.4,29.6
426.7,26.5,26.7
480,23.5,23.7
512,22.0,22.2`;

async function startBringMode(page: Page) {
  await page.goto("/experiments/stretched-wire");
  await page.getByRole("button", { name: /Bring your own data/ }).click();
  await expect(page).toHaveURL(/\?s=/);
}

test("bring-your-data: observations → graph → calculate → feedback unlocks compare → report", async ({ page }) => {
  await startBringMode(page);
  await page.getByRole("button", { name: /Enter your data/ }).click();

  // Observations: load, CSV import, then the student's own derived columns.
  await page.getByLabel("Load M (hanger + masses)").fill("4.0");
  await page.locator('input[type="file"]').setInputFiles({ name: "readings.csv", mimeType: "text/csv", buffer: Buffer.from(CSV) });
  await expect(page.getByText("8 rows imported")).toBeVisible();
  const rows = CSV.split("\n").slice(1).map((r) => r.split(",").map(Number));
  for (const [i, [, l1, l2]] of rows.entries()) {
    const l = (l1! + l2!) / 2;
    await page.locator(`[data-cell="l:${i}"]`).fill(l.toFixed(2));
    await page.locator(`[data-cell="invL:${i}"]`).fill((100 / l).toFixed(3));
  }
  await expect(page.getByText(/don't follow from your readings/)).toHaveCount(0);

  // Compare is locked from the start.
  const compare = page.getByRole("navigation", { name: "Stages" }).getByRole("button", { name: /^Compare/ });
  await expect(compare).toBeDisabled();

  // Graph: title, labels, scales, line, triangle.
  await page.getByRole("navigation", { name: "Stages" }).getByRole("button", { name: /^Graph/ }).click();
  await page.getByLabel("Graph title").fill("Graph of frequency f against 1/l");
  const label = page.getByLabel("Label");
  await label.nth(0).fill("1/l / m⁻¹");
  await label.nth(1).fill("f / Hz");
  const perSquare = page.getByLabel("Per large square");
  await perSquare.nth(0).fill("0.5");
  await perSquare.nth(0).press("Enter");
  await perSquare.nth(1).fill("100");
  await perSquare.nth(1).press("Enter");
  await page.getByRole("button", { name: "Draw a line" }).click();
  await page.getByRole("button", { name: "Mark triangle" }).click();
  await expect(page.getByRole("slider", { name: "Line start" })).toBeVisible();
  await expect(page.getByText(/Your graph needs a title/)).toHaveCount(0);

  // Calculate: type the slope from the triangle shown.
  await page.getByRole("navigation", { name: "Stages" }).getByRole("button", { name: /^Calculate/ }).click();
  const tri = await page.getByText(/From your triangle/).innerText();
  const [, dy, dx] = /Δy = ([\d.-]+), Δx = ([\d.-]+)/.exec(tri)!;
  await page.getByLabel(/Slope of your line/).fill((Number(dy) / Number(dx)).toPrecision(3));
  await expect(page.getByText("Your slope matches your graph")).toBeVisible();

  // Feedback must be read before Compare opens.
  await expect(compare).toBeDisabled();
  await page.getByRole("navigation", { name: "Stages" }).getByRole("button", { name: /^Feedback/ }).click();
  await expect(page.getByRole("heading", { name: "Feedback", level: 2 })).toBeVisible();
  await expect(compare).toBeEnabled();
  await compare.click();
  await expect(page.getByRole("columnheader", { name: "Your result" })).toBeVisible();

  // Report: all 15 sections in order.
  await page.getByRole("navigation", { name: "Stages" }).getByRole("button", { name: /^Report/ }).click();
  const headings = await page.locator("article.report h3").allInnerTexts();
  expect(headings).toEqual([
    "1. Date",
    "2. Title",
    "3. Aim",
    "4. Apparatus",
    "5. Diagram",
    "6. Theory",
    "7. Method",
    "8. Observations",
    "9. Graph",
    "10. Calculation",
    "11. Discussion",
    "12. Precautions",
    "13. Sources of error",
    "14. Conclusion",
    "15. References",
  ]);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download Word/ }).click();
  expect((await download).suggestedFilename()).toMatch(/\.docx$/);
});

test("perform mode renders the 3D bench and logs bench actions", async ({ page }) => {
  await openBench(page, "stretched-wire");
  await page.getByLabel("Total load on the wire").selectOption("4");
  await page.getByRole("button", { name: "Place rider at middle" }).click();
  await page.getByRole("button", { name: "256", exact: true }).click();
  await page.getByRole("button", { name: "Strike on rubber pad" }).click();
  await page.getByRole("tab", { name: "Lab log" }).click();
  await expect(page.getByText("256 Hz fork struck on the rubber pad")).toBeVisible();
  await expect(page.getByText("Load set to 4 kg")).toBeVisible();
});

test("small screens are advised, never blocked", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto("/");
  await expect(page.getByRole("dialog", { name: /best on a bigger screen/ })).toBeVisible();
  await page.getByRole("button", { name: "Continue on this device" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("works offline after the first visit", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Wait until the precache has finished installing and controls the page.
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.goto("/experiments/stretched-wire");
  await expect(page.getByRole("heading", { name: /Resonant frequency of a stretched wire/ })).toBeVisible();
  await context.setOffline(false);
});

test("bench survives toggling labels, views and leaving the stage without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await openBench(page, "stretched-wire");
  const labels = page.getByRole("button", { name: "Show labels" });
  for (let i = 0; i < 2; i++) {
    await labels.click();
    await page.getByRole("button", { name: "Eye level at bridge" }).click();
    await page.getByRole("button", { name: "Bench view" }).click();
  }
  const stages = page.getByRole("navigation", { name: "Stages" });
  await stages.getByRole("button", { name: /^Observations/ }).click();
  await stages.getByRole("button", { name: /^Measure/ }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await stages.getByRole("button", { name: /^Brief/ }).click();
  await page.waitForTimeout(500);
  expect(errors.filter((e) => !/Download the React DevTools/.test(e))).toEqual([]);
});

test("observation cells keep focus while typing several characters", async ({ page }) => {
  await startBringMode(page);
  await page.getByRole("button", { name: /Enter your data/ }).click();
  const f = page.locator('[data-cell="f:0"]');
  await f.click();
  await page.keyboard.type("256", { delay: 40 });
  await expect(f).toHaveValue("256");
  await page.keyboard.press("Enter");
  await page.keyboard.type("288", { delay: 40 });
  await expect(page.locator('[data-cell="f:1"]')).toHaveValue("288");
  const l1 = page.locator('[data-cell="l1:0"]');
  await l1.click();
  await page.keyboard.type("44.15", { delay: 40 });
  await expect(l1).toHaveValue("44.15");
});

test("set-up explains wrong picks and wrong wiring before the bench unlocks", async ({ page }) => {
  await page.goto("/experiments/slinky");
  await page.getByRole("button", { name: /Perform it on the bench/ }).click();
  const stages = page.getByRole("navigation", { name: "Stages" });
  await expect(stages.getByRole("button", { name: /^Measure/ })).toBeDisabled();
  await page.getByRole("button", { name: /Go to the bench/ }).click();
  await page.getByRole("button", { name: /^Voltmeter/ }).click();
  await expect(page.getByText(/Voltmeter is not needed here/)).toBeVisible();
  for (const item of ["Slinky", "DC power supply", "Rheostat", "DC ammeter", "Hall probe and teslameter", "Metre rule"]) {
    await page.getByRole("button", { name: new RegExp(`^${item}`) }).click();
  }
  // Ammeter the wrong way round.
  for (const [a, b] of [["DC power supply +", "Rheostat 1"], ["Rheostat 2", "DC ammeter −"], ["DC ammeter +", "Slinky end A"], ["Slinky end B", "DC power supply −"]]) {
    await page.getByRole("button", { name: a, exact: true }).click();
    await page.getByRole("button", { name: b, exact: true }).click();
  }
  await page.getByRole("button", { name: "Check circuit" }).click();
  await expect(page.getByText(/An ammeter goes in series/)).toBeVisible();
  await expect(stages.getByRole("button", { name: /^Measure/ })).toBeDisabled();
});
