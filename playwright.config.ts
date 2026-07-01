import { defineConfig, devices } from "@playwright/test";

/**
 * Browser E2E against the dev server. Screenshots are written to test-artifacts/ so an agent can
 * read them to verify the UI. One-time: `npx playwright install chromium`.
 */
// Port is overridable via PW_PORT (default 3000) so the suite can avoid a port already taken by
// another local app. baseURL + the dev server both follow it.
const PORT = process.env.PW_PORT || "3000";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-artifacts/playwright",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    viewport: { width: 1366, height: 900 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
