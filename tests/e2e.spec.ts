import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

test.describe("ScamShield AI — E2E & WCAG Accessibility Suite", () => {
  test("1. Desktop layout, WCAG 2.2 AA compliance, progressbars, and zero console errors", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.locator("h1")).toContainText("Spot digital scams in seconds.");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("main#main-content")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeAttached();

    const progressBars = page.getByRole("progressbar");
    await expect(progressBars).toHaveCount(4);

    const axeResults = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(axeResults.violations).toEqual([]);

    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test("2. Switching demo scenarios updates verdict and Recent Scans restores prior scans", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("CRITICAL SCAM").first()).toBeVisible();
    await page.getByRole("button", { name: "Genuine Delivery Alert" }).click();
    await expect(page.getByText("LOOKS SAFE").first()).toBeVisible({ timeout: 10000 });

    const recentBar = page.locator("section[aria-label='Recent scans']");
    await expect(recentBar).toBeVisible();
    await recentBar.getByRole("button").nth(1).click();
    await expect(page.getByText("CRITICAL SCAM").first()).toBeVisible();
  });

  test("3. Language toggle switches guidance to Hindi and AI Guard modal restores focus on Escape", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: "हिन्दी" }).click();
    await expect(page.locator("section[aria-label='Scan verdict summary']")).toContainText(
      /[\u0900-\u097F]/,
      { timeout: 10000 }
    );

    const guardButton = page.getByRole("button", { name: "AI Guard" });
    await guardButton.focus();
    await guardButton.click();
    await expect(page.getByRole("dialog", { name: /Prompt architecture/i })).toBeVisible();

    const modalAxe = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(modalAxe.violations).toEqual([]);

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(guardButton).toBeFocused();
  });

  test("4. Command palette passes accessibility audit and closes on Escape", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const paletteBtn = page.getByRole("button", { name: "Open quick command menu" });
    await paletteBtn.focus();
    await paletteBtn.click();
    await expect(page.getByRole("dialog", { name: "Quick actions" })).toBeVisible();

    const paletteAxe = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(paletteAxe.violations).toEqual([]);

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Quick actions" })).toHaveCount(0);
    await expect(paletteBtn).toBeFocused();
  });

  test("5. Test AI Override triggers prompt-injection shield and Clear + validation work accessibly", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: "Test AI Override" }).click();
    await expect(page.getByText("AI Override Blocked")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("http://bit.ly/sbi-kyc-verify-now").first()).toBeVisible();

    await page.getByRole("button", { name: "Clear message and screenshot" }).click();
    await page.getByRole("button", { name: "Scan Message Now" }).click();
    const validationAlert = page.locator("#scanner-validation-error");
    await expect(validationAlert).toHaveAttribute("role", "alert");
    await expect(validationAlert).toContainText("at least 5 characters");
    await expect(page.getByLabel("Suspicious message text")).toHaveAttribute("aria-invalid", "true");
  });

  test("6. Mobile viewport (390x844) renders with zero overflow and zero axe violations", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.locator("h1")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(overflow).toBe(false);

    const mobileAxe = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(mobileAxe.violations).toEqual([]);
  });
});
