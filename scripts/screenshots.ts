/**
 * Capture the main screens for design review: `bun scripts/screenshots.ts [outDir]`.
 * Needs the static build served on :4173 (`bun run preview`).
 */
import { chromium } from "@playwright/test";

const out = process.argv[2] ?? ".taste-skill/inspect/app";
const base = "http://localhost:4173";

const browser = await chromium.launch({ channel: "chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["phone", { width: 390, height: 844 }],
] as const) {
  const page = await browser.newPage({ viewport });
  await page.addInitScript(() => localStorage.setItem("physics-bench:small-screen-advice", JSON.stringify({ choice: "continue" })));
  await page.goto(`${base}/experiments/stretched-wire`);
  await page.getByRole("button", { name: /Perform it on the bench/ }).click();
  await page.getByRole("button", { name: /Go to the bench/ }).click();
  await page.locator("canvas").waitFor();
  await page.getByLabel("Total load on the wire").selectOption("4");
  await page.getByRole("button", { name: "Place rider at middle" }).click();
  await page.getByRole("button", { name: "320", exact: true }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${name}-bench.png`, fullPage: false });
  await page.getByRole("button", { name: /Eye level at bridge/ }).click();
  await page.waitForTimeout(1500);
  await page.locator("canvas").screenshot({ path: `${out}/${name}-eye-level.png` });
  await page.close();
}

await browser.close();
console.log(`screenshots in ${out}`);
