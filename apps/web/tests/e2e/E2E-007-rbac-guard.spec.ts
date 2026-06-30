/**
 * E2E-007 — RBAC Guard
 * MR attempts to navigate to /admin → redirected to feed with "Access Denied" message.
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("E2E-007 — RBAC Guard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "mr");
  });

  test("MR navigating to /admin is redirected to feed with access denied banner", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/.*\/feed\?accessDenied=true/);
    await expect(page.getByTestId("access-denied-banner")).toBeVisible();
    await expect(page.getByTestId("access-denied-banner")).toContainText("Access Denied");
  });

  test("MR navigating to /rsm is redirected to feed", async ({ page }) => {
    await page.goto("/rsm");
    await expect(page).toHaveURL(/.*\/feed/);
  });

  test("MR cannot see Admin Console nav link", async ({ page }) => {
    await page.goto("/feed");
    await expect(page.getByTestId("nav-admin-console")).not.toBeVisible();
  });
});
