CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM public;

GRANT usage ON SCHEMA private TO anon, authenticated;

CREATE FUNCTION private.staff (VARIADIC roles public.staff_role[])
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
  AS $$
  SELECT
    EXISTS (
      SELECT
      FROM
        public.user_roles
      WHERE
        user_id = (
          SELECT
            auth.uid ())
          AND (ROLE = 'super_admin'
            OR ROLE = ANY (roles)))
$$;

REVOKE ALL ON FUNCTION private.staff (public.staff_role[]) FROM public;

GRANT EXECUTE ON FUNCTION private.staff (public.staff_role[]) TO anon, authenticated;

CREATE FUNCTION private.new_user ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
BEGIN
  INSERT INTO public.profiles (id)
    VALUES (NEW.id);
  INSERT INTO public.customers (id)
    VALUES (NEW.id);
  INSERT INTO public.wishlists (user_id)
    VALUES (NEW.id);
  RETURN new;
END
$$;

CREATE TRIGGER provision_customer
  AFTER INSERT ON auth.users FOR EACH ROW
  EXECUTE FUNCTION private.new_user ();

INSERT INTO public.profiles (id)
SELECT
  id
FROM
  auth.users
ON CONFLICT
  DO NOTHING;

INSERT INTO public.customers (id)
SELECT
  id
FROM
  auth.users
ON CONFLICT
  DO NOTHING;

INSERT INTO public.wishlists (user_id)
SELECT
  id
FROM
  auth.users
ON CONFLICT
  DO NOTHING;

DO $$
DECLARE
  t text;
BEGIN
  foreach t IN ARRAY ARRAY['profiles', 'user_roles', 'customers', 'addresses', 'categories', 'products', 'product_images', 'promotions', 'site_settings', 'orders', 'order_items', 'promotion_usage', 'reviews', 'wishlists', 'wishlist_items', 'inventory_movements', 'order_status_history', 'order_notes', 'admin_activity_logs'] LOOP
    EXECUTE format('alter table public.%I enable row level security', t);
    EXECUTE format('revoke all on public.%I from public, anon, authenticated', t);
    EXECUTE format('grant select on public.%I to authenticated', t);
  END LOOP;
END
$$;

GRANT SELECT ON public.categories, public.products, public.product_images, public.reviews, public.site_settings TO anon;

CREATE POLICY self_role ON public.user_roles
  FOR SELECT
  USING (user_id = (
    SELECT
      auth.uid ())
      OR private.staff ('super_admin'));

CREATE POLICY profile_read ON public.profiles
  FOR SELECT
  USING (id = (
    SELECT
      auth.uid ())
      OR private.staff ('order_manager', 'customer_support'));

CREATE POLICY profile_edit ON public.profiles
  FOR UPDATE
  USING (id = (
    SELECT
      auth.uid ()))
  WITH CHECK (id = (
    SELECT
      auth.uid ()));

GRANT UPDATE (display_name) ON public.profiles TO authenticated;

CREATE POLICY customer_read ON public.customers
  FOR SELECT
  USING (id = (
    SELECT
      auth.uid ())
      OR private.staff ('order_manager', 'customer_support'));

CREATE POLICY customer_edit ON public.customers
  FOR UPDATE
  USING (private.staff ('super_admin'));

GRANT UPDATE (active) ON public.customers TO authenticated;

CREATE POLICY owned_address ON public.addresses
  FOR ALL
  USING (user_id = (
    SELECT
      auth.uid ()))
  WITH CHECK (user_id = (
    SELECT
      auth.uid ()));

GRANT INSERT, UPDATE, DELETE ON public.addresses TO authenticated;

CREATE POLICY category_read ON public.categories
  FOR SELECT
  USING (TRUE);

CREATE POLICY product_read ON public.products
  FOR SELECT
  USING ((active
    AND published)
    OR private.staff ('product_manager'));

CREATE POLICY image_read ON public.product_images
  FOR SELECT
  USING (EXISTS (
    SELECT
    FROM
      public.products p
    WHERE
      p.id = product_id));

DO $$
DECLARE
  t text;
BEGIN
  foreach t IN ARRAY ARRAY['categories', 'products', 'product_images', 'promotions'] LOOP
    EXECUTE format('create policy manage on public.%I for all using(private.staff(''product_manager'')) with check(private.staff(''product_manager''))', t);
  END LOOP;
END
$$;

GRANT INSERT, UPDATE, DELETE ON public.categories, public.product_images, public.promotions TO authenticated;

