import { test, expect } from "@playwright/test";
import { isSupabaseAvailable, gotoAndWait } from "./helpers";

/**
 * Labs — starting the first scan.
 *
 * Path: /labs → click first TestCard → /labs/[slug] → "Start" CTA → POST
 * /api/labs/sessions → /labs/[slug]/take?session=…
 *
 * Verifies the CTA isn't dead: it either kicks off a session OR shows a
 * human-readable auth error (since anonymous user can't write to sessions).
 */

test.describe("Labs — start first scan", () => {
  test.beforeEach(async ({ page }) => {
    const supa = await isSupabaseAvailable(page);
    test.skip(supa, "Anonymous-only smoke test");
    await gotoAndWait(page, "/labs");
  });

  test("first available module routes to detail page and shows Start CTA", async ({ page }) => {
    const firstCard = page.locator('a[href^="/labs/"]').first();
    if (!(await firstCard.count())) test.skip(true, "No labs modules in catalog");

    const href = await firstCard.getAttribute("href");
    await firstCard.click();
    await page.waitForURL(new RegExp(`${href}$`));

    // Detail copy + Start button (StartTestButton).
    await expect(page.locator("h1, h2").first()).toBeVisible();
    const startBtn = page.locator(
      'button:has-text("Start"), button:has-text("Begin"), button:has-text("Take")',
    ).first();
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeEnabled();
  });

  test("Start CTA fires POST /api/labs/sessions (not dead)", async ({ page }) => {
    const firstCard = page.locator('a[href^="/labs/"]').first();
    if (!(await firstCard.count())) test.skip(true, "No labs modules in catalog");

    await firstCard.click();
    await page.waitForLoadState("networkidle");

    const startBtn = page.locator(
      'button:has-text("Start"), button:has-text("Begin"), button:has-text("Take")',
    ).first();

    const reqPromise = page
      .waitForRequest((r) => r.url().includes("/api/labs/sessions") && r.method() === "POST", {
        timeout: 5_000,
      })
      .catch(() => null);

    await startBtn.click();
    const req = await reqPromise;
    expect(req, "Start CTA must POST /api/labs/sessions").toBeTruthy();

    // Either redirected to /take?session=… or shows readable error.
    const reachedTaker = await page
      .waitForURL(/\/labs\/.+\/take\?session=/, { timeout: 4_000 })
      .then(() => true)
      .catch(() => false);
    if (!reachedTaker) {
      await expect(
        page.locator('text=/sign in|log in|unauthorized|failed/i').first(),
      ).toBeVisible();
    }
  });
});
