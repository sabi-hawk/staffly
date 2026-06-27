import { defineConfig, devices } from "@playwright/test";

/**
 * Browser E2E against the dev server. Screenshots are written to test-artifacts/ so an agent can
 * read them to verify the UI. One-time: `npx playwright install chromium`.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-artifacts/playwright",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    viewport: { width: 1366, height: 900 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
