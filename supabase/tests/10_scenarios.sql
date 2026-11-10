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
select pg_temp.expect_error($$ update public.restaurants set founding = true $$, 'only the manna team');
select pg_temp.expect_error($$ update public.restaurants set licensed = true $$, 'only the manna team');
update public.restaurants set in_person = '[{"place": "Lantern Coffee", "when": "Saturdays"}]';
select pg_temp.expect_error($$ update public.restaurants set status = 'live' $$, 'after review');
insert into public.menu_items (id, restaurant_id, name, price_cents, daily_limit) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Baked Ziti', 1350, 3),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Garlic Knots', 600, null);
insert into public.restaurant_documents (restaurant_id, kind, storage_path, file_name) values
  ('10000000-0000-0000-0000-000000000001', 'government-id', 'docs/id.pdf', 'id.pdf'),
  ('10000000-0000-0000-0000-000000000001', 'food-handler', 'docs/card.pdf', 'card.pdf'),
  ('10000000-0000-0000-0000-000000000001', 'home-kitchen-permit', 'docs/permit.pdf', 'permit.pdf');
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
select pg_temp.expect_error($$ select public.approve_restaurant('10000000-0000-0000-0000-000000000001') $$, 'hasn''t confirmed');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
update public.restaurants set law_attested_at = now();
select pg_temp.expect_error($$ select public.refresh_licensed('10000000-0000-0000-0000-000000000001') $$, 'only the manna team');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_error($$ select public.approve_restaurant('10000000-0000-0000-0000-000000000001') $$, 'approve the food handler');
update public.restaurant_documents set review_status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where kind <> 'home-kitchen-permit';
select public.approve_restaurant('10000000-0000-0000-0000-000000000001');
select pg_temp.check((select verified and not licensed from public.restaurants), 'verified, not licensed without a permit');
update public.restaurant_documents set review_status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where kind = 'home-kitchen-permit';
select public.refresh_licensed('10000000-0000-0000-0000-000000000001');
select pg_temp.check((select licensed from public.restaurants), 'licensed once the permit is approved');

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
select pg_temp.check((select subtotal_cents = 3300 and movement_fee_cents = 264 and pickup_address = ''
                             and tip_cents = 300 and total_cents = 3864 and customer_note = 'No nuts please'
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
select pg_temp.check((select customer_name = 'Bea F.' and restaurant_name = 'Ada''s Kitchen'
                      from public.orders where id = (select id from first_order)),
  'kitchen sees the customer''s first name and initial');

-- Customers cancel before the kitchen accepts ---------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
create temp table oops as
  select public.place_order('10000000-0000-0000-0000-000000000001',
    '[{"menu_item_id":"20000000-0000-0000-0000-000000000001","quantity":1}]') as id;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_error($$ select public.cancel_order((select id from oops)) $$, 'order not found');
select pg_temp.expect_error($$ select public.cancel_order((select id from first_order)) $$, 'already accepted');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select public.cancel_order((select id from oops));
select pg_temp.check((select status = 'cancelled' from public.orders where id = (select id from oops)), 'customer cancelled');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_error($$ select public.set_order_status((select id from oops), 'accepted') $$, 'can''t move');

-- Most ordered dish -------------------------------------------------------------
select pg_temp.act_as(null);
select pg_temp.check((select count(*) = 0 from public.popular_menu_items()), 'no favorite after one order');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select public.place_order('10000000-0000-0000-0000-000000000001',
  '[{"menu_item_id":"20000000-0000-0000-0000-000000000002","quantity":1}]');
select public.place_order('10000000-0000-0000-0000-000000000001',
  '[{"menu_item_id":"20000000-0000-0000-0000-000000000002","quantity":2}]');
select pg_temp.act_as(null);
select pg_temp.check((select menu_item_id = '20000000-0000-0000-0000-000000000002' from public.popular_menu_items()),
  'garlic knots are the most ordered after three orders');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select pg_temp.check((select bool_and(movement_fee_cents = 100) from public.orders where subtotal_cents = 600),
  'small orders pay the $1 minimum fee');

-- Grower waitlist: anyone can join, only admins can read ---------------------
select pg_temp.act_as(null);
insert into public.grower_waitlist (business_name, offering, contact)
  values ('Lake Ivanhoe Honey', 'Wildflower honey', 'bees@example.com');
select pg_temp.check((select count(*) = 0 from public.grower_waitlist), 'visitors cannot read the waitlist');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select pg_temp.check((select count(*) = 0 from public.grower_waitlist), 'customers cannot read the waitlist');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select pg_temp.check((select count(*) = 1 from public.grower_waitlist), 'admins read the waitlist');

-- Customer reviews, once ------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select pickup_address = '12 Elm St, Orlando' from public.orders where id = (select id from first_order)),
  'address shared once accepted');
