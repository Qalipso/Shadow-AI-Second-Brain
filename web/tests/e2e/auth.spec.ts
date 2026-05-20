import { test, expect } from "@playwright/test";
import { TEST_CREDENTIALS, isSupabaseAvailable } from "./helpers";

/**
 * Auth flow E2E tests.
 *
 * Scenarios covered:
 *   1. Root path (/) redirects to /dashboard (or /login when auth gating is
 *      active — the app currently redirects / → /dashboard unconditionally).
 *   2. /login page renders the correct UI depending on Supabase availability:
 *      - With Supabase env: full LoginForm with email + password fields.
 *      - Without Supabase env (dev mode): fallback banner + bypass link.
 *   3. Email and password fields are present and functional.
 *   4. Submit button is present and has the correct label.
 *   5. Invalid credentials show an error message (Supabase env required).
 */

test.describe("Auth flow", () => {
  test("root / redirects to /dashboard", async ({ page }) => {
    await page.goto("/");
    // Allow the redirect to settle (server-side redirect is synchronous)
    await page.waitForURL(/\/(dashboard|login)/, { timeout: 10_000 });
    const url = page.url();
    expect(url).toMatch(/\/(dashboard|login)/);
  });

  test("login page renders at /login", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Page title contains "Shadow"
    await expect(page).toHaveTitle(/Shadow/i);

    // Heading is visible
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
    await expect(heading).toContainText("Sign in to Shadow");
  });

  test("dev mode: fallback banner visible when Supabase env is absent", async ({
    page,
  }) => {
    const supabaseUp = await isSupabaseAvailable(page);

    if (supabaseUp) {
      test.skip(true, "Supabase env is configured — skipping dev-mode check");
      return;
    }

    // Banner text
    await expect(
      page.locator("text=Dev mode — auth disabled")
    ).toBeVisible();

    // Bypass link to /dashboard must be present
    const bypassLink = page.locator('a[href="/dashboard"]');
    await expect(bypassLink).toBeVisible();
    await expect(bypassLink).toContainText("Continue to dashboard");
  });

  test("dev mode: bypass link navigates to /dashboard", async ({ page }) => {
    const supabaseUp = await isSupabaseAvailable(page);

    if (supabaseUp) {
      test.skip(true, "Supabase env is configured — skipping dev-mode bypass");
      return;
    }

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const bypassLink = page.locator('a[href="/dashboard"]');
    await bypassLink.click();
    await page.waitForURL("**/dashboard", { timeout: 10_000 });
    expect(page.url()).toContain("/dashboard");
  });

  test("login form: email and password fields are visible (Supabase env required)", async ({
    page,
  }) => {
    const supabaseUp = await isSupabaseAvailable(page);

    if (!supabaseUp) {
      test.skip(true, "Supabase env absent — LoginForm not rendered");
      return;
    }

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Email input
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toBeVisible();

    // Password input
    const passwordInput = page.locator('input[name="password"]');
    await expect(passwordInput).toBeVisible();

    // Submit button
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toContainText("Sign in");
  });

  test("login form: can type into email and password fields", async ({
    page,
  }) => {
    const supabaseUp = await isSupabaseAvailable(page);

    if (!supabaseUp) {
      test.skip(true, "Supabase env absent — LoginForm not rendered");
      return;
    }

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');

    await emailInput.fill(TEST_CREDENTIALS.email);
    await passwordInput.fill(TEST_CREDENTIALS.password);

    await expect(emailInput).toHaveValue(TEST_CREDENTIALS.email);
    await expect(passwordInput).toHaveValue(TEST_CREDENTIALS.password);
  });

  test("login form: submit with valid credentials redirects to /dashboard", async ({
    page,
  }) => {
    const supabaseUp = await isSupabaseAvailable(page);

    if (!supabaseUp) {
      test.skip(
        true,
        "Supabase env absent — cannot test real credential login"
      );
      return;
    }

    if (
      TEST_CREDENTIALS.email === "test@shadow.local" ||
      TEST_CREDENTIALS.password === "test-password-placeholder"
    ) {
      test.skip(
        true,
        "Real test credentials not set (E2E_EMAIL / E2E_PASSWORD)"
      );
      return;
    }

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await page.locator('input[name="email"]').fill(TEST_CREDENTIALS.email);
    await page.locator('input[name="password"]').fill(TEST_CREDENTIALS.password);
    await page.locator('button[type="submit"]').click();

    // Successful login navigates to /dashboard
    await page.waitForURL("**/dashboard", { timeout: 15_000 });
    expect(page.url()).toContain("/dashboard");
  });

  test("login form: invalid credentials show error message", async ({
    page,
  }) => {
    const supabaseUp = await isSupabaseAvailable(page);

    if (!supabaseUp) {
      test.skip(true, "Supabase env absent — no form to submit");
      return;
    }

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await page
      .locator('input[name="email"]')
      .fill("nonexistent@shadow.invalid");
    await page.locator('input[name="password"]').fill("wrong-password-xyz");
    await page.locator('button[type="submit"]').click();

    // Error message should appear — the exact text comes from Supabase
    const errorEl = page.locator(
      "p.text-xs:not([class*='zinc']):not([class*='tracking'])"
    );
    await expect(errorEl).toBeVisible({ timeout: 10_000 });
  });

  test("login form: mode toggle switches between Sign in and Sign up", async ({
    page,
  }) => {
    const supabaseUp = await isSupabaseAvailable(page);

    if (!supabaseUp) {
      test.skip(true, "Supabase env absent — LoginForm not rendered");
      return;
    }

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Default mode: "password" — submit says "Sign in"
    await expect(page.locator('button[type="submit"]')).toContainText(
      "Sign in"
    );

    // Toggle to signup
    const toggleButton = page.locator(
      'button[type="button"]:has-text("Need an account? Sign up")'
    );
    await toggleButton.click();

    await expect(page.locator('button[type="submit"]')).toContainText(
      "Create account"
    );
  });
});
