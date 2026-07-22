// CRM Job Hunt Board (/crm/job-board) — a BD opens the shared board, adds a post, sees it render, then
// deletes it (self-cleaning; the daily purge cron is a backstop for any leftover). Run `npm run e2e:auth`
// first so the demo login is guaranteed valid.
import { test, expect } from "@playwright/test";
import { login, DEMO, SHOT } from "./_helpers";

test("BD: opens the job board, adds a post, it renders, then removes it", async ({ page }) => {
  await login(page, DEMO.bd.id, DEMO.bd.pw);
  await page.goto("/crm/job-board");
  await expect(page.getByText("Job hunt board")).toBeVisible();
  await page.screenshot(SHOT("crm-jobboard-01-empty"));

  const company = `E2E-JB-${Date.now()}`;
  await page.locator("#jb-company").fill(company);
  await page.locator("#jb-url").fill(`https://example.com/jobs/${company}`);
  await page.getByRole("button", { name: "Add", exact: true }).click();

  // The new row (created today) lands on the default day-scoped board via realtime + refresh.
  const row = page.getByRole("row").filter({ hasText: company });
  await expect(row).toBeVisible({ timeout: 15_000 });
  await page.screenshot(SHOT("crm-jobboard-02-added"));

  // Clean up: delete the row we created (owner-only Delete action).
  await row.getByTitle("Delete").click();
  await expect(page.getByRole("row").filter({ hasText: company })).toHaveCount(0, { timeout: 15_000 });
});

test("Engineer (non-BD) is blocked from the job board", async ({ page }) => {
  await login(page, DEMO.engineer.id, DEMO.engineer.pw);
  await page.goto("/crm/job-board");
  await expect(page).toHaveURL(/\/dashboard/); // redirected away (no crm.access)
});