select pg_temp.check((select chef_note = 'Fresh out of the oven!' from public.orders), 'customer sees chef note');
select public.add_review((select id from first_order), 5, array['Tasted like home'], 'Wonderful');
select pg_temp.check((select customer_name = 'Bea F.' from public.reviews), 'review shows first name and initial');
select pg_temp.check((select rating_sum = 5 and rating_count = 1 from public.restaurants), 'rating updated');
select pg_temp.expect_error($$ select public.add_review((select id from first_order), 4, '{}', 'Again') $$, 'duplicate key');

-- Reporting and removing reviews -----------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
insert into public.review_reports (review_id, reason) values ((select id from public.reviews), 'Not a real order');
select pg_temp.check((select count(*) = 1 from public.review_reports), 'reporter sees their report');
select pg_temp.expect_error($$ insert into public.review_reports (review_id) values ((select id from public.reviews)) $$, 'duplicate key');
select pg_temp.expect_error($$ select public.remove_review((select id from public.reviews)) $$, 'only the manna team');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select count(*) = 0 from public.review_reports), 'others cannot see who reported');
select pg_temp.act_as(null);
select pg_temp.expect_error($$ insert into public.review_reports (review_id) values ((select id from public.reviews)) $$, 'permission denied');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select pg_temp.check((select count(*) = 1 from public.review_reports), 'admins see reports');

-- Help with an order ------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select pg_temp.expect_error($$ insert into public.order_issues (order_id, kind) values ((select id from first_order), 'missing') $$,
  'row-level security');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_error($$ insert into public.order_issues (order_id, kind, note) values ((select id from first_order), 'other', ' ') $$,
  'check constraint');
select pg_temp.expect_error($$ insert into public.order_issues (order_id, kind) values ((select id from first_order), 'refund-me') $$,
  'check constraint');
insert into public.order_issues (order_id, kind, note) values ((select id from first_order), 'missing', 'No jam in the box');
select pg_temp.check((select count(*) = 1 from public.order_issues), 'customer sees their request');
select pg_temp.expect_error($$ insert into public.order_issues (order_id, kind) values ((select id from first_order), 'quality') $$,
  'duplicate key');
update public.order_issues set resolved_at = now();
select pg_temp.check((select resolved_at is null from public.order_issues), 'customers cannot close their own request');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select pg_temp.check((select count(*) = 0 from public.order_issues), 'the kitchen never sees help requests');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
update public.order_issues set resolved_at = now();
select pg_temp.check((select resolved_at is not null from public.order_issues), 'the team resolves requests');

-- Order chat ------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select pg_temp.expect_error($$ insert into public.order_messages (order_id, body) values ((select id from first_order), 'hi') $$,
  'row-level security');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_error($$ insert into public.order_messages (order_id, body) values ((select id from first_order), '   ') $$,
  'check constraint');
insert into public.order_messages (order_id, body) values ((select id from first_order), 'Thank you, it was perfect!');
insert into public.order_chat_reads (order_id) values ((select id from first_order));
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select pg_temp.check((select count(*) = 1 from public.order_messages), 'the kitchen reads the customer');
insert into public.order_messages (order_id, body) values ((select id from first_order), 'So glad! See you next week.');
insert into public.message_reports (message_id) values ((select id from public.order_messages where body like 'Thank you%'));
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select pg_temp.check((select count(*) = 0 from public.order_messages), 'strangers read nothing');
select pg_temp.expect_error($$ insert into public.message_reports (message_id) values (gen_random_uuid()) $$,
  'row-level security');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select pg_temp.check((select count(*) = 1 from public.order_messages), 'the team sees only reported messages');

