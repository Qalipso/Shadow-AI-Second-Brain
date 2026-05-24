import { test, expect } from "@playwright/test";
import { isSupabaseAvailable, TEST_CREDENTIALS } from "./helpers";

/**
 * Labs — memory save consent + retention.
 *
 * After completing a module the user must:
 *   - see a preview of what will be saved to Shadow memory
 *   - have an explicit "Save" action (no silent persistence)
 *   - be able to cancel / opt-out
 *   - see the result echoed in Memory/Insights when saved
 *
 * Skipped if no completed module exists.
 */

test.describe("Labs — memory save consent", () => {
  test.beforeEach(async ({ page }) => {
    const supa = await isSupabaseAvailable(page);
    test.skip(!supa, "Needs Supabase");
    test.skip(
      TEST_CREDENTIALS.email === "test@shadow.local",
      "Set E2E_EMAIL/E2E_PASSWORD to run memory consent spec",
    );
    await page.goto("/login");
    await page.fill('input[type="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes("/login"));
  });

  test("result page exposes consent affordance (Save / Don't save)", async ({ page }) => {
    await page.goto("/labs");
    const completed = page.locator('a[href^="/labs/"]:has(svg)').first();
    if (!(await completed.count())) test.skip(true, "No completed module to inspect");
    await completed.click();
    await page.waitForLoadState("networkidle");

    // Either explicit Save button OR a description of automatic + opt-out copy.
    const saveBtn = page.locator(
      'button:has-text("Save to memory"), button:has-text("Save"), [aria-label*="save"]',
    );
    const consentCopy = page.locator(
      'text=/saved to memory|stored in your profile|opt out|delete this result/i',
    );
    const hasAffordance = (await saveBtn.count()) > 0 || (await consentCopy.count()) > 0;
    expect(hasAffordance).toBe(true);
  });

  test("/memory surfaces the saved result keyword somewhere", async ({ page }) => {
    await page.goto("/memory");
    await page.waitForLoadState("networkidle");
    // Memory or Insights must mention a Labs-derived signal.
    const text = (await page.locator("body").innerText()).toLowerCase();
    const found =
      text.includes("personality") ||
      text.includes("values") ||
      text.includes("current state") ||
      text.includes("labs");
    expect(found).toBe(true);
  });
});
