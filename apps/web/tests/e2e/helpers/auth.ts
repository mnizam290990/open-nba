import { Page } from "@playwright/test";

export const DEMO_CREDENTIALS = {
  mr: { email: "mr@demo.opennba.com", password: "demo1234" },
  rsm: { email: "rsm@demo.opennba.com", password: "demo1234" },
  admin: { email: "admin@demo.opennba.com", password: "demo1234" },
} as const;

export async function loginAs(
  page: Page,
  role: keyof typeof DEMO_CREDENTIALS
): Promise<void> {
  const creds = DEMO_CREDENTIALS[role];
  await page.goto("/login");
  await page.getByTestId("login-email").fill(creds.email);
  await page.getByTestId("login-password").fill(creds.password);
  await page.getByTestId("login-submit-btn").click();
  await page.waitForURL("**/feed");
}
