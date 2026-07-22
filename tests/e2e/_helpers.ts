// Shared E2E helpers so specs don't each re-implement login. Run `npm run e2e:auth` first (or
// `test:e2e` which the browser-verify skill wires to run it) so these creds are guaranteed valid.
import { Page } from "@playwright/test";

export const SHOT = (name: string) => ({ path: `test-artifacts/${name}.png`, fullPage: true });

// Keep in lockstep with app/login/page.tsx DEMOS + scripts/e2e-ensure-auth.mjs.
export const DEMO = {
  super: { id: "super.admin@softonoma.com", pw: "Softonoma@SaDM7k29" },
  admin: { id: "admin@softonoma.com", pw: "Softonoma@HrAd4n63" },
  bdLead: { id: "fatima.sultan", pw: "Softonoma@3310" },
  bd: { id: "shaiza.maheen", pw: "Softonoma@1042" },
  engineer: { id: "muzammil.faiz", pw: "Softonoma@6193" },
} as const;

export async function login(page: Page, identifier: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Username or email").fill(identifier);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/(dashboard|admin)/, { timeout: 30_000 });
}
