/**
 * E2E-004 — Detail Panel
 * MR taps an HCP card → detail panel opens → three talking points visible.
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("E2E-004 — HCP Detail Panel", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "mr");
  });

  test("clicking HCP name opens the detail panel", async ({ page }) => {
    const firstCard = page.getByTestId("hcp-card").first();
    await firstCard.getByTestId("hcp-name-btn").click();

    await expect(page.getByTestId("hcp-detail-panel")).toBeVisible();
    await expect(page.getByTestId("detail-panel-hcp-name")).toBeVisible();
  });

  test("detail panel shows three talking points", async ({ page }) => {
    const firstCard = page.getByTestId("hcp-card").first();
    await firstCard.getByTestId("hcp-name-btn").click();

    await expect(page.getByTestId("talking-point-1")).toBeVisible();
    await expect(page.getByTestId("talking-point-2")).toBeVisible();
    await expect(page.getByTestId("talking-point-3")).toBeVisible();
  });

  test("detail panel shows interaction summary", async ({ page }) => {
    const firstCard = page.getByTestId("hcp-card").first();
    await firstCard.getByTestId("hcp-name-btn").click();

    await expect(page.getByTestId("detail-summary-text")).toBeVisible();
  });

  test("detail panel can be closed", async ({ page }) => {
    const firstCard = page.getByTestId("hcp-card").first();
    await firstCard.getByTestId("hcp-name-btn").click();
    await expect(page.getByTestId("hcp-detail-panel")).toBeVisible();

    await page.getByTestId("detail-panel-close-btn").click();
    await expect(page.getByTestId("hcp-detail-panel")).not.toBeVisible();
  });

  test("pressing Escape closes the detail panel", async ({ page }) => {
    const firstCard = page.getByTestId("hcp-card").first();
    await firstCard.getByTestId("hcp-name-btn").click();
    await expect(page.getByTestId("hcp-detail-panel")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("hcp-detail-panel")).not.toBeVisible();
  });
});
