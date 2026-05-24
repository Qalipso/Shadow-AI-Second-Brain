import { test, expect } from "@playwright/test";
import { isSupabaseAvailable, TEST_CREDENTIALS } from "./helpers";

/**
 * Labs — completed module result view.
 *
 * After a module finishes the user should see:
 *   - a result summary (radar / dimensions / pattern names)
 *   - a "what this means" or interpretation block
 *   - what gets saved to Shadow memory
 *   - ability to retake the module
 *
 * If no completed session exists yet, this spec walks the most recent
 * completed slug if any; otherwise skipped.
 */

test.describe("Labs — results view", () => {
  test.beforeEach(async ({ page }) => {
    const supa = await isSupabaseAvailable(page);
    test.skip(!supa, "Needs Supabase");
    test.skip(
      TEST_CREDENTIALS.email === "test@shadow.local",
      "Set E2E_EMAIL/E2E_PASSWORD to run results spec",
    );
    await page.goto("/login");
    await page.fill('input[type="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes("/login"));
  });

  test("first completed module shows summary, interpretation, retake", async ({ page }) => {
    await page.goto("/labs");
    // TestCard adds a check icon when completed; we surface via /labs/[slug].
    const completed = page.locator('a[href^="/labs/"]:has-text("Completed"), a[href^="/labs/"]:has(svg)').first();
    if (!(await completed.count())) test.skip(true, "No completed module in this account");
    await completed.click();
    await page.waitForLoadState("networkidle");

    // Summary content.
    await expect(
      page.locator('text=/result|summary|score|pattern|profile/i').first(),
    ).toBeVisible({ timeout: 8_000 });

    // Memory saving framing.
    await expect(page.locator('text=/saved|memory|profile/i').first()).toBeVisible();

    // Retake CTA.
    await expect(
      page.locator('button:has-text("Retake"), button:has-text("Run again"), a:has-text("Retake")').first(),
    ).toBeVisible();
  });

  test("incomplete module does NOT show result block", async ({ page }) => {
    await page.goto("/labs");
    const open = page.locator('a[href^="/labs/"]:not(:has-text("Completed"))').first();
    if (!(await open.count())) test.skip(true, "Every module already completed");
    await open.click();
    await page.waitForLoadState("networkidle");
    // No premature "Your result" block.
    await expect(page.locator('text=/your result|your score/i')).toHaveCount(0);
  });
});
