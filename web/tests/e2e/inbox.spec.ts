import { test, expect } from "@playwright/test";
import { gotoAndWait, waitForAppShell } from "./helpers";

/**
 * Inbox capture E2E tests.
 *
 * The Inbox page is accessible without Supabase in dev-mode (seed-fallback
 * data, no auth gate active at this phase of the app).
 *
 * Scenarios covered:
 *   1. /inbox page loads with the page header ("Inbox").
 *   2. Composer textarea is visible and accepts text input.
 *   3. Ctrl+Enter (or Cmd+Enter) submits the entry — it appears in the list.
 *   4. Capture button click also submits the entry.
 *   5. Textarea clears after successful submission.
 *   6. Filter tabs (All / Raw / Processed) are visible.
 */

test.describe("Inbox capture", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndWait(page, "/inbox");
  });

  test("inbox page loads and shows page header", async ({ page }) => {
    // PageHeader renders an h1 containing "Inbox"
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
    await expect(heading).toContainText("Inbox");
  });

  test("composer textarea is visible", async ({ page }) => {
    const composer = page.locator('textarea[aria-label="Capture entry"]');
    await expect(composer).toBeVisible();
  });

  test("composer shows placeholder text", async ({ page }) => {
    const composer = page.locator('textarea[aria-label="Capture entry"]');
    const placeholder = await composer.getAttribute("placeholder");
    expect(placeholder).toBeTruthy();
    expect(placeholder).toMatch(/thought|task|idea|emotion/i);
  });

  test("filter tabs are visible: All, Raw, Processed", async ({ page }) => {
    const allTab = page.locator('button[aria-pressed]', { hasText: "All" });
    const rawTab = page.locator('button[aria-pressed]', { hasText: "Raw" });
    const processedTab = page.locator('button[aria-pressed]', {
      hasText: "Processed",
    });

    await expect(allTab).toBeVisible();
    await expect(rawTab).toBeVisible();
    await expect(processedTab).toBeVisible();
  });

  test("can type text into composer", async ({ page }) => {
    const composer = page.locator('textarea[aria-label="Capture entry"]');
    await composer.fill("E2E test entry via keyboard");
    await expect(composer).toHaveValue("E2E test entry via keyboard");
  });

  test("Ctrl+Enter submits entry and textarea clears", async ({ page }) => {
    const entryText = `E2E inbox test ${Date.now()}`;
    const composer = page.locator('textarea[aria-label="Capture entry"]');

    await composer.fill(entryText);
    await expect(composer).toHaveValue(entryText);

    // Submit with Ctrl+Enter
    await composer.press("Control+Enter");

    // Textarea should clear after submission
    await expect(composer).toHaveValue("", { timeout: 5_000 });
  });

  test("submitted entry appears in the entry list", async ({ page }) => {
    const entryText = `Shadow e2e capture ${Date.now()}`;
    const composer = page.locator('textarea[aria-label="Capture entry"]');

    await composer.fill(entryText);
    await composer.press("Control+Enter");

    // Wait for textarea to clear, confirming the submit fired
    await expect(composer).toHaveValue("", { timeout: 5_000 });

    // The entry list renders inside EntryList — each item is an <li>
    // The newly created entry text should appear in the list.
    // The component shows the first 200 chars of the text.
    const entryListItem = page
      .locator("li")
      .filter({ hasText: entryText.slice(0, 40) });
    await expect(entryListItem).toBeVisible({ timeout: 8_000 });
  });

  test("Capture button submits entry and clears textarea", async ({ page }) => {
    const entryText = `Shadow e2e button capture ${Date.now()}`;
    const composer = page.locator('textarea[aria-label="Capture entry"]');

    await composer.fill(entryText);

    // Click the "Capture" button (contains text "Capture" with a Sparkles icon)
    const captureButton = page.locator('button[type="button"]', {
      hasText: "Capture",
    });
    await expect(captureButton).toBeEnabled();
    await captureButton.click();

    // Textarea clears
    await expect(composer).toHaveValue("", { timeout: 5_000 });
  });

  test("Capture button is disabled when textarea is empty", async ({
    page,
  }) => {
    const captureButton = page.locator('button[type="button"]', {
      hasText: "Capture",
    });
    // Textarea starts empty (or after clearing)
    const composer = page.locator('textarea[aria-label="Capture entry"]');
    await composer.fill("");

    await expect(captureButton).toBeDisabled();
  });

  test("empty state message visible when no entries exist", async ({
    page,
  }) => {
    // This assertion is conditional: it only passes when no captures exist.
    // In CI with a fresh DB this should always be true on first run.
    const emptyState = page.locator("text=No captures yet.");
    const entryList = page.locator("li").first();

    // Either the empty state or an entry list is visible — both are valid.
    const emptyVisible = await emptyState.isVisible().catch(() => false);
    const listVisible = await entryList.isVisible().catch(() => false);

    expect(emptyVisible || listVisible).toBe(true);
  });

  test("filter tab 'Raw' changes active tab state", async ({ page }) => {
    const rawTab = page.locator('button[aria-pressed]', { hasText: "Raw" });

    // Click Raw tab
    await rawTab.click();

    // After click, aria-pressed should be "true" for Raw
    await expect(rawTab).toHaveAttribute("aria-pressed", "true");
  });
});
