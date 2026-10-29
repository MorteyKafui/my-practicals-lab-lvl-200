import { defineConfig, devices } from "@playwright/test";

/** End-to-end tests run against the static production build in out/ (bun run build first). */
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_URL ?? "http://localhost:4173",
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: process.env.E2E_URL ? "bun run dev" : "bunx serve out -l 4173 --no-clipboard",
    url: process.env.E2E_URL ?? "http://localhost:4173",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
