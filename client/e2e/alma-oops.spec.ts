import { test, expect } from "@playwright/test";

// Verifies navigation to the new ALMA OOPS page works without crashing.
test.describe("ALMA OOPS page", () => {
  test("navigates from the dashboard to ALMA OOPS", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Automation Dashboard")).toBeVisible();

    await page.getByRole("button", { name: "Alma oops" }).click();

    // Page header renders (scoped to <header> to avoid matching the nav button).
    await expect(page.locator("header").getByText("Alma oops")).toBeVisible();

    // The view settles into one of its valid states: failure cards with an
    // occurrences badge, the empty state, or an error.
    const occurrences = page.getByText(/Occurred \d+ time/i);
    const empty = page.getByText(/No Alma oops failures/i);
    const errored = page.getByText(/failed to load/i);
    await expect(occurrences.or(empty).or(errored).first()).toBeVisible({ timeout: 30_000 });
  });
});
