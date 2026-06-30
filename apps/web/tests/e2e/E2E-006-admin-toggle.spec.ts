/**
 * E2E-006 — Admin Toggle
 * Admin logs in → Admin Console visible → DATA_MODE toggle present.
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("E2E-006 — Admin Console", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
  });

  test("Admin can navigate to the Admin Console", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByTestId("admin-heading")).toBeVisible();
  });

  test("Admin Console shows DATA_MODE toggle", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByTestId("data-mode-section")).toBeVisible();
    await expect(page.getByTestId("data-mode-toggle-btn")).toBeVisible();
  });

  test("Admin Console shows current DATA_MODE", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByTestId("current-data-mode")).toBeVisible();
  });

  test("Production checklist is visible", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByTestId("production-checklist-section")).toBeVisible();
    await expect(page.getByTestId("checklist-items")).toBeVisible();
  });
});
