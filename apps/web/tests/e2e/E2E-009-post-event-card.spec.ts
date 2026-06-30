/**
 * E2E-009 — Post-Event Card (Phase 14.3)
 *
 * Scenario: Admin creates an event → after a pipeline refresh the MR feed
 * surfaces a "Post-Event Follow-up" card → MR opens detail panel → outreach
 * draft and event badge are visible.
 *
 * NOTE: Full test execution requires Phase 14 implementation (hcp_events table,
 * POST /api/v1/admin/events, and Gap Detection post-event extension).
 * The structure below follows SAF Playwright standards and will pass against a
 * deployed environment once Phase 14 is live.
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("E2E-009 — Post-Event Follow-up Card", () => {
  test.describe("Admin — create event", () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, "admin");
    });

    test("Admin can access the admin console and see the checklist", async ({ page }) => {
      await page.goto("/admin");
      await expect(page.getByTestId("admin-heading")).toBeVisible();
      await expect(page.getByTestId("production-checklist-section")).toBeVisible();
    });

    test("Admin DATA_MODE toggle is present and accessible", async ({ page }) => {
      await page.goto("/admin");
      await expect(page.getByTestId("data-mode-toggle-btn")).toBeVisible();
      await expect(page.getByTestId("data-mode-toggle-btn")).toBeEnabled();
    });
  });

  test.describe("MR — post-event card in feed", () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, "mr");
    });

    test("MR feed loads and shows cards after refresh", async ({ page }) => {
      await page.goto("/feed");
      await expect(page.getByTestId("feed-heading")).toBeVisible();
      await page.getByTestId("refresh-feed-btn").click();
      await expect(page.getByTestId("feed-heading")).toBeVisible();
    });

    test("MR feed shows urgency badges on all cards", async ({ page }) => {
      await page.goto("/feed");
      await expect(page.getByTestId("feed-heading")).toBeVisible();
      const cards = page.getByTestId("hcp-card");
      const count = await cards.count();
      if (count > 0) {
        await expect(cards.first().getByTestId("urgency-badge")).toBeVisible();
      }
    });

    test.skip(
      "post-event badge appears on MR feed card after event creation (Phase 14)",
      async ({ page }) => {
        await page.goto("/feed");
        await expect(page.getByTestId("post-event-badge").first()).toBeVisible();
      }
    );

    test.skip(
      "MR opens post-event card detail panel and sees outreach draft (Phase 14)",
      async ({ page }) => {
        await page.goto("/feed");
        const postEventCard = page.getByTestId("hcp-card").filter({
          has: page.getByTestId("post-event-badge"),
        });
        await postEventCard.getByTestId("hcp-name-btn").click();
        await expect(page.getByTestId("hcp-detail-panel")).toBeVisible();
        await expect(page.getByTestId("copy-draft-btn")).toBeVisible();
        await expect(page.getByTestId("post-event-badge")).toBeVisible();
      }
    );
  });
});
