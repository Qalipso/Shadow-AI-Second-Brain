import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for Shadow web app.
 * App runs on port 3000 (standard Next.js dev server).
 *
 * Run tests:  npx playwright test
 * View report: npx playwright show-report
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["junit", { outputFile: "playwright-results.xml" }],
    ["list"],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Do not spin up the dev server automatically — start it manually before
  // running tests.  To auto-start, uncomment the block below.
  // webServer: {
  //   command: "npm run dev",
  //   url: "http://localhost:3000",
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120_000,
  // },
});
