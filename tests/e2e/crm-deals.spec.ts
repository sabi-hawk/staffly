import { test, expect, Page } from "@playwright/test";

const SHOT = (name: string) => ({ path: `test-artifacts/${name}.png`, fullPage: true });

async function login(page: Page, identifier: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Username or email").fill(identifier);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/(dashboard|admin)/, { timeout: 30_000 });
}

test("super admin: deals list, detail, and accounts/methods settings", async ({ page }) => {
  await login(page, "super.admin@softonoma.com", "Softonoma@SaDM7k29");
  await page.goto("/crm/deals");
  await expect(page.getByText(/Deals \(/)).toBeVisible();
  await expect(page.getByRole("link", { name: "DemoCorp", exact: true })).toBeVisible();
  await page.screenshot(SHOT("crm-09-admin-deals"));

  await page.getByRole("link", { name: "DemoCorp", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Edit deal" })).toBeVisible();
  await page.screenshot(SHOT("crm-10-admin-deal-detail"));

  await page.goto("/crm/deals/settings");
  await expect(page.getByRole("heading", { name: "Receiving accounts", exact: true })).toBeVisible();
  await expect(page.getByText("Wise", { exact: true })).toBeVisible();
  await page.screenshot(SHOT("crm-11-deals-settings"));
});

test("BD is blocked from /crm/deals (admin-only)", async ({ page }) => {
  await login(page, "shaiza.maheen", "Softonoma@1042");
  await page.goto("/crm/deals");
  await expect(page).not.toHaveURL(/\/crm\/deals/); // middleware redirects a non-admin away
});
