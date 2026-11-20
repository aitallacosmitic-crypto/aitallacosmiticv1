-- Only IDs, quantities, code and delivery information come from the browser.
CREATE FUNCTION private.quote (cart jsonb, coupon text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SET search_path = ''
  AS $$
DECLARE
  r record;
  p public.products;
  s public.site_settings;
  promo public.promotions;
  unit numeric;
  line numeric;
  gross numeric := 0;
  net numeric := 0;
  fee numeric;
  lines jsonb := '[]';
BEGIN
  IF length(coalesce(coupon, '')) > 40 OR octet_length(cart::text) > 12000 THEN
    RAISE EXCEPTION 'Invalid request';
  END IF;
  IF cart IS NULL OR jsonb_typeof(cart) <> 'array' OR jsonb_array_length(cart)
    NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'Invalid cart';
  END IF;
  IF EXISTS (
    SELECT
      1
    FROM
      jsonb_array_elements(cart) x
    GROUP BY
      x ->> 'id'
    HAVING
      count(*) > 1) THEN
  RAISE EXCEPTION 'Duplicate item';
END IF;
  SELECT
    *
  INTO
    STRICT s
  FROM
    public.site_settings
  WHERE
    id;
  FOR r IN
  SELECT
    (x ->> 'id')::uuid id,
    (x ->> 'qty')::int qty
  FROM
    jsonb_array_elements(cart) x
ORDER BY
  1 LOOP
    SELECT
      *
    INTO
      STRICT p
    FROM
      public.products
    WHERE
      id = r.id
      AND active
      AND published
    FOR UPDATE;
    IF r.qty IS NULL OR r.qty NOT BETWEEN 1 AND 99 OR p.stock < r.qty THEN
      RAISE EXCEPTION 'Stock unavailable';
    END IF;
    unit := coalesce(p.sale_price, p.price);
    line := round(unit * r.qty * (1 - greatest (
          CASE WHEN r.qty >= 2 THEN
            p.tier_two
          ELSE
            0
          END, CASE WHEN r.qty >= 3 THEN
            p.tier_three
          ELSE
            0
          END) / 100), 2);
    gross := gross + p.price * r.qty;
    net := net + line;
    lines := lines || jsonb_build_object('id', p.id, 'qty', r.qty, 'unit', p.price, 'line', line, 'name_ar', p.name_ar, 'name_fr', p.name_fr, 'name_en', p.name_en);
  END LOOP;
  IF nullif (trim(coupon), '') IS NOT NULL THEN
    SELECT
      *
    INTO
      promo
    FROM
      public.promotions
    WHERE
      code = upper(trim(coupon))
      AND active
      AND (starts_at IS NULL
        OR starts_at <= now())
      AND (ends_at IS NULL
        OR ends_at > now())
      AND minimum <= net
    FOR UPDATE;
    IF NOT found OR (promo.usage_limit IS NOT NULL AND (
      SELECT
        count(*)
      FROM
        public.promotion_usage
      WHERE
        promotion_id = promo.id) >= promo.usage_limit) THEN
      RAISE EXCEPTION 'Invalid promotion';
    END IF;
    net := greatest (0, net - CASE WHEN promo.kind = 'percent' THEN
        round(net * promo.amount / 100, 2)
      ELSE
        promo.amount
      END);
  END IF;
  fee := CASE WHEN net >= s.free_threshold THEN
    0
  ELSE
    s.shipping_fee
  END;
  RETURN jsonb_build_object('subtotal', gross, 'discount', gross - net, 'shipping', fee, 'total', net + fee, 'lines', lines, 'promo', promo.id);
END
$$;

CREATE FUNCTION public.quote_order (cart jsonb, coupon text DEFAULT '') returns jsonb language plpgsql security definer set search_path=''
AS $$
BEGIN
  IF auth.uid () IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;
  RETURN private.quote (cart, coupon) - 'promo';
END
$$;

CREATE FUNCTION public.place_order (cart jsonb, coupon text, delivery jsonb, request_key uuid, expected_total numeric)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  u uuid := auth.uid ();
  q jsonb;
  oid uuid;
  prior jsonb;
  l jsonb;
  payload jsonb := jsonb_build_array(cart, coupon, delivery, expected_total);
BEGIN
  IF jsonb_typeof(delivery) IS DISTINCT FROM 'object' OR octet_length(delivery::text) > 6000 OR octet_length(cart::text) > 12000 OR length(coalesce(coupon, '')) > 40 THEN
    RAISE EXCEPTION 'Invalid request';
  END IF;
  IF u IS NULL OR request_key IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;
  PERFORM
    1
  FROM
    public.customers
  WHERE
    id = u
    AND active
  FOR UPDATE;
  IF NOT found THEN
    RAISE EXCEPTION 'Account unavailable';
  END IF;
  SELECT
    id,
    request
  INTO
    oid,
    prior
  FROM
    public.orders
  WHERE
    user_id = u
    AND idempotency_key = request_key;
  IF found THEN
    IF prior <> payload THEN
      RAISE EXCEPTION 'Conflicting retry';
    END IF;
    RETURN oid;
  END IF;
  IF (
    SELECT
      count(*)
    FROM
      public.orders
    WHERE
      user_id = u AND created_at > now() - interval '1 hour') >= 5 THEN
    RAISE EXCEPTION 'Order limit reached';
  END IF;
  IF NOT (
    SELECT
      cod
    FROM
      public.site_settings
    WHERE
      id) THEN
    RAISE EXCEPTION 'Checkout unavailable';
  END IF;
  IF NOT (coalesce(length(trim(delivery ->> 'name')), 0) BETWEEN 2 AND 100 AND coalesce(delivery ->> 'phone', '') ~ '^\+?[0-9 ]{8,20}$' and coalesce(length(trim(delivery->>'city')),0) between 1 and 100 and coalesce(length(trim(delivery->>'address')),0) between 5 and 500 and length(coalesce(delivery->>'instructions','')) <= 500) THEN
    RAISE EXCEPTION 'Invalid delivery information';
  END IF;
  q := private.quote (cart, coupon);
  IF expected_total IS DISTINCT FROM (q ->> 'total')::numeric THEN
    RAISE EXCEPTION 'Price changed; review your order';
  END IF;
  INSERT INTO public.orders (user_id, idempotency_key, request, name, phone, city, address, instructions, subtotal, discount, shipping, total)
  VALUES
    (u, request_key, payload, trim(delivery ->> 'name'), delivery ->> 'phone', trim(delivery ->> 'city'), trim(delivery ->> 'address'), coalesce(delivery ->> 'instructions', ''),
      (q ->> 'subtotal')::numeric, (q ->> 'discount')::numeric, (q ->> 'shipping')::numeric, expected_total)
  RETURNING
    id
  INTO
    oid;
  FOR l IN
  SELECT
    *
  FROM
    jsonb_array_elements(q -> 'lines')
    LOOP
      INSERT INTO public.order_items (order_id, product_id, name_ar, name_fr, name_en, quantity, unit_price, line_total)
        VALUES (oid, (l ->> 'id')::uuid, l ->> 'name_ar', l ->> 'name_fr', l ->> 'name_en', (l ->> 'qty')::int, (l ->> 'unit')::numeric, (l ->> 'line')::numeric);
      UPDATE
        public.products
      SET
        stock = stock - (l ->> 'qty')::int,
        sold = sold + (l ->> 'qty')::int
      WHERE
        id = (l ->> 'id')::uuid;
      INSERT INTO public.inventory_movements (product_id, quantity, reason, order_id, actor)
        VALUES ((l ->> 'id')::uuid, - (l ->> 'qty')::int, 'order', oid, u);
    END LOOP;
  IF q ->> 'promo' IS NOT NULL THEN
    INSERT INTO public.promotion_usage (promotion_id, order_id)
      VALUES ((q ->> 'promo')::uuid, oid);
  END IF;
  INSERT INTO public.order_status_history (order_id, status)
    VALUES (oid, 'pending');
  RETURN oid;
END
$$;

CREATE FUNCTION public.adjust_stock (product uuid, delta integer, reason text)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
BEGIN
  IF NOT private.staff ('product_manager') OR delta IS NULL OR delta = 0 OR coalesce(length(trim(reason)), 0)
    NOT BETWEEN 1 AND 300 THEN
    RAISE EXCEPTION 'Adjustment rejected';
  END IF;
  UPDATE
    public.products
  SET
    stock = stock + delta
  WHERE
    id = product
    AND stock + delta >= 0;
  IF NOT found THEN
    RAISE EXCEPTION 'Invalid stock';
  END IF;
  INSERT INTO public.inventory_movements (product_id, quantity, reason, actor)
    VALUES (product, delta, reason, auth.uid ());
END
$$;

CREATE FUNCTION public.update_order (oid uuid, next_status public.order_state, tracking_number text)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  current_state public.order_state;
  r record;
BEGIN
  IF NOT private.staff ('order_manager') OR coalesce(length(tracking_number), 0) > 160 THEN
    RAISE EXCEPTION 'Update rejected';
  END IF;
  SELECT
    status
  INTO
    STRICT current_state
  FROM
    public.orders
  WHERE
    id = oid
  FOR UPDATE;
  IF current_state <> next_status AND NOT ((current_state = 'pending' AND next_status IN ('confirmed', 'cancelled')) OR (current_state = 'confirmed' AND next_status IN ('preparing', 'cancelled')) OR (current_state = 'preparing' AND next_status IN ('shipped', 'cancelled')) OR (current_state = 'shipped' AND next_status IN ('delivered', 'returned')) OR (current_state = 'delivered' AND next_status = 'returned')) THEN
    RAISE EXCEPTION 'Invalid transition';
  END IF;
  IF current_state <> next_status THEN
    INSERT INTO public.order_status_history (order_id, status)
      VALUES (oid, next_status);
    IF next_status IN ('cancelled', 'returned') THEN
      FOR r IN
      SELECT
        *
      FROM
        public.order_items
      WHERE
        order_id = oid
      ORDER BY
        product_id LOOP
          UPDATE
            public.products
          SET
            stock = stock + r.quantity,
            sold = sold - r.quantity
          WHERE
            id = r.product_id;
          INSERT INTO public.inventory_movements (product_id, quantity, reason, order_id, actor)
            VALUES (r.product_id, r.quantity, next_status::text, oid, auth.uid ());
        END LOOP;
    END IF;
  END IF;
  UPDATE
    public.orders
  SET
    status = next_status,
    tracking = coalesce(tracking_number, '')
  WHERE
    id = oid;
END
$$;

REVOKE ALL ON ALL functions IN SCHEMA private FROM public;

GRANT EXECUTE ON FUNCTION private.staff (public.staff_role[]) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.place_order (jsonb, text, jsonb, uuid, numeric), public.quote_order (jsonb, text), public.adjust_stock (uuid, integer, text), public.update_order (uuid, public.order_state, text) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.place_order (jsonb, text, jsonb, uuid, numeric), public.quote_order (jsonb, text), public.adjust_stock (uuid, integer, text), public.update_order (uuid, public.order_state, text) TO authenticated;
