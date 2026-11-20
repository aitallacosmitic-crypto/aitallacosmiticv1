import { readFile, writeFile } from "node:fs/promises";
import { loadEnv } from "vite";
import { createClient } from "@supabase/supabase-js";
const env = {
  ...loadEnv("production", process.cwd(), "VITE_"),
  ...process.env,
};
const base = env.VITE_SITE_URL;
if (!base) {
  console.log(
    "No canonical domain configured: preview build is non-indexable.",
  );
  await writeFile("dist/robots.txt", "User-agent: *\nDisallow: /\n");
} else {
  const origin = new URL(base);
  if (origin.protocol !== "https:" || origin.origin !== base)
    throw Error(
      "VITE_SITE_URL must be an HTTPS origin without a trailing slash",
    );
  const routes = [
    "/",
    "/catalog",
    "/about",
    "/contact",
    "/faq",
    "/privacy",
    "/terms",
    "/shipping",
  ];
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY)
    throw Error("Production domain requires Supabase configuration");
  const db = createClient(
    env.VITE_SUPABASE_URL,
    env.VITE_SUPABASE_PUBLISHABLE_KEY,
  );
  for (let offset = 0; ; offset += 200) {
    const r = await db
      .from("products")
      .select("sku")
      .eq("active", true)
      .eq("published", true)
      .order("sku")
      .range(offset, offset + 199);
    if (r.error) throw Error("Unable to read published catalog for sitemap");
    routes.push(...r.data.map((x) => "/products/" + encodeURIComponent(x.sku)));
    if (r.data.length < 200) break;
  }
  await writeFile(
    "dist/sitemap.xml",
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      routes.map((r) => `  <url><loc>${base}${r}</loc></url>`).join("\n") +
      "\n</urlset>\n",
  );
  await writeFile(
    "dist/robots.txt",
    (await readFile("public/robots.txt", "utf8")) +
      "\nSitemap: " +
      base +
      "/sitemap.xml\n",
  );
}
