# Ait Alla Cosmetic · أيت علا كوسميتيك

Arabic-first Moroccan care storefront and separate staff workspace at **`/admin`**. React, strict TypeScript, Vite, self-hosted Cairo / Playfair Display / Cinzel Decorative, React Router and Supabase. No runtime Tailwind, CDN scripts, embedded advertising, client-side admin secrets or substitute product database.

**Status:** Implementation and deployment configuration, not a claim of a live production store. Without Supabase configuration the editorial homepage, navigation, language switching, information pages and WhatsApp contact work. The catalog reports unavailability and account operations fail closed. There are no fabricated products, stock levels or dashboard metrics.

## Start

Requires Node 22.12+ (see `.nvmrc`) and npm. For a local backend, install the Supabase CLI and Docker.

```sh
npm ci
cp .env.example .env.local
# Optional: launch a NEW local Supabase stack (applies supabase/migrations automatically)
supabase start
# Copy its public URL and publishable/anon key to .env.local, then:
npm run dev
```

| Variable                        | Purpose                                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`             | Public project URL from the Supabase Connect dialog.                                          |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key (or legacy **anon** key), protected by RLS.                                   |
| `VITE_SITE_URL`                 | Final canonical HTTPS origin with no trailing slash. Leave blank for a non-indexable preview. |

Vite embeds `VITE_*` at build time. **Never put a secret/service-role key, database password or SMTP credential in any `VITE_*` variable.** Restart after changing local env; rebuild the hosted frontend after changing build variables. For browser access to a local CLI from another machine, expose the gateway over an approved HTTPS origin instead of embedding localhost in a shared build.

## Architecture and routes

- `src/layout.tsx`, `home.tsx`, `style.css`, `meta.tsx`: Arabic RTL and French/English LTR storefront shell, responsive navigation, visual collections and metadata.
- `src/store.tsx`, `model.ts`, `db.ts`: public Supabase client, session/permissions, live catalog refresh, local cart, persisted language and database-backed wishlists.
- `src/catalog.tsx`, `commerce.tsx`: `/catalog`, `/products/:sku`, `/cart`, `/checkout`, `/confirmation/:id`, `/orders`, `/orders/:id`. Search/category/availability/price filters, sorting, galleries, related items, reviews, discounts, COD, server quote and unique order reference. WhatsApp supports pre-order enquiries and optional saved-order summaries.
- `src/account.tsx`, `addresses.tsx`: `/account`, `/account/reset`, registration, authentication, password recovery, customer profile and addresses.
- `src/info.tsx`: `/about`, `/contact`, `/faq`, `/privacy`, `/terms`, `/shipping` and unknown-route page.
- `src/admin/`, `admin.tsx`: isolated lazy-loaded staff panel. Delivered-revenue analytics, date ranges, weekly/monthly charts, status counts, low-stock alerts, best sellers, recent orders and CSV. Catalog CRUD, multiple images, quantity tiers, campaign codes/limits/dates, ledger-based stock adjustment, order transitions, tracking, private notes, invoices, customer directory, moderation and store settings. Amounts use **MAD**; other currencies need explicit conversion and historical currency snapshots, not a display-label change.
- `supabase/migrations/`: database is authoritative; no JS product array. [Audit](docs/AUDIT.md) and [security/permission model](docs/SECURITY.md).

### Migrations in order

| Suffix             | Contents                                                                                                                                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0001_schema`      | Profiles, roles, products/images/categories, orders/items, customers/addresses, promotions/usage, reviews, wishlists/items, inventory movements, status history, settings, activity logs and private staff notes. |
| `0002_access`      | RLS on every application table, scoped grants, new-user provisioning, owner/staff policies and audit triggers.                                                                                                    |
| `0003_commerce`    | Trusted quote, idempotent checkout, stock adjustment and status transition functions.                                                                                                                             |
| `0004_storage`     | Four limited public-image buckets with staff upload/delete policies.                                                                                                                                              |
| `0005_catalog`     | Six original products and photos, bilingual copy, English translations, 199 MAD, legacy offers, free shipping and original WhatsApp/phone. No invented stock.                                                     |
| `0006_settings`    | Social URLs, SEO descriptions and safe product routes.                                                                                                                                                            |
| `0007_publication` | Catalog realtime, language selection, category imagery, MAD/COD constraints and additional indexes.                                                                                                               |