GRANT INSERT (sku, category_id, name_ar, name_fr, name_en, desc_ar, desc_fr, desc_en, price, sale_price, active, published, featured, tier_two, tier_three), UPDATE (sku, category_id, name_ar, name_fr, name_en, desc_ar, desc_fr, desc_en, price, sale_price, active, published, featured, tier_two, tier_three), DELETE ON public.products TO authenticated;

CREATE POLICY settings_read ON public.site_settings
  FOR SELECT
  USING (TRUE);

CREATE POLICY settings_edit ON public.site_settings
  FOR UPDATE
  USING (private.staff ('super_admin'));

GRANT UPDATE ON public.site_settings TO authenticated;

CREATE POLICY orders_read ON public.orders
  FOR SELECT
  USING (user_id = (
    SELECT
      auth.uid ())
      OR private.staff ('order_manager', 'customer_support'));

CREATE POLICY items_read ON public.order_items
  FOR SELECT
  USING (EXISTS (
    SELECT
    FROM
      public.orders o
    WHERE
      o.id = order_id));

CREATE POLICY history_read ON public.order_status_history
  FOR SELECT
  USING (EXISTS (
    SELECT
    FROM
      public.orders o
    WHERE
      o.id = order_id));

CREATE POLICY notes_staff ON public.order_notes
  FOR SELECT
  USING (private.staff ('order_manager', 'customer_support'));

CREATE POLICY notes_add ON public.order_notes
  FOR INSERT
  WITH CHECK (private.staff ('order_manager', 'customer_support')
  AND actor = auth.uid ());

GRANT INSERT (order_id, note) ON public.order_notes TO authenticated;

CREATE POLICY usage_read ON public.promotion_usage
  FOR SELECT
  USING (private.staff ('product_manager'));

CREATE POLICY review_read ON public.reviews
  FOR SELECT
  USING ((approved
    AND EXISTS (
      SELECT
      FROM
        public.products p
      WHERE
        p.id = product_id))
        OR user_id = (
          SELECT
            auth.uid ())
            OR private.staff ('product_manager'));

CREATE POLICY review_add ON public.reviews
  FOR INSERT
  WITH CHECK (user_id = (
    SELECT
      auth.uid ())
      AND NOT approved
      AND EXISTS (
        SELECT
        FROM
          public.orders o
          JOIN public.order_items i ON i.order_id = o.id
        WHERE
          o.user_id = auth.uid ()
          AND o.status = 'delivered'
          AND i.product_id = reviews.product_id));

CREATE POLICY review_moderate ON public.reviews
  FOR UPDATE
  USING (private.staff ('product_manager'));

GRANT INSERT (user_id, product_id, body, rating), UPDATE (approved) ON public.reviews TO authenticated;

CREATE POLICY list_read ON public.wishlists
  FOR SELECT
  USING (user_id = (
    SELECT
      auth.uid ()));

CREATE POLICY list_items ON public.wishlist_items
  FOR ALL
  USING (EXISTS (
    SELECT
    FROM
      public.wishlists l
    WHERE
      l.id = wishlist_id
      AND l.user_id = auth.uid ()))
  WITH CHECK (EXISTS (
    SELECT
    FROM
      public.wishlists l
    WHERE
      l.id = wishlist_id
      AND l.user_id = auth.uid ()));

GRANT INSERT (wishlist_id, product_id), DELETE ON public.wishlist_items TO authenticated;

CREATE POLICY inventory_read ON public.inventory_movements
  FOR SELECT
  USING (private.staff ('product_manager'));

CREATE POLICY audit_read ON public.admin_activity_logs
  FOR SELECT
  USING (private.staff ('super_admin'));

CREATE FUNCTION private.audit ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
BEGIN
  INSERT INTO public.admin_activity_logs (actor, resource, operation, record_key)
    VALUES (auth.uid (), tg_table_name, tg_op, coalesce(to_jsonb (new) ->> 'id', to_jsonb (old) ->> 'id'));
  RETURN NULL;
END
$$;

DO $$
DECLARE
  t text;
BEGIN
  foreach t IN ARRAY ARRAY['user_roles', 'products', 'product_images', 'categories', 'promotions', 'orders', 'order_notes', 'customers', 'site_settings', 'reviews', 'inventory_movements'] LOOP
    EXECUTE format('create trigger audit_change after insert or update or delete on public.%I for each row execute function private.audit()', t);
  END LOOP;
END
$$;

