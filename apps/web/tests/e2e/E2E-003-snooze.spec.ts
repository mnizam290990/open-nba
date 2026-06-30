/**
 * E2E-003 — Snooze
 * MR clicks Snooze → card disappears from the feed.
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("E2E-003 — Snooze", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "mr");
  });

  test("Snooze removes the card from the immediate feed view", async ({ page }) => {
    const firstCard = page.getByTestId("hcp-card").first();
    await expect(firstCard).toBeVisible();
    const cardId = await firstCard.getAttribute("data-card-id");

    await firstCard.getByTestId("snooze-btn").click();

    if (cardId) {
      await expect(page.locator(`[data-card-id="${cardId}"]`)).not.toBeVisible();
    }
  });
});
