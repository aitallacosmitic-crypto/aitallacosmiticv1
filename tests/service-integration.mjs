// Destructive test fixtures are limited to a *fresh local CLI* instance. Never use production credentials.
import { createClient } from "@supabase/supabase-js";
import { randomUUID as uuid } from "node:crypto";
import assert from "node:assert/strict";
const url = process.env.API_URL;
if (
  url !== "http://127.0.0.1:54321" ||
  process.env.DISPOSABLE_SUPABASE !== "yes"
)
  throw Error("Requires a fresh disposable local Supabase instance");
const client = (key) =>
    createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  admin = client(process.env.SERVICE_ROLE_KEY),
  anon = () => client(process.env.ANON_KEY),
  ok = (r) => {
    if (r.error) throw Error(r.error.message);
    return r.data;
  };
const a = anon(),
  b = anon(),
  staff = anon(),
  password = uuid() + "Aa!";
async function signup(c, role) {
  const email = `test-${uuid()}@example.test`;
  const r = role
    ? ok(
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        }),
      )
    : ok(await c.auth.signUp({ email, password }));
  assert.ok(r.user.id);
  if (!role)
    ok(
      await admin.auth.admin.updateUserById(r.user.id, { email_confirm: true }),
    );
  if (role)
    ok(await admin.from("user_roles").insert({ user_id: r.user.id, role }));
  ok(await c.auth.signInWithPassword({ email, password }));
  return r.user.id;
}
const uid = await signup(a),
  uid2 = await signup(b);
await signup(staff, "product_manager");
const products = ok(
  await a.from("products").select("id,name_ar,price").eq("sku", "face"),
);
assert.equal(products.length, 1);
const pid = products[0].id;
ok(
  await staff.rpc("adjust_stock", {
    product: pid,
    delta: 3,
    reason: "Integration-test fixture",
  }),
);
assert.ok(
  (await a.rpc("adjust_stock", { product: pid, delta: 1, reason: "Not staff" }))
    .error,
);
const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aMycAAAAASUVORK5CYII=",
    "base64",
  ),
  path = `${pid}/${uuid()}.png`;
ok(
  await staff.storage
    .from("product-images")
    .upload(path, png, { contentType: "image/png" }),
);
assert.ok(
  (
    await a.storage
      .from("product-images")
      .upload(`forbidden-${uuid()}.png`, png, { contentType: "image/png" })
  ).error,
);
ok(await staff.storage.from("product-images").remove([path]));
const cart = [{ id: pid, qty: 3 }],
  delivery = {
    name: "Test Buyer",
    phone: "0600000000",
    city: "Test",
    address: "Test address",
  },
  quote = ok(await a.rpc("quote_order", { cart, coupon: "" }));
assert.equal(quote.total, 507.45);
const payload = {
  cart,
  delivery,
  coupon: "",
  expected_total: quote.total,
  request_key: uuid(),
};
const results = await Promise.all([
  a.rpc("place_order", payload),
  b.rpc("place_order", { ...payload, request_key: uuid() }),
]);
assert.equal(
  results.filter((x) => !x.error).length,
  1,
  "Exactly one customer gets the last three units",
);
const winner = results[0].error ? b : a,
  loser = winner === a ? b : a;
const order = ok(
  await winner.from("orders").select("id,idempotency_key,user_id").single(),
);
assert.equal(
  ok(
    await winner.rpc("place_order", {
      ...payload,
      request_key: order.idempotency_key,
    }),
  ),
  order.id,
);
assert.deepEqual(
  ok(await loser.from("orders").select().eq("id", order.id)),
  [],
);
assert.equal(
  ok(await a.from("products").select("stock").eq("id", pid).single()).stock,
  0,
);
assert.ok(
  (await winner.from("orders").update({ total: 0 }).eq("id", order.id)).error,
);
assert.equal(
  ok(
    await admin
      .from("inventory_movements")
      .select("id")
      .eq("order_id", order.id),
  ).length,
  1,
);
assert.notEqual(uid, uid2);
ok(await a.auth.signOut());
ok(await b.auth.signOut());
ok(await staff.auth.signOut());
console.log(
  "Passed: real local Auth signup/login/logout, RBAC, Storage upload, contested stock, retry idempotency, totals, customer isolation.",
);
