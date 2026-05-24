import { test, expect } from "@playwright/test";
import { isSupabaseAvailable, gotoAndWait, waitForAppShell } from "./helpers";

/**
 * Labs — /labs page loads cleanly.
 *
 * Verifies:
 *  - no auth-loop (we don't bounce repeatedly)
 *  - no blank/white screen
 *  - hero block visible: "Labs" title + "Self-Knowledge Laboratory" eyebrow
 *  - Self-Knowledge Engine framing visible
 *  - No console errors during load
 */

test.describe("Labs — page load", () => {
  test("/labs renders shell + hero copy without errors", async ({ page }) => {
    const supa = await isSupabaseAvailable(page);
    test.skip(supa, "Supabase configured — skipping anonymous Labs load");

    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });

    await gotoAndWait(page, "/labs");
    await waitForAppShell(page);

    // No auth bounce.
    expect(page.url()).toContain("/labs");

    // Page chrome.
    await expect(page.locator('text="Labs"').first()).toBeVisible();
    await expect(page.locator('text=/Self-Knowledge Laboratory/i').first()).toBeVisible();
    await expect(page.locator('text=/Self-Knowledge Engine/i').first()).toBeVisible();

    // Body painted (not blank).
    const bodyText = await page.locator("body").textContent();
    expect((bodyText ?? "").trim().length).toBeGreaterThan(50);

    // No unexpected JS errors.
    const meaningful = errors.filter(
      (m) => !/favicon|hydration mismatch warning|third-party/i.test(m),
    );
    expect(meaningful).toEqual([]);
  });
});
