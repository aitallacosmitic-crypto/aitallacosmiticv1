import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { randomUUID as uuid } from "node:crypto";
// Ephemeral PostgreSQL engine. These platform fixtures never go in a release migration.
const pg = new PGlite(),
  customer = uuid(),
  other = uuid(),
  pm = uuid(),
  om = uuid(),
  support = uuid(),
  root = uuid(),
  ship = {
    name: "Test customer",
    phone: "0600000000",
    city: "Test city",
    address: "Delivery address",
  },
  q = (s, p) => pg.query(s, p),
  one = async (s, p) => (await q(s, p)).rows[0];
let product,
  order,
  rows,
  request = uuid(),
  promo;
async function login(id, role = id ? "authenticated" : "anon") {
  await pg.exec("reset role");
  await q("select set_config('request.jwt.claim.sub',$1,false)", [id || ""]);
  await pg.exec("set role " + role);
}
const quote = (cart, code = "") =>
  one("select public.quote_order($1,$2) as result", [
    JSON.stringify(cart),
    code,
  ]);
const place = (cart, total, key = uuid(), code = "", delivery = ship) =>
  one("select public.place_order($1,$2,$3,$4,$5) id", [
    JSON.stringify(cart),
    code,
    JSON.stringify(delivery),
    key,
    total,
  ]);
