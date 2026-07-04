import { test, expect, Page } from "@playwright/test";

const SHOT = (name: string) => ({ path: `test-artifacts/${name}.png`, fullPage: true });

async function login(page: Page, identifier: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Username or email").fill(identifier);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/(dashboard|admin)/, { timeout: 30_000 });
}

test("super admin: CRM grid + detail (password reveal, docs, edit)", async ({ page }) => {
  await login(page, "super.admin@softonoma.com", "Softonoma@SaDM7k29");
  await page.goto("/crm/profiles");
  await expect(page.getByText(/CRM Profiles \(/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Add profile/ })).toBeVisible();
  await page.screenshot(SHOT("crm-01-admin-grid"));

  await page.getByRole("cell", { name: "Sabahat Atique", exact: true }).first().click(); // row is clickable
  await expect(page.getByRole("heading", { name: "Account password" })).toBeVisible();
  await page.getByRole("button", { name: /Reveal/ }).click();
  await expect(page.getByRole("heading", { name: "Edit profile" })).toBeVisible();
  await page.screenshot(SHOT("crm-02-admin-detail"));
});

test("BD: sees only own profile, no password, no add button", async ({ page }) => {
  await login(page, "shaiza.maheen", "Softonoma@1042");
  await page.goto("/crm/profiles");
  await expect(page.getByText(/CRM Profiles \(/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Add profile/ })).toHaveCount(0);
  await expect(page.getByRole("cell", { name: "Sabahat Atique", exact: true })).toBeVisible();
  // "Ali Ahmad" (a dev_profile owned by Areeba) must not be visible to Shaiza (RLS owner-scoping).
  await expect(page.getByRole("cell", { name: "Ali Ahmad", exact: true })).toHaveCount(0);
  await page.screenshot(SHOT("crm-03-bd-grid"));

  await page.getByRole("cell", { name: "Sabahat Atique", exact: true }).first().click();
  await expect(page.getByText("Documents")).toBeVisible();
  await expect(page.getByText("Account password")).toHaveCount(0); // never shown to a BD
  await expect(page.getByRole("heading", { name: "Edit profile" })).toHaveCount(0);
  await page.screenshot(SHOT("crm-04-bd-detail"));
});

test("non-BD employee is blocked from /crm", async ({ page }) => {
  await login(page, "muzammil.faiz", "Softonoma@6193");
  await page.goto("/crm/profiles");
  await expect(page).not.toHaveURL(/\/crm/); // middleware redirects away
});