-- A block stops the chat both ways and hides the blocked person's messages.
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into public.user_blocks (blocked_id) values ('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select count(*) = 1 from public.order_messages), 'blocked customer''s messages hidden from the kitchen');
select pg_temp.expect_error($$ insert into public.order_messages (order_id, body) values ((select id from first_order), 'hi') $$,
  'row-level security');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select count(*) = 0 from public.user_blocks), 'nobody sees who blocked them');
select pg_temp.expect_error($$ insert into public.order_messages (order_id, body) values ((select id from first_order), 'hi') $$,
  'row-level security');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
delete from public.user_blocks;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
insert into public.order_messages (order_id, body) values ((select id from first_order), 'One more thing!');

-- The chat closes a day after pickup.
reset role;
update public.order_status_events set at = now() - interval '25 hours'
  where order_id = (select id from first_order) and status = 'completed';
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_error($$ insert into public.order_messages (order_id, body) values ((select id from first_order), 'Late!') $$,
  'row-level security');
select pg_temp.check((select count(*) = 3 from public.order_messages), 'the history stays readable');

-- Bake days ---------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
update public.restaurant_addresses set instructions = 'Cooler on the porch, ring once.', photo_path = 'r1/porch.jpg';
create temp table bake_dates as select (now() at time zone 'UTC')::date + 3 as open_day, (now() at time zone 'UTC')::date + 2 as closed_day;
update public.restaurants set order_mode = 'bake-days', bake_days = jsonb_build_array(
  jsonb_build_object('day', lower(trim(to_char((select open_day from bake_dates), 'Day'))),
    'pickupStart', '10:00', 'pickupEnd', '13:00', 'closeDaysBefore', 1),
  -- Closes three days ahead, so it's already shut for this one.
  jsonb_build_object('day', lower(trim(to_char((select closed_day from bake_dates), 'Day'))),
    'pickupStart', '10:00', 'pickupEnd', '13:00', 'closeDaysBefore', 3));
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select pg_temp.expect_error(
  $$ select public.place_order('10000000-0000-0000-0000-000000000001',
       '[{"menu_item_id":"20000000-0000-0000-0000-000000000002","quantity":1}]') $$, 'pick a bake day');
select pg_temp.expect_error(
  $$ select public.place_order('10000000-0000-0000-0000-000000000001',
       '[{"menu_item_id":"20000000-0000-0000-0000-000000000002","quantity":1}]', '', ((select open_day from bake_dates) + time '11:00') at time zone 'UTC') $$,
  'closed');
select pg_temp.expect_error(
  $$ select public.place_order('10000000-0000-0000-0000-000000000001',
       '[{"menu_item_id":"20000000-0000-0000-0000-000000000002","quantity":1}]', '', ((select closed_day from bake_dates) + time '10:00') at time zone 'UTC') $$,
  'closed');
create temp table bake_order as
  select public.place_order('10000000-0000-0000-0000-000000000001',
    '[{"menu_item_id":"20000000-0000-0000-0000-000000000002","quantity":1}]', '',
    ((select open_day from bake_dates) + time '10:00') at time zone 'UTC') as id;
select pg_temp.check((select pickup_by = ((select open_day from bake_dates) + time '13:00') at time zone 'UTC'
                      and pickup_instructions = '' and pickup_photo_path = '' from public.orders where id = (select id from bake_order)),
  'bake-day order gets its pickup window, and no instructions or photo before accept');
select pg_temp.expect_error($$ select public.mark_arrived((select id from bake_order)) $$, 'isn''t ready');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select public.set_order_status((select id from bake_order), 'accepted');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select pg_temp.check((select pickup_instructions = 'Cooler on the porch, ring once.' and pickup_photo_path = 'r1/porch.jpg'
                      from public.orders where id = (select id from bake_order)), 'instructions and pickup photo shared on accept');

-- Oven updates: only the kitchen posts, only while making the order, at most 8.
select pg_temp.expect_error($$ insert into public.order_updates (order_id, body) values ((select id from bake_order), 'hi') $$,
  'row-level security');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into public.order_updates (order_id, body, photo_path) values ((select id from bake_order), 'Dough is proofing', 'r1/dough.jpg');
select pg_temp.expect_error($$ insert into public.order_updates (order_id, body) values ((select id from bake_order), '  ') $$,
  'check constraint');
select pg_temp.expect_error($$ insert into public.order_updates (order_id, body) values ((select id from first_order), 'Too late') $$,
  'row-level security');
