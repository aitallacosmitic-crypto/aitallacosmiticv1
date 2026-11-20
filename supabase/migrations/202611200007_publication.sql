-- Only public-facing resources participate in live catalog invalidation.
do $$ declare t text;begin if exists(select from pg_publication where pubname='supabase_realtime') then foreach t in array array['products','product_images','categories','site_settings'] loop if not exists(select from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t);end if;end loop;end if;end $$;
alter table public.categories add column image_url text check(image_url ~ '^https://');
alter table public.site_settings add column available_languages text[] not null default array['ar','fr','en'] check(cardinality(available_languages)>0 and available_languages <@ array['ar','en','fr']), add column currency text not null default 'MAD' check(currency='MAD');
alter table public.orders add column payment_method text not null default 'cod' check(payment_method='cod');
create index addresses_owner on public.addresses(user_id);
create index notes_by_order on public.order_notes(order_id,created_at);
create index items_product on public.order_items(product_id);
create index reviews_approved on public.reviews(product_id,created_at desc) where approved;
