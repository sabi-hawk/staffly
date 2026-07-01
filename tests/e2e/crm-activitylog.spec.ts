import { test, expect, Page } from "@playwright/test";

const SHOT = (name: string) => ({ path: `test-artifacts/${name}.png`, fullPage: true });

async function login(page: Page, identifier: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Username or email").fill(identifier);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/(dashboard|admin)/, { timeout: 30_000 });
}

test("super admin: readable Activity Log + login activity", async ({ page }) => {
  await login(page, "super.admin@softonoma.com", "Softonoma@SaDM7k29");
  await page.goto("/admin/logs");
  await expect(page.getByRole("main").getByRole("heading", { name: "Activity Log" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Login activity" })).toBeVisible(); // super-admin only
  await page.screenshot(SHOT("crm-12-activity-log"));
});

test("BD: an audited edit appears in that record's History (own-record history)", async ({ page }) => {
  await login(page, "shaiza.maheen", "Softonoma@1042");
  await page.goto("/crm/leads");
  await page.getByRole("link", { name: "DemoCorp", exact: true }).first().click();

  // an audited change by the BD
  await page.getByPlaceholder("Why isn't this a real lead?").fill("activity-log test");
  await page.getByRole("button", { name: "Mark not a lead" }).click();
  await expect(page.getByText("Not a lead")).toBeVisible();

  // the record History now shows the change (RLS lets a BD see their own record's history)
  await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
  await expect(page.getByText(/updated lead/).first()).toBeVisible();
  await page.screenshot(SHOT("crm-13-record-history"));

  // clean up
  await page.getByRole("button", { name: "Re-qualify" }).click();
  await expect(page.getByRole("button", { name: "Mark not a lead" })).toBeVisible();
});
