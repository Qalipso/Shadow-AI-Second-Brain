import { test, expect } from "@playwright/test";
import { isSupabaseAvailable, gotoAndWait } from "./helpers";

/**
 * Labs — error, retry, and graceful degradation.
 *
 * Covers:
 *   - /api/labs/sessions returns 500 → user-readable error + retry, not blank
 *   - /api/labs/sessions returns 401 → sign-in prompt
 *   - module slug 404 → "Module not found" copy, not crash
 *   - network offline mid-flight → form not stuck on "Sending…"
 *   - localStorage disabled → app still mounts (no thrown error)
 */

test.describe("Labs — error states", () => {
  test.beforeEach(async ({ page }) => {
    const supa = await isSupabaseAvailable(page);
    test.skip(supa, "Anonymous-only smoke test");
  });

  test("/labs/[bogus] shows not-found copy", async ({ page }) => {
    await page.goto("/labs/this-module-does-not-exist-xyz");
    await page.waitForLoadState("networkidle");
    const text = (await page.locator("body").innerText()).toLowerCase();
    expect(text).toMatch(/not found|doesn'?t exist|404|no such module/);
  });

  test("Start CTA gracefully handles 500 from /api/labs/sessions", async ({ page }) => {
    await page.route(/\/api\/labs\/sessions/, (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal error" }),
      }),
    );
    await gotoAndWait(page, "/labs");
    const card = page.locator('a[href^="/labs/"]').first();
    if (!(await card.count())) test.skip(true, "No modules");
    await card.click();
    await page.waitForLoadState("networkidle");
    const startBtn = page.locator(
      'button:has-text("Start"), button:has-text("Begin"), button:has-text("Take")',
    ).first();
    if (!(await startBtn.isVisible().catch(() => false))) test.skip(true, "No start CTA");
    await startBtn.click();

    // Human-readable error appears, not blank/loop.
    await expect(
      page.locator('text=/failed|error|try again|retry/i').first(),
    ).toBeVisible({ timeout: 6_000 });
    // Button is re-enabled for retry.
    await expect(startBtn).toBeEnabled();
  });

  test("Start CTA shows auth-required state on 401", async ({ page }) => {
    await page.route(/\/api\/labs\/sessions/, (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Unauthorized" }),
      }),
    );
    await gotoAndWait(page, "/labs");
    const card = page.locator('a[href^="/labs/"]').first();
    if (!(await card.count())) test.skip(true, "No modules");
    await card.click();
    const startBtn = page.locator(
      'button:has-text("Start"), button:has-text("Begin"), button:has-text("Take")',
    ).first();
    if (!(await startBtn.isVisible().catch(() => false))) test.skip(true, "No start CTA");
    await startBtn.click();
    await expect(
      page.locator('text=/sign in|log in|unauthor|please log/i').first(),
    ).toBeVisible({ timeout: 6_000 });
  });

  test("offline mid-submit doesn't leave button stuck", async ({ page, context }) => {
    await gotoAndWait(page, "/labs");
    const card = page.locator('a[href^="/labs/"]').first();
    if (!(await card.count())) test.skip(true, "No modules");
    await card.click();
    const startBtn = page.locator('button:has-text("Start"), button:has-text("Begin")').first();
    if (!(await startBtn.isVisible().catch(() => false))) test.skip(true, "No start CTA");

    await context.setOffline(true);
    await startBtn.click();
    // After ~5s should NOT still be in spinner state.
    await page.waitForTimeout(5_000);
    const stillSpinning = await page
      .locator('text=/sending|loading|starting/i').first()
      .isVisible()
      .catch(() => false);
    expect(stillSpinning).toBe(false);
    await context.setOffline(false);
  });

  test("localStorage unavailable does not crash Labs", async ({ page }) => {
    await page.addInitScript(() => {
      // Simulate hostile storage.
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get() {
          throw new Error("blocked");
        },
      });
    });
    await page.goto("/labs");
    // App should still render the hero — no white screen.
    await expect(page.locator('text=/Labs|Self-Knowledge/i').first()).toBeVisible({
      timeout: 8_000,
    });
  });
});
