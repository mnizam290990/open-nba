/**
 * E2E-002 — Card Actions
 * MR clicks Dismiss on a card → card disappears from the feed.
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("E2E-002 — Card Actions", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "mr");
  });

  test("Dismiss removes the card from the feed", async ({ page }) => {
    const firstCard = page.getByTestId("hcp-card").first();
    await expect(firstCard).toBeVisible();

    const cardId = await firstCard.getAttribute("data-card-id");

    await firstCard.getByTestId("dismiss-btn").click();

    if (cardId) {
      await expect(page.locator(`[data-card-id="${cardId}"]`)).not.toBeVisible();
    }
  });

  test("Schedule Visit button is present and enabled on each card", async ({ page }) => {
    const firstCard = page.getByTestId("hcp-card").first();
    await expect(firstCard.getByTestId("schedule-visit-btn")).toBeEnabled();
  });

  test("Log Call button is present on each card", async ({ page }) => {
    const firstCard = page.getByTestId("hcp-card").first();
    await expect(firstCard.getByTestId("log-call-btn")).toBeEnabled();
  });

  test("Snooze button is present on each card", async ({ page }) => {
    const firstCard = page.getByTestId("hcp-card").first();
    await expect(firstCard.getByTestId("snooze-btn")).toBeEnabled();
  });
});
