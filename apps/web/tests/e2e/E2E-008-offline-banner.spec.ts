/**
 * E2E-008 — Offline Banner
 * Disconnect network simulation → offline banner appears.
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("E2E-008 — Offline Banner", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "mr");
  });

  test("offline banner appears when network is disconnected", async ({ page, context }) => {
    await page.goto("/feed");

    await context.setOffline(true);

    // Trigger a network-dependent action
    await page.getByTestId("refresh-feed-btn").click();

    await expect(page.getByTestId("offline-banner")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByTestId("offline-banner")).toContainText("offline");

    await context.setOffline(false);
  });
});
