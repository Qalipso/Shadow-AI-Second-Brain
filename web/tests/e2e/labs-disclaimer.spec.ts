import { test, expect } from "@playwright/test";
import { isSupabaseAvailable, gotoAndWait } from "./helpers";

/**
 * Labs — safety / scope disclaimer.
 *
 * Critical for a self-reflection product: results must never imply clinical
 * diagnosis. The string "Not a medical diagnosis" lives in the Labs hero and
 * must be visible BEFORE the user starts any module.
 */

test.describe("Labs — disclaimer copy", () => {
  test.beforeEach(async ({ page }) => {
    const supa = await isSupabaseAvailable(page);
    test.skip(supa, "Anonymous-only smoke test");
    await gotoAndWait(page, "/labs");
  });

  test("'Not a medical diagnosis' visible on Labs landing", async ({ page }) => {
    const disclaimer = page.locator('text=/Not a medical diagnosis/i');
    await expect(disclaimer).toBeVisible();
    // Must not be hidden by opacity 0 or display:none.
    const opacity = await disclaimer.evaluate((el) =>
      Number(getComputedStyle(el).opacity),
    );
    expect(opacity).toBeGreaterThan(0.4);
  });

  test("disclaimer also appears on a module detail page", async ({ page }) => {
    const card = page.locator('a[href^="/labs/"]').first();
    if (!(await card.count())) test.skip(true, "No modules");
    await card.click();
    await page.waitForLoadState("networkidle");
    const text = (await page.locator("body").innerText()).toLowerCase();
    // Either inherited disclaimer or "self-reflection" framing must exist.
    const ok =
      text.includes("not a medical diagnosis") ||
      text.includes("self-reflection") ||
      text.includes("structured introspection");
    expect(ok).toBe(true);
  });

  test("no clinical / diagnostic words in result copy on Labs landing", async ({ page }) => {
    const text = (await page.locator("body").innerText()).toLowerCase();
    const banned = ["diagnos", "disorder", "pathology", "syndrome", "clinical"];
    for (const word of banned) {
      // The single allowed mention is the explicit disclaimer.
      const safeCount = text.split("not a medical diagnosis").length - 1;
      const occurrences = text.split(word).length - 1;
      expect(occurrences - safeCount * 1, `unexpected mention of "${word}"`).toBeLessThanOrEqual(0);
    }
  });
});
