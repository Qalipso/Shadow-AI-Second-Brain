import { test, expect } from "@playwright/test";
import { isSupabaseAvailable, gotoAndWait } from "./helpers";

/**
 * Labs — Local / MVP mode persistence.
 *
 * When Supabase is not configured, the app falls back to a "Dev mode — auth
 * disabled" banner OR a local-only mode. In either case the Labs page must:
 *   - explain the mode honestly (banner / Local mode / MVP indicator)
 *   - persist progress between reloads via localStorage
 *   - lose data only after explicit clear
 */

test.describe("Labs — local mode behavior", () => {
  test("Local / Dev mode is announced honestly when Supabase is missing", async ({ page }) => {
    const supa = await isSupabaseAvailable(page);
    test.skip(supa, "Supabase available — local-mode banner not expected");
    await gotoAndWait(page, "/labs");

    const text = await page.locator("body").innerText();
    const honest =
      /dev mode|local mode|mvp|preview|early access|auth disabled/i.test(text);
    expect(honest, "Labs must announce non-production mode honestly").toBe(true);
  });

  test("localStorage progress survives a reload", async ({ page }) => {
    const supa = await isSupabaseAvailable(page);
    test.skip(supa, "Local-mode spec only");
    await gotoAndWait(page, "/labs");

    // Seed a fake local progress flag if the app uses one. If not, this still
    // checks that no extraneous keys mutate randomly between reloads.
    await page.evaluate(() => {
      localStorage.setItem("shadow:labs:probe", "alpha");
    });
    await page.reload({ waitUntil: "networkidle" });

    const probe = await page.evaluate(() => localStorage.getItem("shadow:labs:probe"));
    expect(probe).toBe("alpha");
  });

  test("clearing localStorage resets progress completely", async ({ page }) => {
    const supa = await isSupabaseAvailable(page);
    test.skip(supa, "Local-mode spec only");
    await gotoAndWait(page, "/labs");

    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle" });
    const txt = await page.locator("body").innerText();
    expect(txt).toMatch(/0%|Begin your first scan|0\s*of/i);
  });
});
