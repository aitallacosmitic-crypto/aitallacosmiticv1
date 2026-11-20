ALTER TABLE public.site_settings
  ADD COLUMN instagram_url text CHECK (instagram_url ~ '^https://'),
  ADD COLUMN facebook_url text CHECK (facebook_url ~ '^https://'),
  ADD COLUMN seo_ar text,
  ADD COLUMN seo_fr text,
  ADD COLUMN seo_en text;

-- URL-safe SKU is used for the canonical product route.
ALTER TABLE public.products
  ADD CONSTRAINT safe_sku CHECK (sku ~ '^[A-Za-z0-9_-]{1,80}$');

