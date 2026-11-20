import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("Arabic storefront, gallery navigation, category link, search and empty cart", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "الطبيعة المغربية",
  );
  await page.getByRole("button", { name: "التالي", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "العناية بالبشرة",
  );
  await page
    .getByRole("link", { name: /SOINS DU VISAGE/ })
    .first()
    .click();
  await expect(page).toHaveURL(/category=skin/);
  await page.getByRole("button", { name: "بحث", exact: true }).click();
  await page
    .getByRole("textbox", { name: "ابحثي عن منتج" })
    .last()
    .fill("cream");
  await page.locator(".searchPanel button").click();
  await expect(page).toHaveURL(/q=cream/);
  await page.getByRole("link", { name: "سلة التسوق" }).click();
  await expect(page.getByText("سلتك فارغة")).toBeVisible();
  expect(errors).toEqual([]);
});
test("mobile French and English persist, menu and FAQ are operable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator(".langBtn").click();
  await page.getByRole("button", { name: "Français" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Votre beauté",
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await page.locator(".langBtn").click();
  await page.getByRole("button", { name: "English" }).click();
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.locator("header").getByRole("link", { name: "Our story" }).click();
  await expect(page).toHaveURL(/about/);
  await page.getByRole("link", { name: "FAQ", exact: true }).click();
  await page.getByText("How can I order?").click();
  await expect(page.locator("details[open] p")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("admin denies anonymous access, has no public staff registration; custom 404", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "دخول الإدارة" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "حساب جديد" })).toHaveCount(0);
  await page.goto("/no-such-page");
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
});
for (const route of [
  "/",
  "/catalog",
  "/cart",
  "/account",
  "/admin",
  "/privacy",
])
  test("WCAG automated checks: " + route, async ({ page }) => {
    await page.goto(route);
    await page.locator("h1").waitFor();
    await page.evaluate(() => document.fonts.ready);
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      audit.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  });