## Connect Supabase safely

1. Create/select **staging** first. If the project already holds data, inspect it and verify a restored backup before migrating. These migrations create tables rather than replacing them; conflicting tables must be reconciled explicitly.
2. Authenticate the CLI locally (`supabase login`), `supabase link --project-ref YOUR_PROJECT_REF`, inspect `supabase migration list` and `supabase db push --dry-run`. Review every statement, then `supabase db push` after approval. Never reset a shared database. Only expose the intended public API schemas.
3. In Authentication configure site URL, exact confirmation/recovery redirects (including `/account/reset`, `/account`, `/checkout`), confirmation email and SMTP. Create the first staff identity through the dashboard's invite/create-user flow; finish its password setup. There is no admin signup page.
4. In the **trusted SQL Editor**, find the verified staff UID in Auth → Users. Assign the intended role, substituting that actual UUID below. Do not use this as a browser operation:
   ```sql
   insert into public.user_roles(user_id, role)
   values ('<verified-auth-user-uuid>'::uuid, 'super_admin')
   on conflict (user_id, role) do nothing;
   ```
   Other roles: `product_manager`, `order_manager`, `customer_support`. Sign out and back in after changing roles. Enable strong staff authentication through Auth settings.
5. Open `/admin` and enter **counted** stock via Inventory with a reason. Verify original image URLs, bilingual product naming, product claims, actual dispatch/returns terms, fees, contact information and COD policy. Product 1 has inconsistent cream/oil wording in the original. Resolve with the merchant, not guesswork.
6. Test a small order on staging from sign-in through receipt, tracking, cancellation and stock restoration. Verify another buyer cannot read it. Only then repeat the reviewed change process for production.

## Quality checks

```sh
npm test                         # Executes release SQL in ephemeral PostgreSQL (PGlite)
npx playwright install chromium
npm run test:browser             # Browser navigation, responsive/RTL/i18n, admin gate, axe
npm run build                    # TypeScript, optimized chunks and SEO artifacts
npm run preview                  # Serve dist locally
npm audit --omit=dev
```

The SQL tests simulate Supabase platform roles/storage metadata **only inside tests**. They exercise real constraints, grants and RLS. The separate CI service job boots disposable Supabase containers and tests Auth, REST, actual uploads, concurrent ordering and retry behavior, plus a signed-in browser checkout. The connected browser test is intentionally skipped without those services. Do not point fixture tests at a real business database. The local guard requires `DISPOSABLE_SUPABASE=yes` and the default loopback CLI origin. A server-only key is used only by the isolated fixture process to provision users; it is never a Vite variable or delivered to a browser.

## GitHub → hosting

GitHub hosts source and Actions, **not** the live commerce backend. `.github/workflows/checks.yml` runs on pushes and PRs with read-only repository permissions. Require both jobs before merging. No CI job migrates production automatically.

1. Review the working branch and merge only after CI and staging acceptance. In **Vercel → Add New → Project** or **Netlify → Import from Git**, authorize access to this repository. Pick the reviewed release branch as production; point PR previews to staging.
2. Use Vite, Node 22, `npm ci`, build `npm run build`, output `dist`. `vercel.json` and `netlify.toml` supply history fallback and security headers.
3. Configure the three public environment variables for the correct environment. With a canonical domain set, the build reads published SKUs from Supabase and writes absolute `sitemap.xml` and `robots.txt`; it fails rather than silently shipping a stale sitemap on a database error. Rebuild on publication to update crawl inventory. Preview builds without a domain are noindex.
4. Attach your verified HTTPS domain, update Supabase Auth redirect allowlists, redeploy, check deep links and reset emails. Inspect browser logs for CSP issues if using a custom backend domain. Set up backups, monitoring, email delivery, incident contact and legal review before accepting real orders.

Never commit `.env*` (except the empty `.env.example`), DB dumps or customer exports. Original `index.html` is preserved in the base Git revision documented in the audit.

`0008_asset_paths` allows validated bucket-relative image references in addition to the original HTTPS URLs. Uploaded image references therefore work on both the local CLI gateway and a hosted HTTPS project. The build rejects a secret or service-role key in the public Supabase-key setting.
