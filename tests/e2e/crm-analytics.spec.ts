import { test, expect, Page } from "@playwright/test";

const SHOT = (name: string) => ({ path: `test-artifacts/${name}.png`, fullPage: true });

async function login(page: Page, identifier: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Username or email").fill(identifier);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/(dashboard|admin)/, { timeout: 30_000 });
}

test("super admin: BD performance shows all BDs incl. a Deals column", async ({ page }) => {
  await login(page, "super.admin@softonoma.com", "Softonoma@SaDM7k29");
  await page.goto("/crm/analytics");
  await expect(page.getByRole("heading", { name: "BD Performance" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Deals" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Shaiza Maheen" })).toBeVisible();
  await page.screenshot(SHOT("crm-14-analytics-admin"));
});

test("BD: sees only their own performance, no Deals column", async ({ page }) => {
  await login(page, "shaiza.maheen", "Softonoma@1042");
  await page.goto("/crm/analytics");
  await expect(page.getByRole("heading", { name: "BD Performance" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Deals" })).toHaveCount(0); // deals are admin-only
  await expect(page.getByRole("cell", { name: "Shaiza Maheen" })).toBeVisible();
  // another BD's row should not appear
  await expect(page.getByRole("cell", { name: "Areeba Zaidi" })).toHaveCount(0);
  await page.screenshot(SHOT("crm-15-analytics-bd"));
});
