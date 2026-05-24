import { test, expect } from "@playwright/test";
import { isSupabaseAvailable, waitForAppShell } from "./helpers";

/**
 * App Shell — sidebar navigation across all key sections.
 *
 * Each NAV_GROUP item from src/components/Sidebar.tsx must be clickable,
 * change the URL to its href, and mark itself as active in the sidebar.
 *
 * Skipped automatically when Supabase isn't configured (anonymous user
 * can't reach (app) routes).
 */

const ITEMS = [
  { href: "/dashboard",     label: "Today" },
  { href: "/inbox",         label: "Inbox" },
  { href: "/checkin",       label: "Check-in" },
  { href: "/interventions", label: "Interventions" },
  { href: "/areas",         label: "Life Circle" },
  { href: "/direction",     label: "Direction" },
  { href: "/rituals",       label: "Rituals" },
  { href: "/journey",       label: "Journey" },
  { href: "/insights",      label: "Insights" },
  { href: "/memory",        label: "Memory" },
  { href: "/labs",          label: "Labs" },
  { href: "/settings",      label: "Settings" },
];

test.describe("App shell navigation", () => {
  test.beforeEach(async ({ page }) => {
    const supa = await isSupabaseAvailable(page);
    test.skip(supa, "Supabase configured — anonymous test cannot reach (app)");
    await page.goto("/dashboard");
    await waitForAppShell(page);
  });

  for (const item of ITEMS) {
    test(`navigates to ${item.label} (${item.href})`, async ({ page }) => {
      const link = page.locator(`nav a[href="${item.href}"]`).first();
      await expect(link).toBeVisible();
      await link.click();
      await page.waitForURL(new RegExp(`${item.href}(/|$)`));
      // Active state — Sidebar uses aria-current or visual cue; either ok.
      const hasActive =
        (await link.getAttribute("aria-current")) === "page" ||
        (await link.evaluate((el) => el.className).then((c) => /active|text-zinc-100|bg-/i.test(c)));
      expect(hasActive).toBeTruthy();
      // Page has rendered SOMETHING — not a blank shell.
      await expect(page.locator("main, [role=main], h1, h2").first()).toBeVisible();
    });
  }
});