before(async () => {
  await pg.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;create function storage.extension(text) returns text language sql as $$select split_part($1,'.',-1)$$;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;`,
  );
  for (const file of (await readdir("supabase/migrations")).sort()) {
    await pg.exec(await readFile("supabase/migrations/" + file, "utf8"));
  }
  for (const id of [customer, other, pm, om, support, root])
    await q("insert into auth.users values($1)", [id]);
  for (const [id, role] of [
    [pm, "product_manager"],
    [om, "order_manager"],
    [support, "customer_support"],
    [root, "super_admin"],
  ])
    await q("insert into user_roles(user_id,role) values($1,$2)", [id, role]);
  product = (await one("select id from products where sku='face'")).id;
  rows = [{ id: product, qty: 3 }];
});
after(() => pg.close());
test("Legacy records: six published products, original photos, zero invented stock; anonymous reads only", async () => {
  await login(null);
  assert.equal((await q("select * from products")).rows.length, 6);
  assert.equal((await one("select sum(stock) s from products")).s, 0);
  assert.equal((await q("select * from product_images")).rows.length, 6);
  await assert.rejects(q("select * from customers"));
  await assert.rejects(q("insert into categories default values"));
  await assert.rejects(quote(rows));
});
test("Product role can create/edit/retire draft products but cannot read customer records or edit stock directly", async () => {
  await login(pm);
  const p = await one(
    `insert into products(sku,name_ar,name_fr,name_en,price) values('test','Test','Test','Test',50) returning id`,
  );
  await q("update products set price=55 where id=$1", [p.id]);
  assert.equal((await q("select * from customers")).rows.length, 1);
  await assert.rejects(q("update products set stock=100 where id=$1", [p.id]));
  await login(null);
  assert.equal(
    (await q("select * from products where id=$1", [p.id])).rows.length,
    0,
  );
  await login(pm);
  await q("delete from products where id=$1", [p.id]);
  await q("select adjust_stock($1,15,$2)", [product, "Counted inventory"]);
  await assert.rejects(
    q("select adjust_stock($1,-20,$2)", [product, "Invalid"]),
  );
});
test("Storage policies separate brand and catalog managers, reject disallowed extensions", async () => {
  await login(pm);
  await q(
    "insert into storage.objects(bucket_id,name) values('product-images','item.webp')",
  );
  await assert.rejects(
    q(
      "insert into storage.objects(bucket_id,name) values('brand-assets','brand.png')",
    ),
  );
  await assert.rejects(
    q(
      "insert into storage.objects(bucket_id,name) values('product-images','item.svg')",
    ),
  );
  await login(customer);
  await assert.rejects(
    q(
      "insert into storage.objects(bucket_id,name) values('product-images','item.png')",
    ),
  );
});
test("Customer RLS isolates roles, addresses, wishlists, profiles and order-management RPCs", async () => {
  await login(customer);
  await assert.rejects(
    q("insert into user_roles(user_id,role) values($1,'super_admin')", [
      customer,
    ]),
  );
  await assert.rejects(
    q("select adjust_stock($1,100,$2)", [product, "Not staff"]),
  );
  await q("insert into addresses(user_id,city,address) values($1,$2,$3)", [
    customer,
    "Test",
    "Address",
  ]);
  assert.equal((await q("select * from profiles")).rows.length, 1);
  await q(
    "insert into wishlist_items(wishlist_id,product_id) select id,$1 from wishlists",
    [product],
  );
  await login(other);
  assert.equal((await q("select * from addresses")).rows.length, 0);
  assert.equal((await q("select * from wishlist_items")).rows.length, 0);
});
test("Quantity tiers and trusted server prices, stock validation, atomic failure", async () => {
  await login(customer);
  assert.equal((await quote([{ id: product, qty: 2 }])).result.total, 358.2);
  assert.equal((await quote(rows)).result.total, 507.45);
  await assert.rejects(place(rows, 1));
  await assert.rejects(
    place(rows, 507.45, uuid(), " ", { ...ship, phone: "bad" }),
  );
  await assert.rejects(quote([{ id: product, qty: 16 }]));
  await assert.rejects(quote([...rows, ...rows]));
  await assert.rejects(quote([{ id: product, qty: -1 }]));
  assert.equal(
    (await one("select stock from products where id=$1", [product])).stock,
    15,
  );
  assert.equal((await q("select * from orders")).rows.length, 0);
});
test("Promotion limit, server fee, consistent totals, idempotent retries, order snapshots", async () => {
  await login(root);
  await q("update site_settings set shipping_fee=15,free_threshold=500");
  promo = (
    await one(
      "insert into promotions(code,kind,amount,active,usage_limit) values('SAVE','fixed',20,true,1) returning id",
    )
  ).id;
  await login(customer);
  const price = (await quote(rows, "save")).result;
  assert.equal(price.total, 502.45);
  assert.equal(price.shipping, 15);
  order = (await place(rows, price.total, request, "save")).id;
  assert.equal((await place(rows, price.total, request, "save")).id, order);
  await assert.rejects(
    place(rows, price.total, request, "save", { ...ship, name: "Other" }),
  );
  await assert.rejects(quote(rows, "SAVE"));
  assert.equal(
    (await one("select stock from products where id=$1", [product])).stock,
    12,
  );
  assert.equal((await q("select * from order_items")).rows.length, 1);
  await assert.rejects(q("update orders set total=0 where id=$1", [order]));
  await login(other);
  for (const tbl of ["orders", "order_items", "order_status_history"])
    assert.equal((await q("select * from " + tbl)).rows.length, 0);
});
test("Support can add private notes but not ship; only allowed transitions, restock once", async () => {
  await login(support);
  await q("insert into order_notes(order_id,note) values($1,$2)", [
    order,
    "Private test note",
  ]);
  await assert.rejects(q("select update_order($1,'confirmed','')", [order]));
  await login(customer);
  assert.equal((await q("select * from order_notes")).rows.length, 0);
  await login(om);
  await assert.rejects(q("select update_order($1,'delivered','')", [order]));
  await q("select update_order($1,'confirmed','')", [order]);
  await q("select update_order($1,'cancelled','')", [order]);
  await q("select update_order($1,'cancelled','')", [order]);
  assert.equal(
    (await one("select stock from products where id=$1", [product])).stock,
    15,
  );
  assert.equal((await q("select * from order_status_history")).rows.length, 3);
  await login(root);
  assert.ok((await q("select * from admin_activity_logs")).rows.length > 0);
});
test("Account suspension prevents checkout; denied reviews before delivery", async () => {
  await login(root);
  await q("update customers set active=false where id=$1", [other]);
  await login(other);
  await assert.rejects(place(rows, 507.45));
  await assert.rejects(
    q(
      "insert into reviews(user_id,product_id,rating,body) values($1,$2,5,$3)",
      [other, product, "Test"],
    ),
  );
});
