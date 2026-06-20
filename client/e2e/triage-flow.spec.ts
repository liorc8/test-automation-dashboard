import { test, expect } from "@playwright/test";

// Critical triage user journey: Dashboard → Recent Failures → By Reason → Expand Log.
test.describe("Triage flow", () => {
  test("dashboard loads with at least one area card", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Automation Dashboard")).toBeVisible();
    // Area cards expose data-area; ensure at least one is rendered.
    await expect(page.locator("[data-area]").first()).toBeVisible();
  });

  test("navigate to Recent Failures, open By Reason (collapsed), expand a log", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-area]").first()).toBeVisible();

    // 2. Navigate into an area's Recent Failures.
    const viewFailures = page.getByRole("button", { name: /view recent failures/i }).first();
    await viewFailures.click();

    // Scope to the page <header> + exact text so we match the title, not the
    // many "View Recent Failures" buttons elsewhere (avoids strict-mode violations).
    const pageHeader = page.locator("header").getByText("Recent Failures", { exact: true });
    await expect(pageHeader).toBeVisible();

    // 3. By Reason tab — groups render and are COLLAPSED by default.
    await page.getByRole("button", { name: "By Reason" }).click();
    const firstReason = page
      .locator(".MuiAccordion-root .MuiAccordionSummary-root[aria-expanded]")
      .first();
    await expect(firstReason).toBeVisible();
    await expect(firstReason).toHaveAttribute("aria-expanded", "false");

    // 4. Expand a reason group, then run the Smart Log Parser on a FailureCard.
    await firstReason.click();
    await expect(firstReason).toHaveAttribute("aria-expanded", "true");

    // Stub the log-parser endpoint so the flow is deterministic and not dependent
    // on a live (often-expired) Jenkins log. The UI still renders the real modal.
    await page.route("**/api/logs/expand**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ available: true, lines: ["FATAL mocked log line"], source: "parsed" }),
      }),
    );

    const expandLog = page.getByRole("button", { name: /expand log/i }).first();
    await expandLog.click();

    // The log modal opens; assert its content shows either the parsed log block
    // or the 404 fallback message (robust to expired logs and older builds).
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    await expect(dialog).toContainText(/mocked log line|log file is no longer available/i);
  });
});
