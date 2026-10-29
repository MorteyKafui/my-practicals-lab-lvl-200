/**
 * Capture practical benches for design review:
 *   bun scripts/screenshots.ts <experiment-id>... [--out dir] [--phone]
 * Needs the static build served on :4173 (`bun run preview`).
 */
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const outIndex = args.indexOf("--out");
const out = outIndex >= 0 ? args[outIndex + 1]! : ".taste-skill/inspect/app";
const phone = args.includes("--phone");
const ids = args.filter((a, i) => !a.startsWith("--") && !(outIndex >= 0 && i === outIndex + 1));
const base = "http://localhost:4173";

const browser = await chromium.launch({ channel: "chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const viewport = phone ? { width: 390, height: 844 } : { width: 1440, height: 900 };

for (const id of ids.length ? ids : ["stretched-wire"]) {
  const page = await browser.newPage({ viewport });
  await page.addInitScript(() => localStorage.setItem("physics-bench:small-screen-advice", JSON.stringify({ choice: "continue" })));
  await page.goto(`${base}/experiments/${id}`);
  await page.getByRole("button", { name: /Perform it on the bench/ }).click();
  await page.getByRole("button", { name: /Go to the bench/ }).click();
  await page.locator("canvas").waitFor();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${id}${phone ? "-phone" : ""}.png` });
  await page.close();
}

await browser.close();
console.log(`screenshots in ${out}`);
