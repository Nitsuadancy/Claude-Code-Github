-- End-to-end checks for the Manna schema. Run with ON_ERROR_STOP; any failed
-- expectation raises an exception. See supabase/README.md.

-- Helpers -------------------------------------------------------------------
create or replace function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), false);
  if uid is null then execute 'set role anon'; else execute 'set role authenticated'; end if;
end $$;

create or replace function pg_temp.expect_error(stmt text, fragment text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if position(lower(fragment) in lower(sqlerrm)) = 0 then
      raise exception 'Expected error containing "%", got "%" for: %', fragment, sqlerrm, stmt;
    end if;
    return;
  end;
  raise exception 'Expected an error containing "%" but it succeeded: %', fragment, stmt;
end $$;

create or replace function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then raise exception 'Check failed: %', what; end if;
end $$;

-- People --------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'chef@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'bea@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'admin@example.com'),
  ('00000000-0000-0000-0000-00000000000d', 'dan@example.com');
select pg_temp.check((select count(*) = 4 from public.profiles), 'profiles created by trigger');
update public.profiles set name = 'Bea Foodie', role = 'foodie' where id = '00000000-0000-0000-0000-00000000000b';
update public.profiles set is_admin = true where id = '00000000-0000-0000-0000-00000000000c';

-- Chef sets up a kitchen ------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
update public.profiles set name = 'Ada Chef', role = 'chef' where id = auth.uid();
select pg_temp.expect_error($$ update public.profiles set is_admin = true where id = auth.uid() $$, 'row-level security');
select pg_temp.expect_error(
  $$ insert into public.restaurants (owner_id, name, verified) values (auth.uid(), 'Sneaky', true) $$,
  'row-level security');
insert into public.restaurants (id, owner_id, name, chef_name, cuisine, working_days, open_time, close_time, timezone)
  values ('10000000-0000-0000-0000-000000000001', auth.uid(), 'Ada''s Kitchen', 'Ada Chef', 'Italian',
          array['monday','tuesday','wednesday','thursday','friday','saturday','sunday'], '00:00', '23:59', 'UTC');
select pg_temp.expect_error($$ update public.restaurants set verified = true $$, 'only the manna team');
select pg_temp.expect_error($$ update public.restaurants set status = 'live' $$, 'after review');
insert into public.menu_items (id, restaurant_id, name, price_cents, daily_limit) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Baked Ziti', 1350, 3),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Garlic Knots', 600, null);
insert into public.restaurant_documents (restaurant_id, kind, storage_path, file_name) values
  ('10000000-0000-0000-0000-000000000001', 'government-id', 'docs/id.pdf', 'id.pdf'),
  ('10000000-0000-0000-0000-000000000001', 'food-handler', 'docs/card.pdf', 'card.pdf');
select pg_temp.expect_error(
  $$ update public.restaurant_documents set review_status = 'approved' $$, 'row-level security');
insert into public.restaurant_addresses (restaurant_id, address)
  values ('10000000-0000-0000-0000-000000000001', '12 Elm St, Orlando');
update public.restaurants set status = 'pending_review';

-- Not visible to customers until approved ------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select count(*) = 0 from public.restaurants), 'pending kitchen hidden from customers');
select pg_temp.check((select count(*) = 0 from public.menu_items), 'pending menu hidden from customers');
select pg_temp.expect_error(
  $$ select public.place_order('10000000-0000-0000-0000-000000000001',
       '[{"menu_item_id":"20000000-0000-0000-0000-000000000001","quantity":1}]') $$,
  'isn''t taking orders');

-- Admin approves --------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_error($$ select public.approve_restaurant('10000000-0000-0000-0000-000000000001') $$, 'only the manna team');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_error($$ select public.approve_restaurant('10000000-0000-0000-0000-000000000001') $$, 'approve the food handler');
update public.restaurant_documents set review_status = 'approved', reviewed_by = auth.uid(), reviewed_at = now();
select public.approve_restaurant('10000000-0000-0000-0000-000000000001');

-- Customer orders; prices and limits come from the server ---------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select verified and status = 'live' from public.restaurants), 'kitchen live and verified');
select pg_temp.expect_error(
  $$ insert into public.orders (customer_id, restaurant_id, subtotal_cents, movement_fee_cents, total_cents, estimated_ready_at)
     values (auth.uid(), '10000000-0000-0000-0000-000000000001', 1, 0, 1, now()) $$,
  'permission denied');
