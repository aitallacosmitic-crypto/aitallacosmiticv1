-- Only IDs, quantities, code and delivery information come from the browser.
create function private.quote(cart jsonb,coupon text) returns jsonb language plpgsql set search_path='' as $$
declare r record;p public.products;s public.site_settings;promo public.promotions;unit numeric;line numeric;gross numeric:=0;net numeric:=0;fee numeric;lines jsonb:='[]';begin
if length(coalesce(coupon,''))>40 or octet_length(cart::text)>12000 then raise exception 'Invalid request';end if;
if cart is null or jsonb_typeof(cart)<>'array' or jsonb_array_length(cart) not between 1 and 50 then raise exception 'Invalid cart';end if;
if exists(select 1 from jsonb_array_elements(cart) x group by x->>'id' having count(*)>1) then raise exception 'Duplicate item';end if;
select * into strict s from public.site_settings where id;
for r in select (x->>'id')::uuid id,(x->>'qty')::int qty from jsonb_array_elements(cart) x order by 1 loop
select * into strict p from public.products where id=r.id and active and published for update;
if r.qty is null or r.qty not between 1 and 99 or p.stock<r.qty then raise exception 'Stock unavailable';end if;
unit:=coalesce(p.sale_price,p.price);line:=round(unit*r.qty*(1-greatest(case when r.qty>=2 then p.tier_two else 0 end,case when r.qty>=3 then p.tier_three else 0 end)/100),2);
gross:=gross+p.price*r.qty;net:=net+line;lines:=lines||jsonb_build_object('id',p.id,'qty',r.qty,'unit',p.price,'line',line,'name_ar',p.name_ar,'name_fr',p.name_fr,'name_en',p.name_en);end loop;
if nullif(trim(coupon),'') is not null then select * into promo from public.promotions where code=upper(trim(coupon)) and active and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()) and minimum<=net for update;
if not found or (promo.usage_limit is not null and (select count(*) from public.promotion_usage where promotion_id=promo.id)>=promo.usage_limit) then raise exception 'Invalid promotion';end if;
net:=greatest(0,net-case when promo.kind='percent' then round(net*promo.amount/100,2) else promo.amount end);end if;
fee:=case when net>=s.free_threshold then 0 else s.shipping_fee end;
return jsonb_build_object('subtotal',gross,'discount',gross-net,'shipping',fee,'total',net+fee,'lines',lines,'promo',promo.id);end $$;
create function public.quote_order(cart jsonb,coupon text default '') returns jsonb language plpgsql security definer set search_path='' as $$ begin if auth.uid() is null then raise exception 'Sign in required';end if;return private.quote(cart,coupon)-'promo';end $$;
create function public.place_order(cart jsonb,coupon text,delivery jsonb,request_key uuid,expected_total numeric) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();q jsonb;oid uuid;prior jsonb;l jsonb;payload jsonb:=jsonb_build_array(cart,coupon,delivery,expected_total);begin
if jsonb_typeof(delivery) is distinct from 'object' or octet_length(delivery::text)>6000 or octet_length(cart::text)>12000 or length(coalesce(coupon,''))>40 then raise exception 'Invalid request';end if;
if u is null or request_key is null then raise exception 'Sign in required';end if;
perform 1 from public.customers where id=u and active for update;if not found then raise exception 'Account unavailable';end if;
select id,request into oid,prior from public.orders where user_id=u and idempotency_key=request_key;if found then if prior<>payload then raise exception 'Conflicting retry';end if;return oid;end if;
if (select count(*) from public.orders where user_id=u and created_at>now()-interval '1 hour')>=5 then raise exception 'Order limit reached';end if;
if not (select cod from public.site_settings where id) then raise exception 'Checkout unavailable';end if;
if not(coalesce(length(trim(delivery->>'name')),0) between 2 and 100 and coalesce(delivery->>'phone','') ~ '^\+?[0-9 ]{8,20}$' and coalesce(length(trim(delivery->>'city')),0) between 1 and 100 and coalesce(length(trim(delivery->>'address')),0) between 5 and 500 and length(coalesce(delivery->>'instructions',''))<=500) then raise exception 'Invalid delivery information';end if;
q:=private.quote(cart,coupon);if expected_total is distinct from (q->>'total')::numeric then raise exception 'Price changed; review your order';end if;
insert into public.orders(user_id,idempotency_key,request,name,phone,city,address,instructions,subtotal,discount,shipping,total) values(u,request_key,payload,trim(delivery->>'name'),delivery->>'phone',trim(delivery->>'city'),trim(delivery->>'address'),coalesce(delivery->>'instructions',''),(q->>'subtotal')::numeric,(q->>'discount')::numeric,(q->>'shipping')::numeric,expected_total) returning id into oid;
for l in select * from jsonb_array_elements(q->'lines') loop
insert into public.order_items(order_id,product_id,name_ar,name_fr,name_en,quantity,unit_price,line_total) values(oid,(l->>'id')::uuid,l->>'name_ar',l->>'name_fr',l->>'name_en',(l->>'qty')::int,(l->>'unit')::numeric,(l->>'line')::numeric);
update public.products set stock=stock-(l->>'qty')::int,sold=sold+(l->>'qty')::int where id=(l->>'id')::uuid;
insert into public.inventory_movements(product_id,quantity,reason,order_id,actor) values((l->>'id')::uuid,-(l->>'qty')::int,'order',oid,u);end loop;
if q->>'promo' is not null then insert into public.promotion_usage(promotion_id,order_id) values((q->>'promo')::uuid,oid);end if;
insert into public.order_status_history(order_id,status) values(oid,'pending');return oid;end $$;
create function public.adjust_stock(product uuid,delta integer,reason text) returns void language plpgsql security definer set search_path='' as $$ begin
if not private.staff('product_manager') or delta is null or delta=0 or coalesce(length(trim(reason)),0) not between 1 and 300 then raise exception 'Adjustment rejected';end if;
update public.products set stock=stock+delta where id=product and stock+delta>=0;if not found then raise exception 'Invalid stock';end if;
insert into public.inventory_movements(product_id,quantity,reason,actor) values(product,delta,reason,auth.uid());end $$;
create function public.update_order(oid uuid,next_status public.order_state,tracking_number text) returns void language plpgsql security definer set search_path='' as $$ declare current_state public.order_state;r record;begin
if not private.staff('order_manager') or coalesce(length(tracking_number),0)>160 then raise exception 'Update rejected';end if;select status into strict current_state from public.orders where id=oid for update;
if current_state<>next_status and not ((current_state='pending' and next_status in ('confirmed','cancelled')) or (current_state='confirmed' and next_status in ('preparing','cancelled')) or (current_state='preparing' and next_status in ('shipped','cancelled')) or (current_state='shipped' and next_status in ('delivered','returned')) or (current_state='delivered' and next_status='returned')) then raise exception 'Invalid transition';end if;
if current_state<>next_status then insert into public.order_status_history(order_id,status) values(oid,next_status);
if next_status in ('cancelled','returned') then for r in select * from public.order_items where order_id=oid order by product_id loop update public.products set stock=stock+r.quantity,sold=sold-r.quantity where id=r.product_id;insert into public.inventory_movements(product_id,quantity,reason,order_id,actor) values(r.product_id,r.quantity,next_status::text,oid,auth.uid());end loop;end if;end if;
update public.orders set status=next_status,tracking=coalesce(tracking_number,'') where id=oid;end $$;
revoke all on all functions in schema private from public;
grant execute on function private.staff(public.staff_role[]) to anon,authenticated;
revoke all on function public.place_order(jsonb,text,jsonb,uuid,numeric),public.quote_order(jsonb,text),public.adjust_stock(uuid,integer,text),public.update_order(uuid,public.order_state,text) from public,anon;
grant execute on function public.place_order(jsonb,text,jsonb,uuid,numeric),public.quote_order(jsonb,text),public.adjust_stock(uuid,integer,text),public.update_order(uuid,public.order_state,text) to authenticated;
