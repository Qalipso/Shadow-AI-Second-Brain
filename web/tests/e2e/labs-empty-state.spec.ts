import { test, expect } from "@playwright/test";
import { isSupabaseAvailable, gotoAndWait } from "./helpers";

/**
 * Labs — empty / zero-progress state.
 *
 * When the user has 0 completed scans:
 *  - SelfKnowledgeIndex shows "0% / Begin your first scan."
 *  - Available Modules section is present (even if list is small)
 *  - CTAs are alive (links pointing to /labs/[slug]) — no dead buttons
 *  - No "0 of 0" panic state if catalog is empty: we still explain context
 */

test.describe("Labs — empty / starting state", () => {
  test.beforeEach(async ({ page }) => {
    const supa = await isSupabaseAvailable(page);
    test.skip(supa, "Anonymous-only smoke test");
    await gotoAndWait(page, "/labs");
  });

  test("Self-Knowledge Index reads 0% with 'Begin your first scan' copy", async ({ page }) => {
    const ski = page.locator('text=/Self-Knowledge Index|Begin your first scan/i').first();
    await expect(ski).toBeVisible();
    await expect(page.locator("body")).toContainText(/0%|0\s*\/|Begin your first scan/i);
  });

  test("Available Modules section is present", async ({ page }) => {
    await expect(page.locator('text=/Available Modules/i')).toBeVisible();
  });

  test("no dead CTAs — every Start link routes to /labs/[slug]", async ({ page }) => {
    // Either Link cards exist or empty-state copy exists. Never both missing.
    const cards = page.locator('a[href^="/labs/"]');
    const cardCount = await cards.count();

    if (cardCount === 0) {
      // Honest empty state required.
      await expect(
        page.locator('text=/coming soon|no modules|not available/i').first(),
      ).toBeVisible();
    } else {
      for (let i = 0; i < cardCount; i++) {
        const href = await cards.nth(i).getAttribute("href");
        expect(href).toMatch(/^\/labs\/[\w-]+$/);
      }
    }
  });
});