select pg_temp.check((select count(*) = 0 from public.restaurant_addresses), 'kitchen address private');
create temp table first_order as
  select public.place_order('10000000-0000-0000-0000-000000000001',
    '[{"menu_item_id":"20000000-0000-0000-0000-000000000001","quantity":2},
      {"menu_item_id":"20000000-0000-0000-0000-000000000002","quantity":1}]',
    'No nuts please', null, 300) as id;
select pg_temp.check((select subtotal_cents = 3300 and movement_fee_cents = 165 and pickup_address = ''
                             and tip_cents = 300 and total_cents = 3765 and customer_note = 'No nuts please'
                      from public.orders where id = (select id from first_order)), 'server-side totals');
select pg_temp.check((select count(*) = 1 from public.order_status_events where order_id = (select id from first_order)), 'placed event');
select pg_temp.expect_error(
  $$ select public.place_order('10000000-0000-0000-0000-000000000001',
       '[{"menu_item_id":"20000000-0000-0000-0000-000000000001","quantity":2}]') $$,
  'only 1 baked ziti left');
select pg_temp.expect_error(
  $$ select public.place_order('10000000-0000-0000-0000-000000000001',
       '[{"menu_item_id":"20000000-0000-0000-0000-000000000001","quantity":1}]', '', null, 999999) $$,
  'tip must be');
select pg_temp.expect_error($$ select public.set_order_status((select id from first_order), 'accepted') $$, 'order not found');
select pg_temp.expect_error($$ select public.add_review((select id from first_order), 5, '{}', 'Great') $$, 'after it');

-- Other customers can't see it ------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select pg_temp.check((select count(*) = 0 from public.orders), 'orders private to customer and kitchen');
select pg_temp.check((select count(*) = 0 from public.order_lines), 'order lines private');
select pg_temp.act_as(null);
select pg_temp.check((select count(*) = 1 from public.restaurants), 'signed-out visitors see live kitchens');
select pg_temp.check((select count(*) = 0 from public.orders), 'signed-out visitors see no orders');

-- Kitchen works the order -----------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select pg_temp.check((select count(*) = 1 from public.orders), 'kitchen sees its order');
select pg_temp.expect_error($$ select public.set_order_status((select id from first_order), 'ready') $$, 'can''t move');
select public.set_order_status((select id from first_order), 'accepted');
select public.set_chef_note((select id from first_order), 'Fresh out of the oven!');
select public.set_order_status((select id from first_order), 'preparing');
select public.set_order_status((select id from first_order), 'ready');
select public.set_order_status((select id from first_order), 'completed');
select pg_temp.check((select count(*) = 5 from public.order_status_events where order_id = (select id from first_order)), 'five events');
select pg_temp.expect_error($$ select public.set_order_status((select id from first_order), 'declined') $$, 'can''t move');

-- Customer reviews, once ------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select pickup_address = '12 Elm St, Orlando' from public.orders where id = (select id from first_order)),
  'address shared once accepted');
select pg_temp.check((select chef_note = 'Fresh out of the oven!' from public.orders), 'customer sees chef note');
select public.add_review((select id from first_order), 5, array['Tasted like home'], 'Wonderful');
select pg_temp.check((select customer_name = 'Bea F.' from public.reviews), 'review shows first name and initial');
select pg_temp.check((select rating_sum = 5 and rating_count = 1 from public.restaurants), 'rating updated');
select pg_temp.expect_error($$ select public.add_review((select id from first_order), 4, '{}', 'Again') $$, 'duplicate key');

-- Opening hours, including overnight shifts ----------------------------------
reset role;
update public.restaurants set working_days = array['thursday'], open_time = '20:00', close_time = '02:00';
select pg_temp.check((select public.kitchen_open_at(r, '2026-11-05 21:00+00') from public.restaurants r), 'Thu 9pm open');
select pg_temp.check((select public.kitchen_open_at(r, '2026-11-06 01:00+00') from public.restaurants r), 'Fri 1am belongs to Thursday');
select pg_temp.check((select not public.kitchen_open_at(r, '2026-11-05 01:00+00') from public.restaurants r), 'Thu 1am belongs to Wednesday');
select pg_temp.check((select not public.kitchen_open_at(r, '2026-11-06 03:00+00') from public.restaurants r), 'Fri 3am closed');

select 'All Manna database checks passed' as result;
