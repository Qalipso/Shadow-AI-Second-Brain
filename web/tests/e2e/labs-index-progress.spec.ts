import { test, expect, Page } from "@playwright/test";
import { isSupabaseAvailable, gotoAndWait } from "./helpers";

/**
 * Labs — Self-Knowledge Index numeric consistency.
 *
 * The hero, the ring percentage, and the card statuses MUST agree:
 *   completed_cards / total_cards   ==   ring_percent (within rounding)
 *
 * This catches the most common Labs regression: progress UI desyncs from
 * actual completion data after refresh, navigation, or RSC revalidation.
 */

async function readIndexState(page: Page) {
  const txt = await page.locator("body").innerText();

  // "X of Y modules complete" — extract counts.
  const xy = txt.match(/(\d+)\s*of\s*(\d+)\s*modules?\s*complete/i);
  const completed = xy ? Number(xy[1]) : null;
  const total = xy ? Number(xy[2]) : null;

  // Ring number "NN%" close to the SVG.
  const pctMatch = txt.match(/(\d{1,3})\s*%/);
  const pct = pctMatch ? Number(pctMatch[1]) : null;

  return { completed, total, pct };
}

test.describe("Labs — Self-Knowledge Index consistency", () => {
  test.beforeEach(async ({ page }) => {
    const supa = await isSupabaseAvailable(page);
    test.skip(supa, "Anonymous-only smoke test");
    await gotoAndWait(page, "/labs");
  });

  test("ring percentage matches completed/total ratio", async ({ page }) => {
    const { completed, total, pct } = await readIndexState(page);

    if (total === null || total === 0) {
      // Empty catalog acceptable — pct must be 0%.
      expect(pct === null || pct === 0).toBe(true);
      return;
    }

    expect(completed).not.toBeNull();
    expect(pct).not.toBeNull();
    const expected = Math.round(((completed ?? 0) / total) * 100);
    expect(Math.abs((pct ?? 0) - expected)).toBeLessThanOrEqual(1);
  });

  test("state persists across reload (no jitter)", async ({ page }) => {
    const before = await readIndexState(page);
    await page.reload({ waitUntil: "networkidle" });
    const after = await readIndexState(page);
    expect(after).toEqual(before);
  });
});
