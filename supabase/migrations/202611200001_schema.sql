-- Apply to an empty project or an inspected, backed-up database. Collisions fail closed.
CREATE TYPE public.staff_role AS enum (
  'super_admin',
  'product_manager',
  'order_manager',
  'customer_support'
);

CREATE TYPE public.order_state AS enum (
  'pending',
  'confirmed',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
  'returned'
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '' CHECK (length(display_name) <= 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  ROLE public.staff_role NOT NULL,
  UNIQUE (user_id, ROLE)
);

CREATE TABLE public.customers (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT TRUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  city text NOT NULL CHECK (length(city) BETWEEN 1 AND 100),
  address text NOT NULL CHECK (length(address) BETWEEN 1 AND 500)
);

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  slug text UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  name_ar text NOT NULL,
  name_fr text NOT NULL,
  name_en text NOT NULL
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  sku text UNIQUE NOT NULL CHECK (length(sku) BETWEEN 1 AND 80),
  category_id uuid REFERENCES public.categories,
  name_ar text NOT NULL,
  name_fr text NOT NULL,
  name_en text NOT NULL,
  desc_ar text NOT NULL DEFAULT '',desc_fr text not null default '',
  desc_en text NOT NULL DEFAULT '',
  price numeric(10, 2) NOT NULL CHECK (price > 0),
  sale_price numeric(10, 2) CHECK (sale_price > 0 AND sale_price < price),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  active boolean NOT NULL DEFAULT FALSE,
  published boolean NOT NULL DEFAULT FALSE,
  featured boolean NOT NULL DEFAULT FALSE,
  sold integer NOT NULL DEFAULT 0 CHECK (sold >= 0),
  tier_two numeric(5, 2) NOT NULL DEFAULT 10 CHECK (tier_two BETWEEN 0 AND 100),
  tier_three numeric(5, 2) NOT NULL DEFAULT 15 CHECK (tier_three BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  product_id uuid NOT NULL REFERENCES public.products ON DELETE CASCADE,
  url text NOT NULL CHECK (url ~ '^https://'),
  position integer NOT NULL DEFAULT 0,
  UNIQUE (product_id, url)
);

CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  code text UNIQUE NOT NULL CHECK (code ~ '^[A-Z0-9_-]{1,40}$'),
  kind text NOT NULL CHECK (kind IN ('percent', 'fixed')),
  amount numeric(10, 2) NOT NULL CHECK (amount > 0 AND (kind = 'fixed' OR amount <= 100)),
  minimum numeric(10, 2) NOT NULL DEFAULT 0 CHECK (minimum >= 0),
  usage_limit integer CHECK (usage_limit > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean NOT NULL DEFAULT FALSE,
  CHECK (ends_at > starts_at)
);

CREATE TABLE public.site_settings (
  id boolean PRIMARY KEY DEFAULT TRUE CHECK (id),
  brand text NOT NULL DEFAULT 'Ait Alla Cosmetic',
  phone text NOT NULL DEFAULT '+212617139424' CHECK (phone ~ '^\+?[0-9]{8,15}$'),
  whatsapp text NOT NULL DEFAULT '212617139424' CHECK (whatsapp ~ '^[0-9]{8,15}$'),
  shipping_fee numeric(10, 2) NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  free_threshold numeric(10, 2) CHECK (free_threshold >= 0),
  cod boolean NOT NULL DEFAULT TRUE,
  wa_confirmation boolean NOT NULL DEFAULT TRUE,
  hero_url text CHECK (hero_url ~ '^https://'),
  announcement_ar text,
  announcement_fr text,
  announcement_en text,
  legacy_hero text
);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  reference text UNIQUE NOT NULL DEFAULT ('AA-' || upper(substr(replace(gen_random_uuid ()::text, '-', ''),1,14))),user_id uuid not null references public.customers,idempotency_key uuid not null,request jsonb not null,status public.order_state not null default 'pending',name text not null,phone text not null,city text not null,address text not null,instructions text not null default '', subtotal numeric(12, 2) NOT NULL, discount numeric(12, 2) NOT NULL, shipping numeric(10, 2) NOT NULL, total numeric(12, 2) NOT NULL CHECK (total = subtotal - discount + shipping AND total >= 0), tracking text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (user_id, idempotency_key)
);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  order_id uuid NOT NULL REFERENCES public.orders,
  product_id uuid NOT NULL REFERENCES public.products,
  name_ar text NOT NULL,
  name_fr text NOT NULL,
  name_en text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10, 2) NOT NULL,
  line_total numeric(12, 2) NOT NULL,
  UNIQUE (order_id, product_id)
);

CREATE TABLE public.promotion_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  promotion_id uuid NOT NULL REFERENCES public.promotions,
  order_id uuid UNIQUE NOT NULL REFERENCES public.orders
);

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  product_id uuid NOT NULL REFERENCES public.products ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 1500),
  approved boolean NOT NULL DEFAULT FALSE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);

CREATE TABLE public.wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users ON DELETE CASCADE
);

CREATE TABLE public.wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  wishlist_id uuid NOT NULL REFERENCES public.wishlists ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products ON DELETE CASCADE,
  UNIQUE (wishlist_id, product_id)
);

CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  product_id uuid NOT NULL REFERENCES public.products,
  quantity integer NOT NULL CHECK (quantity <> 0),
  reason text NOT NULL,
  order_id uuid REFERENCES public.orders,
  actor uuid REFERENCES auth.users,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  order_id uuid NOT NULL REFERENCES public.orders,
  status public.order_state NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.order_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  order_id uuid NOT NULL REFERENCES public.orders,
  note text NOT NULL CHECK (length(note) BETWEEN 1 AND 2000),
  actor uuid NOT NULL DEFAULT auth.uid (),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.admin_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  actor uuid,
  resource text NOT NULL,
  operation text NOT NULL,
  record_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX products_catalog ON public.products (category_id, price)
WHERE
  active AND published;

CREATE INDEX orders_user_time ON public.orders (user_id, created_at DESC);

CREATE INDEX orders_status_time ON public.orders (status, created_at DESC);

CREATE INDEX movement_product ON public.inventory_movements (product_id, created_at DESC);

CREATE INDEX history_order ON public.order_status_history (order_id, created_at);

CREATE INDEX usage_promotion ON public.promotion_usage (promotion_id);
