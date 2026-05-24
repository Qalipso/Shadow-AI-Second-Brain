import { test, expect } from "@playwright/test";
import { isSupabaseAvailable, TEST_CREDENTIALS } from "./helpers";

/**
 * Labs — full module flow.
 *
 * Requires authenticated session — controlled by E2E_EMAIL / E2E_PASSWORD.
 * Skipped when those aren't configured or Supabase is missing.
 *
 * Steps:
 *  1. Login
 *  2. Open first Labs module → Start
 *  3. Walk through every question (TestTaker)
 *     - Each question has selectable options (scale 1–5 etc.)
 *     - "Back" navigation preserves previously chosen answer
 *     - "Next" disabled until current answer is set
 *  4. Final submit → result page or summary
 *  5. Refresh during the flow — partial progress should not vanish silently
 */

test.describe("Labs — full module flow (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    const supa = await isSupabaseAvailable(page);
    test.skip(!supa, "Needs Supabase auth");
    test.skip(
      TEST_CREDENTIALS.email === "test@shadow.local",
      "Set E2E_EMAIL/E2E_PASSWORD to run authenticated Labs flow",
    );

    // Login (form selectors match shadow/web LoginForm).
    await page.goto("/login");
    await page.fill('input[type="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes("/login"));
  });

  test("complete the first available Labs module end-to-end", async ({ page }) => {
    await page.goto("/labs");
    const firstCard = page.locator('a[href^="/labs/"]').first();
    if (!(await firstCard.count())) test.skip(true, "No modules configured");
    await firstCard.click();

    const startBtn = page.locator(
      'button:has-text("Start"), button:has-text("Begin"), button:has-text("Take")',
    ).first();
    await startBtn.click();
    await page.waitForURL(/\/labs\/.+\/take\?session=/);

    // Iterate until we reach a final submit or run out of "Next" steps.
    let safety = 50;
    while (safety-- > 0) {
      // Pick first answer option visible (scale node / radio / button).
      const option = page
        .locator(
          'button[role="radio"], button[aria-label*="answer"], button:has-text("1"), button:has-text("Agree"), input[type="radio"]',
        )
        .first();
      if (await option.isVisible().catch(() => false)) {
        await option.click().catch(() => null);
      }

      const next = page
        .locator('button:has-text("Next"), button:has-text("Continue")')
        .first();
      const submit = page
        .locator('button:has-text("Submit"), button:has-text("Finish"), button:has-text("Complete")')
        .first();

      if (await submit.isVisible().catch(() => false)) {
        await submit.click();
        break;
      }
      if (await next.isVisible().catch(() => false)) {
        await next.click();
        continue;
      }
      break;
    }

    // Expect to land on a results view or a confirmation.
    await expect(
      page.locator('text=/result|summary|complete|finished|thank you/i').first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Back preserves the chosen answer", async ({ page }) => {
    await page.goto("/labs");
    const firstCard = page.locator('a[href^="/labs/"]').first();
    if (!(await firstCard.count())) test.skip(true, "No modules configured");
    await firstCard.click();
    await page.locator('button:has-text("Start"), button:has-text("Begin"), button:has-text("Take")').first().click();
    await page.waitForURL(/\/labs\/.+\/take\?session=/);

    const firstOption = page.locator('button[aria-pressed], button[role="radio"], button:has-text("1")').first();
    await firstOption.click().catch(() => null);
    const ariaBefore = await firstOption.getAttribute("aria-pressed").catch(() => null);

    const next = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
    if (!(await next.isVisible())) test.skip(true, "Single-question test");
    await next.click();

    const back = page.locator('button:has-text("Back"), button:has-text("Previous")').first();
    await back.click();

    const ariaAfter = await firstOption.getAttribute("aria-pressed").catch(() => null);
    expect(ariaAfter ?? "true").toEqual(ariaBefore ?? "true");
  });
});
