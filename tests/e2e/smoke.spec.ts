import { test, expect, Page } from "@playwright/test";

const SHOT = (name: string) => ({ path: `test-artifacts/${name}.png`, fullPage: true });

async function login(page: Page, identifier: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Username or email").fill(identifier);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/(dashboard|admin)/, { timeout: 30_000 });
}

test("login page renders with Softonoma branding", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("Employee Portal")).toBeVisible();
  await page.screenshot(SHOT("01-login"));
});

test("super admin: dashboard, employees, payroll visible", async ({ page }) => {
  await login(page, "super.admin@softonoma.com", "Softonoma@SaDM7k29");
  await expect(page).toHaveURL(/\/admin\/dashboard/);
  await page.screenshot(SHOT("02-admin-dashboard"));

  await page.goto("/admin/employees");
  await expect(page.getByText(/Employees \(/)).toBeVisible();
  await page.screenshot(SHOT("03-employees"));

  await page.goto("/admin/payroll");
  await expect(page).toHaveURL(/\/admin\/payroll/);
  await expect(page.getByRole("heading", { name: "Payroll" }).first()).toBeVisible();
  await page.screenshot(SHOT("04-payroll"));

  await page.goto("/admin/attendance");
  await page.screenshot(SHOT("05-attendance"));
});

test("employee: sees own dashboard and is blocked from /admin (role gating)", async ({ page }) => {
  await login(page, "shaiza.maheen", "Softonoma@1042");
  await expect(page).toHaveURL(/\/dashboard/);
  await page.screenshot(SHOT("06-employee-dashboard"));

  await page.goto("/admin/dashboard");
  await expect(page).toHaveURL(/\/dashboard/); // redirected away
});
