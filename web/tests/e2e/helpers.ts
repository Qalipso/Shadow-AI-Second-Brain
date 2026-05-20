import { Page, expect } from "@playwright/test";

/**
 * Test credentials loaded from environment variables.
 * Set E2E_EMAIL and E2E_PASSWORD before running auth tests, or they fall
 * back to placeholder values that will intentionally fail against a real
 * Supabase instance (used only when verifying the form renders correctly).
 */
export const TEST_CREDENTIALS = {
  email: process.env.E2E_EMAIL ?? "test@shadow.local",
  password: process.env.E2E_PASSWORD ?? "test-password-placeholder",
};

/**
 * Returns true when the running app has Supabase credentials configured,
 * inferred by checking whether the login page shows the real LoginForm vs
 * the dev-mode fallback banner.
 */
export async function isSupabaseAvailable(page: Page): Promise<boolean> {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  // Dev fallback banner contains "Dev mode — auth disabled"
  const devBanner = page.locator("text=Dev mode — auth disabled");
  return !(await devBanner.isVisible());
}

/**
 * Waits for the app shell (Sidebar) to be visible after navigation,
 * confirming the authenticated (app) layout rendered.
 */
export async function waitForAppShell(page: Page): Promise<void> {
  // Sidebar is rendered in every (app) layout route
  await page.waitForSelector("nav", { timeout: 15_000 });
}

/**
 * Navigate to a route and wait for the main content area to be ready.
 */
export async function gotoAndWait(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}
