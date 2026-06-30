/**
 * E2E-005 — RSM View
 * RSM logs in → RSM dashboard shows compliance rate metric.
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("E2E-005 — RSM Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "rsm");
  });

  test("RSM sees the team dashboard after login", async ({ page }) => {
    await page.goto("/rsm");
    await expect(page.getByTestId("rsm-dashboard-heading")).toBeVisible();
  });

  test("RSM dashboard shows compliance rate metric", async ({ page }) => {
    await page.goto("/rsm");
    await expect(page.getByTestId("compliance-rate-card")).toBeVisible();
    await expect(page.getByTestId("compliance-rate-value")).toBeVisible();
  });

  test("RSM dashboard shows escalations metric", async ({ page }) => {
    await page.goto("/rsm");
    await expect(page.getByTestId("escalations-card")).toBeVisible();
  });
});
