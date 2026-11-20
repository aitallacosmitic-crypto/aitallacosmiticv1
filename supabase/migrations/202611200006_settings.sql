alter table public.site_settings add column instagram_url text check(instagram_url ~ '^https://'),add column facebook_url text check(facebook_url ~ '^https://'),add column seo_ar text,add column seo_fr text,add column seo_en text;
-- URL-safe SKU is used for the canonical product route.
alter table public.products add constraint safe_sku check(sku ~ '^[A-Za-z0-9_-]{1,80}$');