insert into public.order_updates (order_id, body) select (select id from bake_order), 'Update ' || n from generate_series(2, 8) n;
select pg_temp.expect_error($$ insert into public.order_updates (order_id, body) values ((select id from bake_order), 'Ninth') $$,
  'row-level security');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select pg_temp.check((select count(*) = 8 from public.order_updates), 'the customer sees the kitchen''s updates');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select count(*) = 0 from public.order_updates), 'other customers see none');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_error($$ select public.mark_arrived((select id from bake_order)) $$, 'order not found');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select public.mark_arrived((select id from bake_order));
select pg_temp.check((select arrived_at is not null from public.orders where id = (select id from bake_order)), 'arrived');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
update public.restaurants set skipped_bake_days = array[(select open_day from bake_dates)];
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select pg_temp.expect_error(
  $$ select public.place_order('10000000-0000-0000-0000-000000000001',
       '[{"menu_item_id":"20000000-0000-0000-0000-000000000002","quantity":1}]', '', ((select open_day from bake_dates) + time '10:00') at time zone 'UTC') $$,
  'closed');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
update public.restaurants set order_mode = 'hours', skipped_bake_days = '{}';

-- Opening hours, including overnight shifts ----------------------------------
reset role;
update public.restaurants set working_days = array['thursday'], open_time = '20:00', close_time = '02:00';
select pg_temp.check((select public.kitchen_open_at(r, '2026-11-05 21:00+00') from public.restaurants r), 'Thu 9pm open');
select pg_temp.check((select public.kitchen_open_at(r, '2026-11-06 01:00+00') from public.restaurants r), 'Fri 1am belongs to Thursday');
select pg_temp.check((select not public.kitchen_open_at(r, '2026-11-05 01:00+00') from public.restaurants r), 'Thu 1am belongs to Wednesday');
select pg_temp.check((select not public.kitchen_open_at(r, '2026-11-06 03:00+00') from public.restaurants r), 'Fri 3am closed');
-- Saturdays have their own, shorter hours.
update public.restaurants set working_days = array['friday','saturday'], open_time = '09:00', close_time = '17:00',
  day_hours = '{"saturday": {"open": "10:00", "close": "14:00"}}';
select pg_temp.check((select public.kitchen_open_at(r, '2026-11-06 16:00+00') from public.restaurants r), 'Fri 4pm open (usual hours)');
select pg_temp.check((select not public.kitchen_open_at(r, '2026-11-07 09:30+00') from public.restaurants r), 'Sat 9:30am closed');
select pg_temp.check((select public.kitchen_open_at(r, '2026-11-07 13:00+00') from public.restaurants r), 'Sat 1pm open');
select pg_temp.check((select not public.kitchen_open_at(r, '2026-11-07 15:00+00') from public.restaurants r), 'Sat 3pm closed');
update public.restaurants set day_hours = '{}';

-- Deleting an account --------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
insert into public.favorites (customer_id, restaurant_id) values (auth.uid(), '10000000-0000-0000-0000-000000000001');
select public.delete_my_account();
select pg_temp.check((select name = '' and phone is null and deleted_at is not null from public.profiles where id = auth.uid()),
  'deleted account details cleared');
select pg_temp.check((select count(*) = 0 from public.favorites), 'favorites removed');
select pg_temp.check((select count(*) = 0 from public.order_issues), 'help requests removed');
reset role;
select pg_temp.check((select count(*) = 0 from public.order_messages where sender_id = '00000000-0000-0000-0000-00000000000b'),
  'their messages removed');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select customer_name = 'Former customer' from public.reviews), 'review kept without the name');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select public.delete_my_account();
select pg_temp.check((select status = 'draft' and not accepting_orders from public.restaurants), 'kitchen taken down');
select pg_temp.check((select count(*) = 0 from public.restaurant_addresses), 'address removed');
select pg_temp.act_as(null);
select pg_temp.expect_error($$ select public.delete_my_account() $$, 'permission denied');

-- The team takes down a reported review ----------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select public.remove_review((select id from public.reviews));
select pg_temp.check((select count(*) = 0 from public.reviews), 'review removed');
select pg_temp.check((select count(*) = 0 from public.review_reports), 'its reports go with it');
select pg_temp.check((select rating_sum = 0 and rating_count = 0 from public.restaurants), 'rating recomputed');

select 'All Manna database checks passed' as result;
