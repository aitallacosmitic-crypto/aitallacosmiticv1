// Runs only with disposable local Supabase, never a shared/hosted database.
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
test("real customer signs in, searches, buys with a quantity offer and sees the saved order", async ({
  page,
}) => {
  test.skip(
    process.env.DISPOSABLE_SUPABASE !== "yes",
    "Requires disposable local Supabase services",
  );
  const api = process.env.API_URL;
  if (api !== "http://127.0.0.1:54321") throw Error("Local services required");
  const { SERVICE_ROLE_KEY, ANON_KEY } = process.env;
  const admin = createClient(api, SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    }),
    staff = createClient(api, ANON_KEY!, { auth: { persistSession: false } });
  const password = randomUUID() + "Aa!",
    email = `buyer-${randomUUID()}@example.test`,
    manager = `manager-${randomUUID()}@example.test`;
  const ok = <T>(r: { data: T; error: unknown }) => {
    if (r.error) throw Error("Cannot provision disposable fixture");
    return r.data;
  };
  ok(
    await admin.auth.admin.createUser({ email, password, email_confirm: true }),
  );
  const staffUser = ok(
    await admin.auth.admin.createUser({
      email: manager,
      password,
      email_confirm: true,
    }),
  ).user!;
  ok(
    await admin
      .from("user_roles")
      .insert({ user_id: staffUser.id, role: "product_manager" }),
  );
  ok(await staff.auth.signInWithPassword({ email: manager, password }));
  const p = ok(
    await staff.from("products").select("id").eq("sku", "slow").single(),
  )!;
  ok(
    await staff.rpc("adjust_stock", {
      product: p.id,
      delta: 3,
      reason: "Browser test fixture",
    }),
  );
  await page.goto("/account");
  await page.getByLabel("البريد الإلكتروني").fill(email);
  await page.getByLabel("كلمة المرور").fill(password);
  await page.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "حسابي", exact: true }),
  ).toBeVisible();
  await page.goto("/catalog?q=Anti-Repousse");
  await page.getByRole("heading", { name: "زيت تباطؤ نمو الشعر" }).click();
  await page.getByRole("button", { name: "+", exact: true }).click();
  await page.getByRole("button", { name: "أضيفي إلى السلة" }).click();
  await page.getByRole("link", { name: "سلة التسوق" }).click();
  await page.getByRole("link", { name: "إتمام الطلب" }).click();
  await page.getByLabel("الاسم الكامل").fill("Test Buyer");
  await page.getByLabel("رقم الهاتف").fill("0600000000");
  await page.getByLabel("المدينة", { exact: true }).fill("Test city");
  await page.getByLabel("عنوان التوصيل").fill("Test delivery address");
  await page.getByRole("button", { name: "مراجعة الطلب" }).click();
  await expect(page.locator(".totals")).toContainText("358");
  await page.getByRole("button", { name: "تأكيد الطلب" }).click();
  await expect(page).toHaveURL(/confirmation\//);
  await expect(
    page.getByRole("heading", { name: "تم استلام طلبك" }),
  ).toBeVisible();
  await expect(page.locator("h2")).toContainText("AA-");
  await page.goto("/orders");
  await expect(page.locator(".listRow")).toHaveCount(1);
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "منطقة مخصصة للإدارة" }),
  ).toBeVisible();
});
