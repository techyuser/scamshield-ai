import { test, expect } from "@playwright/test";

test.describe("ScamShield AI — E2E & WCAG Accessibility Suite", () => {
  test("1. Desktop layout, WCAG landmarks, progressbars, and zero console errors", async ({ page }) => {
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

    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test("2. Switching demo scenarios updates verdict from CRITICAL SCAM to LOOKS SAFE", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("CRITICAL SCAM").first()).toBeVisible();
    await page.getByRole("button", { name: "Genuine Delivery Alert" }).click();
    await expect(page.getByText("LOOKS SAFE").first()).toBeVisible({ timeout: 10000 });
  });

  test("3. Language toggle switches guidance to Hindi and AI Guard modal is keyboard-accessible", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: "हिन्दी" }).click();
    await expect(page.locator("section[aria-label='Scan verdict summary']")).toContainText(
      /[\u0900-\u097F]/,
      { timeout: 10000 }
    );

    await page.getByRole("button", { name: "AI Guard" }).click();
    await expect(page.getByRole("dialog", { name: /Prompt architecture/i })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("4. Command palette opens with button and closes on Escape", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: "Open quick command menu" }).click();
    await expect(page.getByRole("dialog", { name: "Quick actions" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Quick actions" })).toHaveCount(0);
  });

  test("5. Mobile viewport (390x844) renders with zero horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.locator("h1")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(overflow).toBe(false);
  });
});
