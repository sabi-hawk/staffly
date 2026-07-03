import { test, expect, Page } from "@playwright/test";

const SHOT = (name: string) => ({ path: `test-artifacts/${name}.png`, fullPage: true });

async function login(page: Page, identifier: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Username or email").fill(identifier);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/(dashboard|admin)/, { timeout: 30_000 });
}

test("super admin: leads pipeline + lead detail with interviews & assessments", async ({ page }) => {
  await login(page, "super.admin@softonoma.com", "Softonoma@SaDM7k29");
  await page.goto("/crm/leads");
  await expect(page.getByText("CRM · Leads")).toBeVisible();
  await expect(page.getByRole("link", { name: "DemoCorp", exact: true })).toBeVisible();
  await page.screenshot(SHOT("crm-05-admin-leads"));

  await page.getByRole("link", { name: "DemoCorp", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
  await expect(page.getByText(/Interviews \(1\)/)).toBeVisible();
  await expect(page.getByText(/Assessments \(1\)/)).toBeVisible();
  await page.screenshot(SHOT("crm-06-admin-lead-detail"));
});

test("BD owner: sees own lead, can disqualify then re-qualify", async ({ page }) => {
  await login(page, "shaiza.maheen", "Softonoma@1042");
  await page.goto("/crm/leads");
  await expect(page.getByRole("link", { name: "DemoCorp", exact: true })).toBeVisible();
  await page.screenshot(SHOT("crm-07-bd-leads"));

  await page.getByRole("link", { name: "DemoCorp", exact: true }).first().click();
  // disqualify (note required)
  await page.getByPlaceholder("Why isn't this a real lead?").fill("Unpaid collaboration, no budget");
  await page.getByRole("button", { name: "Mark not a lead" }).click();
  await expect(page.getByText("Not a lead")).toBeVisible();
  await page.screenshot(SHOT("crm-08-bd-disqualified"));
  // re-qualify to leave clean
  await page.getByRole("button", { name: "Re-qualify" }).click();
  await expect(page.getByRole("button", { name: "Mark not a lead" })).toBeVisible();
});

test("another BD does not see a colleague's lead (owner-scoping)", async ({ page }) => {
  await login(page, "areeba.zaidi", "Softonoma@4765");
  await page.goto("/crm/leads");
  await expect(page.getByRole("link", { name: "DemoCorp", exact: true })).toHaveCount(0);
});

test("non-BD employee is blocked from /crm/leads", async ({ page }) => {
  await login(page, "muzammil.faiz", "Softonoma@6193");
  await page.goto("/crm/leads");
  await expect(page).not.toHaveURL(/\/crm/);
});
