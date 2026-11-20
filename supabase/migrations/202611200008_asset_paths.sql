-- Public bucket-relative references work across dev/staging/prod without persisting a loopback host.
ALTER TABLE public.product_images
  DROP CONSTRAINT product_images_url_check,
  ADD CONSTRAINT product_images_url_check CHECK (url ~ '^https://' OR url ~ '^/storage/v1/object/public/product-images/[0-9A-Za-z_/-]+\.(jpg|jpeg|png|webp)$');

ALTER TABLE public.categories
  DROP CONSTRAINT categories_image_url_check,
  ADD CONSTRAINT categories_image_url_check CHECK (image_url ~ '^https://' OR image_url ~ '^/storage/v1/object/public/category-images/[0-9A-Za-z_-]+\.(jpg|jpeg|png|webp)$');

ALTER TABLE public.site_settings
  DROP CONSTRAINT site_settings_hero_url_check,
  ADD CONSTRAINT site_settings_hero_url_check CHECK (hero_url ~ '^https://' OR hero_url ~ '^/storage/v1/object/public/homepage-banners/[0-9A-Za-z_-]+\.(jpg|jpeg|png|webp)$');

ALTER TABLE public.site_settings
  ADD COLUMN logo_url text CHECK (logo_url ~ '^https://'
    OR logo_url ~ '^/storage/v1/object/public/brand-assets/[0-9A-Za-z_-]+\.(jpg|jpeg|png|webp)$'),
    ADD COLUMN campaign_url text CHECK (campaign_url ~ '^https://'
    OR campaign_url ~ '^/storage/v1/object/public/homepage-banners/[0-9A-Za-z_-]+\.(jpg|jpeg|png|webp)$'),
    ADD COLUMN campaign_ar text,
    ADD COLUMN campaign_fr text,
    ADD COLUMN campaign_en text,
    ADD COLUMN campaign_active boolean NOT NULL DEFAULT FALSE,
    ADD COLUMN campaign_start timestamptz,
    ADD COLUMN campaign_end timestamptz,
    ADD CONSTRAINT valid_banner_dates CHECK (campaign_end > campaign_start),
    ADD COLUMN catalog_revision bigint NOT NULL DEFAULT 0;

-- RLS can suppress the final realtime event when a product becomes private.
-- Publish a harmless revision bump, not the private product's payload.
CREATE FUNCTION private.invalidate_retirement ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
BEGIN
  UPDATE
    public.site_settings
  SET
    catalog_revision = catalog_revision + 1
  WHERE
    id;
  RETURN NULL;
END
$$;

REVOKE ALL ON FUNCTION private.invalidate_retirement () FROM public, anon, authenticated;

CREATE TRIGGER invalidate_retirement
  AFTER UPDATE OF active,
  published ON public.products FOR EACH ROW
  WHEN (old.active AND old.published AND NOT (new.active AND new.published))
  EXECUTE FUNCTION private.invalidate_retirement ();
