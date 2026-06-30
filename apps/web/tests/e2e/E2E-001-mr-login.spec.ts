/**
 * E2E-001 — MR Login
 * MR logs in with valid credentials → NBA feed page loads → at least one HCP card visible.
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("E2E-001 — MR Login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("MR logs in and sees the NBA feed with HCP cards", async ({ page }) => {
    await loginAs(page, "mr");

    await expect(page.getByTestId("feed-heading")).toBeVisible();
    await expect(page.getByTestId("hcp-feed-list")).toBeVisible();
    await expect(page.getByTestId("hcp-card").first()).toBeVisible();
  });

  test("login page shows error for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill("bad@email.com");
    await page.getByTestId("login-password").fill("wrongpassword");
    await page.getByTestId("login-submit-btn").click();

    await expect(page.getByTestId("login-error")).toBeVisible();
    await expect(page.getByTestId("login-error")).toContainText("Invalid email or password");
  });

  test("unauthenticated user is redirected to login from /feed", async ({ page }) => {
    await page.goto("/feed");
    await expect(page).toHaveURL(/.*\/login/);
  });
});
