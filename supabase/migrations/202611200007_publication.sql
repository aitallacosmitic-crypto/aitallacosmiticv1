-- Only public-facing resources participate in live catalog invalidation.
DO $$
DECLARE
  t text;
BEGIN
  IF EXISTS (
    SELECT
    FROM
      pg_publication
    WHERE
      pubname = 'supabase_realtime') THEN
  foreach t IN ARRAY ARRAY['products', 'product_images', 'categories', 'site_settings'] LOOP
    IF NOT EXISTS (
      SELECT
      FROM
        pg_publication_tables
      WHERE
        pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t) THEN
    EXECUTE format('alter publication supabase_realtime add table public.%I', t);
  END IF;
END LOOP;
END IF;
END
$$;

ALTER TABLE public.categories
  ADD COLUMN image_url text CHECK (image_url ~ '^https://');

ALTER TABLE public.site_settings
  ADD COLUMN available_languages text[] NOT NULL DEFAULT ARRAY['ar', 'fr', 'en'] CHECK (cardinality(available_languages) > 0
    AND available_languages <@ ARRAY['ar', 'en', 'fr']),
    ADD COLUMN currency text NOT NULL DEFAULT 'MAD' CHECK (currency = 'MAD');

ALTER TABLE public.orders
  ADD COLUMN payment_method text NOT NULL DEFAULT 'cod' CHECK (payment_method = 'cod');

CREATE INDEX addresses_owner ON public.addresses (user_id);

CREATE INDEX notes_by_order ON public.order_notes (order_id, created_at);

CREATE INDEX items_product ON public.order_items (product_id);

CREATE INDEX reviews_approved ON public.reviews (product_id, created_at DESC)
WHERE
  approved;

