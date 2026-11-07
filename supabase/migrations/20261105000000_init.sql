-- Manna: initial database schema for Supabase (Postgres 15+).
--
-- Design rules
-- * Money is integer cents.
-- * Row-level security is on for every table. Customers see their own data,
--   chefs see their own kitchen and its orders, everyone sees live kitchens.
-- * Anything that must be trusted (prices, daily limits, opening hours,
--   order status changes, reviews) happens in SECURITY DEFINER functions,
--   never in the app. The app's own checks are only for quick feedback.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('foodie', 'chef');
create type public.restaurant_status as enum ('draft', 'pending_review', 'live', 'suspended');
create type public.order_status as enum ('placed', 'accepted', 'preparing', 'ready', 'completed', 'declined', 'cancelled');
create type public.document_kind as enum ('food-handler', 'home-kitchen-permit', 'government-id');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 80),
  email text,
  phone text,
  role public.user_role,
  neighborhood text not null default '',
  dietary text[] not null default '{}',
  avoid_allergens text[] not null default '{}',
  is_admin boolean not null default false,
  -- Set when the person deletes their account; their details are cleared.
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  chef_name text not null default '',
  chef_bio text not null default '' check (char_length(chef_bio) <= 280),
  chef_photo_path text,
  cuisine text not null default '',
  categories text[] not null default '{}',
  logo_path text,
  cover_paths text[] not null default '{}' check (cardinality(cover_paths) <= 3),
  -- Public location. The street address lives in restaurant_addresses.
  neighborhood text not null default '',
  city text not null default '',
  -- Two-letter state code: home-food law, labels and limits follow it.
  state text not null default 'FL' check (state ~ '^[A-Z]{2}$'),
  zip text not null default '' check (zip = '' or zip ~ '^[0-9]{5}$'),
  timezone text not null default 'America/New_York',
  working_days text[] not null default '{}',
  open_time time,
  close_time time,
  prep_minutes integer not null default 30 check (prep_minutes between 5 and 240),
  verified boolean not null default false,
  -- One of the first kitchens on Manna; set by the Manna team.
  founding boolean not null default false,
  -- The Manna team approved a food permit or license. Optional: kitchens
  -- without one sell as "Home kitchen · not inspected".
  licensed boolean not null default false,
  -- When the cook confirmed they follow their state's and county's food laws.
  law_attested_at timestamptz,
  -- Where the cook also sells in person: [{"place": "...", "when": "..."}]
  in_person jsonb not null default '[]'::jsonb
    check (jsonb_typeof(in_person) = 'array' and jsonb_array_length(in_person) <= 5),
  -- How the cook personalizes their page. The layout stays the same for everyone.
  accent text not null default 'champagne'
    check (accent in ('champagne', 'terracotta', 'sage', 'berry', 'lavender', 'sky')),
  tagline text not null default '' check (char_length(tagline) <= 60),
  update_text text not null default '' check (char_length(update_text) <= 140),
  update_posted_at timestamptz,
  instagram text not null default '' check (instagram = '' or instagram ~ '^[a-z0-9._]{1,30}$'),
  -- 'bake-days': customers order ahead for weekly bake days and pick up in a window.
  -- 'hours': customers order while the kitchen is open.
  order_mode text not null default 'hours' check (order_mode in ('bake-days', 'hours')),
  -- [{"day": "saturday", "pickupStart": "09:00", "pickupEnd": "12:00", "closeDaysBefore": 1}]
  -- Orders close at 8 PM, closeDaysBefore days before the bake day.
  bake_days jsonb not null default '[]'::jsonb
    check (jsonb_typeof(bake_days) = 'array' and jsonb_array_length(bake_days) <= 3),
  skipped_bake_days date[] not null default '{}',
  accepting_orders boolean not null default true,
  has_offer boolean not null default false,
  status public.restaurant_status not null default 'draft',
  signature_item_id uuid,
  rating_sum integer not null default 0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Home kitchens keep their street address private. Customers get it on their
-- order once the chef accepts (see set_order_status).
create table public.restaurant_addresses (
  restaurant_id uuid primary key references public.restaurants (id) on delete cascade,
  address text not null default '' check (char_length(address) <= 200),
  -- e.g. "Cooler on the porch, ring once". Shared with the address on accept.
  instructions text not null default '' check (char_length(instructions) <= 140)
);

-- Farmers and artisans waiting for Manna Mart. Anyone may sign up; only the
-- Manna team can read the list.
create table public.grower_waitlist (
  id uuid primary key default gen_random_uuid(),
  business_name text not null check (char_length(business_name) between 1 and 80),
  offering text not null check (char_length(offering) between 1 and 280),
  neighborhood text not null default '' check (char_length(neighborhood) <= 80),
  contact text not null check (char_length(contact) between 3 and 120),
  created_at timestamptz not null default now()
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 300),
  price_cents integer not null check (price_cents > 0 and price_cents <= 100000),
  available boolean not null default true,
  photo_path text,
  dietary text[] not null default '{}',
  allergens text[] not null default '{}',
  daily_limit integer check (daily_limit is null or daily_limit > 0),
  section text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index on public.menu_items (restaurant_id);

alter table public.restaurants
  add constraint restaurants_signature_fk
  foreign key (signature_item_id) references public.menu_items (id) on delete set null;

create table public.restaurant_documents (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  kind public.document_kind not null,
  storage_path text not null,
  file_name text not null,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (restaurant_id, kind)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id),
  restaurant_id uuid not null references public.restaurants (id),
  status public.order_status not null default 'placed',
  -- Copied when the order is placed, so both sides can always read them:
  -- the kitchen can't read customer profiles, and kitchens can go offline.
  customer_name text not null default '',
  restaurant_name text not null default '',
  subtotal_cents integer not null check (subtotal_cents > 0),
  -- Manna's movement fee (8%, at least $1), paid by the customer. There is no delivery fee:
  -- orders are picked up.
  movement_fee_cents integer not null check (movement_fee_cents >= 0),
  tip_cents integer not null default 0 check (tip_cents >= 0),
  total_cents integer not null,
  -- Filled in when the chef accepts; empty until then.
  pickup_address text not null default '',
  pickup_instructions text not null default '',
  -- End of the pickup window for bake-day orders.
  pickup_by timestamptz,
  -- When the customer said "I'm here".
  arrived_at timestamptz,
  customer_note text not null default '' check (char_length(customer_note) <= 280),
  chef_note text not null default '' check (char_length(chef_note) <= 280),
  scheduled_for timestamptz,
  estimated_ready_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (total_cents = subtotal_cents + movement_fee_cents + tip_cents)
);
create index on public.orders (customer_id, created_at desc);
create index on public.orders (restaurant_id, created_at desc);

create table public.order_lines (
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid not null references public.menu_items (id),
  name text not null,
  price_cents integer not null check (price_cents > 0),
  quantity integer not null check (quantity between 1 and 50),
  primary key (order_id, menu_item_id)
);

create table public.order_status_events (
  id bigserial primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  status public.order_status not null,
  at timestamptz not null default now()
);
create index on public.order_status_events (order_id, at);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  customer_id uuid not null references public.profiles (id),
  customer_name text not null,
  stars integer not null check (stars between 1 and 5),
  tags text[] not null default '{}',
  text text not null default '' check (char_length(text) <= 500),
  created_at timestamptz not null default now()
);
create index on public.reviews (restaurant_id, created_at desc);

create table public.favorites (
  customer_id uuid not null references public.profiles (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, restaurant_id)
);

-- Reviews people flag as abusive, false or not about a real order. The team
-- checks each one within 24 hours (App Store guideline 1.2).
create table public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reason text not null default '' check (char_length(reason) <= 280),
  created_at timestamptz not null default now(),
  unique (review_id, reporter_id)
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Every new account gets a profile row automatically.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, phone) values (new.id, new.email, new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create function public.owns_restaurant(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.restaurants where id = rid and owner_id = auth.uid());
$$;

-- Mirrors isOpenAt in src/lib/hours.ts: overnight hours (e.g. 20:00-02:00)
-- belong to the day the shift started.
-- First name and last initial, e.g. "Ada L." Mirrors publicName() in src/lib/reviews.ts.
create function public.public_name(full_name text) returns text
language sql immutable as $$
  select case
    when full_name is null or trim(full_name) = '' then 'A neighbor'
    when position(' ' in trim(full_name)) = 0 then trim(full_name)
    else split_part(trim(full_name), ' ', 1) || ' '
      || upper(left(regexp_replace(trim(full_name), '^.*\s', ''), 1)) || '.'
  end;
$$;

create function public.kitchen_open_at(r public.restaurants, ts timestamptz) returns boolean
language plpgsql stable as $$
declare
  local_ts timestamp := ts at time zone r.timezone;
  t time := local_ts::time;
  today text := lower(trim(to_char(local_ts, 'Day')));
  yesterday text := lower(trim(to_char(local_ts - interval '1 day', 'Day')));
begin
  if r.open_time is null or r.close_time is null or r.open_time = r.close_time then
    return false;
  end if;
  if r.open_time < r.close_time then
    return today = any (r.working_days) and t >= r.open_time and t < r.close_time;
  end if;
  if t >= r.open_time then
    return today = any (r.working_days);
  end if;
  if t < r.close_time then
    return yesterday = any (r.working_days);
  end if;
  return false;
end;
$$;

-- The pickup window and order cutoff for a bake-day pickup starting at
-- p_start, or nulls when the kitchen doesn't bake then (or skipped that day).
create function public.bake_day_window(
  r public.restaurants, p_start timestamptz, out pickup_end timestamptz, out closes_at timestamptz
)
language plpgsql stable as $$
declare
  local_start timestamp := p_start at time zone r.timezone;
  day_name text := lower(trim(to_char(local_start, 'Day')));
  b jsonb;
begin
  if local_start::date = any (r.skipped_bake_days) then
    return;
  end if;
  for b in select * from jsonb_array_elements(r.bake_days) loop
    if b ->> 'day' = day_name and local_start::time = (b ->> 'pickupStart')::time then
      pickup_end := (local_start::date + (b ->> 'pickupEnd')::time) at time zone r.timezone;
      closes_at := ((local_start::date - (b ->> 'closeDaysBefore')::int) + time '20:00') at time zone r.timezone;
      return;
    end if;
  end loop;
end;
$$;

-- Owners may edit their kitchen, but only the Manna team may verify it,
-- publish it, or touch its rating totals.
-- Runs as the caller (not SECURITY DEFINER) so it can tell a direct edit from
-- the app (role "authenticated") apart from the trusted functions below,
-- which run as the database owner.
create function public.guard_restaurant_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;
  if new.verified is distinct from old.verified
     or new.founding is distinct from old.founding
     or new.licensed is distinct from old.licensed
     or new.rating_sum is distinct from old.rating_sum
     or new.rating_count is distinct from old.rating_count
     or new.owner_id is distinct from old.owner_id then
    raise exception 'Only the Manna team can change that' using errcode = '42501';
  end if;
  if new.status is distinct from old.status
     and not (old.status = 'draft' and new.status = 'pending_review')
     and not (old.status = 'pending_review' and new.status = 'draft') then
    raise exception 'A kitchen goes live after review by the Manna team' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger restaurants_guard before update on public.restaurants
  for each row execute function public.guard_restaurant_update();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_addresses enable row level security;
alter table public.grower_waitlist enable row level security;
alter table public.menu_items enable row level security;
alter table public.restaurant_documents enable row level security;
alter table public.orders enable row level security;
alter table public.order_lines enable row level security;
alter table public.order_status_events enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;
alter table public.review_reports enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid() and is_admin = false);
create policy "admins read profiles" on public.profiles
  for select using (public.is_admin());

create policy "live kitchens are public" on public.restaurants
  for select using (status = 'live' or owner_id = auth.uid() or public.is_admin());
create policy "chefs create their kitchen" on public.restaurants
  for insert with check (owner_id = auth.uid() and status = 'draft' and verified = false and founding = false
                         and licensed = false);
create policy "chefs edit their kitchen" on public.restaurants
  for update using (owner_id = auth.uid() or public.is_admin());

create policy "anyone joins the grower waitlist" on public.grower_waitlist
  for insert with check (true);
create policy "admins read the grower waitlist" on public.grower_waitlist
  for select using (public.is_admin());

create policy "chefs manage their address" on public.restaurant_addresses
  for all using (public.owns_restaurant(restaurant_id)) with check (public.owns_restaurant(restaurant_id));
create policy "admins read addresses" on public.restaurant_addresses
  for select using (public.is_admin());

create policy "menus of visible kitchens" on public.menu_items
  for select using (exists (
    select 1 from public.restaurants r
    where r.id = restaurant_id and (r.status = 'live' or r.owner_id = auth.uid() or public.is_admin())
  ));
create policy "chefs manage their menu" on public.menu_items
  for all using (public.owns_restaurant(restaurant_id)) with check (public.owns_restaurant(restaurant_id));

create policy "chefs manage their documents" on public.restaurant_documents
  for all using (public.owns_restaurant(restaurant_id))
  with check (public.owns_restaurant(restaurant_id) and review_status = 'pending' and reviewed_by is null);
create policy "admins review documents" on public.restaurant_documents
  for all using (public.is_admin());

-- Orders are created and changed only through the functions below.
create policy "customers and kitchens read orders" on public.orders
  for select using (customer_id = auth.uid() or public.owns_restaurant(restaurant_id) or public.is_admin());
create policy "order lines follow orders" on public.order_lines
  for select using (exists (
    select 1 from public.orders o
    where o.id = order_id and (o.customer_id = auth.uid() or public.owns_restaurant(o.restaurant_id) or public.is_admin())
  ));
create policy "status events follow orders" on public.order_status_events
  for select using (exists (
    select 1 from public.orders o
    where o.id = order_id and (o.customer_id = auth.uid() or public.owns_restaurant(o.restaurant_id) or public.is_admin())
  ));

create policy "reviews of live kitchens are public" on public.reviews
  for select using (
    public.is_admin() or exists (select 1 from public.restaurants r where r.id = restaurant_id and r.status = 'live')
  );

create policy "own favorites" on public.favorites
  for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());

create policy "people report reviews" on public.review_reports
  for insert with check (reporter_id = auth.uid());
create policy "reporters and admins read reports" on public.review_reports
  for select using (reporter_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Functions the app calls
-- ---------------------------------------------------------------------------

-- Places an order. Prices come from the menu, never from the app.
-- p_lines: [{"menu_item_id": "...", "quantity": 2}, ...]
create function public.place_order(
  p_restaurant_id uuid,
  p_lines jsonb,
  p_customer_note text default '',
  p_scheduled_for timestamptz default null,
  p_tip_cents integer default 0
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  r public.restaurants;
  line jsonb;
  item public.menu_items;
  qty integer;
  committed integer;
  cook_day date;
  subtotal integer := 0;
  movement_fee integer;
  new_id uuid;
  ready_at timestamptz;
  bake record;
  window_end timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Sign in to order' using errcode = '42501';
  end if;
  select * into r from public.restaurants where id = p_restaurant_id;
  if not found or r.status <> 'live' or not r.accepting_orders then
    raise exception 'This kitchen isn''t taking orders right now';
  end if;
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Your cart is empty';
  end if;
  if r.order_mode = 'bake-days' then
    if p_scheduled_for is null then
      raise exception 'Pick a bake day';
    end if;
    select * into bake from public.bake_day_window(r, p_scheduled_for);
    if bake.pickup_end is null or now() >= bake.closes_at or p_scheduled_for > now() + interval '15 days' then
      raise exception 'Orders for that bake day are closed';
    end if;
    ready_at := p_scheduled_for;
    window_end := bake.pickup_end;
  elsif p_scheduled_for is null then
    if not public.kitchen_open_at(r, now()) then
      raise exception 'This kitchen is closed right now';
    end if;
    ready_at := now() + make_interval(mins => r.prep_minutes);
  else
    if p_scheduled_for < now() + make_interval(mins => r.prep_minutes)
       or p_scheduled_for > now() + interval '2 days'
       or not public.kitchen_open_at(r, p_scheduled_for) then
      raise exception 'Pick a time when the kitchen is open';
    end if;
    ready_at := p_scheduled_for;
  end if;
  cook_day := (coalesce(p_scheduled_for, now()) at time zone r.timezone)::date;

  insert into public.orders (
    customer_id, restaurant_id, customer_name, restaurant_name, subtotal_cents, movement_fee_cents,
    tip_cents, total_cents, customer_note, scheduled_for, estimated_ready_at, pickup_by
  ) values (
    -- Placeholder totals; the real ones are written once every line is priced.
    auth.uid(), r.id, public.public_name((select name from public.profiles where id = auth.uid())), r.name,
    1, 0, 0, 1,
    left(coalesce(p_customer_note, ''), 280), p_scheduled_for, ready_at, window_end
  ) returning id into new_id;

  for line in select * from jsonb_array_elements(p_lines) loop
    qty := (line ->> 'quantity')::integer;
    -- Lock the dish so two simultaneous orders can't both take the last portion.
    select * into item from public.menu_items
      where id = (line ->> 'menu_item_id')::uuid and restaurant_id = r.id
      for update;
    if not found or not item.available then
      raise exception 'A dish in your cart is no longer available';
    end if;
    if qty is null or qty < 1 or qty > 50 then
      raise exception 'Invalid quantity for %', item.name;
    end if;
    if item.daily_limit is not null then
      select coalesce(sum(ol.quantity), 0) into committed
        from public.order_lines ol
        join public.orders o on o.id = ol.order_id
        where ol.menu_item_id = item.id
          and o.status not in ('declined', 'cancelled')
          and o.id <> new_id
          and (coalesce(o.scheduled_for, o.created_at) at time zone r.timezone)::date = cook_day;
      if committed + qty > item.daily_limit then
        raise exception 'Only % % left for that day', greatest(item.daily_limit - committed, 0), item.name;
      end if;
    end if;
    insert into public.order_lines (order_id, menu_item_id, name, price_cents, quantity)
      values (new_id, item.id, item.name, item.price_cents, qty);
    subtotal := subtotal + item.price_cents * qty;
  end loop;

  if p_tip_cents < 0 or p_tip_cents > subtotal then
    raise exception 'Tip must be between $0 and the food subtotal';
  end if;
  -- 8% of the food, at least $1. Mirrors movementFee() in src/lib/pricing.ts.
  movement_fee := greatest(round(subtotal * 0.08), 100);

  update public.orders set
    subtotal_cents = subtotal,
    movement_fee_cents = movement_fee,
    tip_cents = p_tip_cents,
    total_cents = subtotal + movement_fee + p_tip_cents
  where id = new_id;

  insert into public.order_status_events (order_id, status) values (new_id, 'placed');
  return new_id;
end;
$$;

-- Moves an order forward. Only the kitchen that received it, and only along
-- placed -> accepted -> preparing -> ready -> completed, or placed -> declined.
create function public.set_order_status(p_order_id uuid, p_status public.order_status) returns void
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  allowed boolean;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or not public.owns_restaurant(o.restaurant_id) then
    raise exception 'Order not found' using errcode = '42501';
  end if;
  allowed := (o.status, p_status) in (
    ('placed'::public.order_status, 'accepted'::public.order_status),
    ('placed', 'declined'),
    ('accepted', 'preparing'),
    ('preparing', 'ready'),
    ('ready', 'completed')
  );
  if not allowed then
    raise exception 'Can''t move an order from % to %', o.status, p_status;
  end if;
  update public.orders set status = p_status where id = o.id;
  if p_status = 'accepted' then
    update public.orders set
      pickup_address = coalesce(
        (select a.address from public.restaurant_addresses a where a.restaurant_id = o.restaurant_id), ''),
      pickup_instructions = coalesce(
        (select a.instructions from public.restaurant_addresses a where a.restaurant_id = o.restaurant_id), '')
    where id = o.id;
  end if;
  insert into public.order_status_events (order_id, status) values (o.id, p_status);
end;
$$;

-- A customer calls off their order before the kitchen accepts it. Nothing
-- has been charged yet, because payment is taken when the kitchen accepts.
create function public.cancel_order(p_order_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.customer_id is distinct from auth.uid() then
    raise exception 'Order not found' using errcode = '42501';
  end if;
  if o.status <> 'placed' then
    raise exception 'The kitchen already accepted this order. Contact them to change it.';
  end if;
  update public.orders set status = 'cancelled' where id = o.id;
  insert into public.order_status_events (order_id, status) values (o.id, 'cancelled');
end;
$$;

-- The customer says "I'm here" at pickup, so the kitchen can bring the order out.
create function public.mark_arrived(p_order_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.customer_id is distinct from auth.uid() then
    raise exception 'Order not found' using errcode = '42501';
  end if;
  if o.status not in ('accepted', 'preparing', 'ready') then
    raise exception 'This order isn''t ready for pickup';
  end if;
  update public.orders set arrived_at = coalesce(arrived_at, now()) where id = o.id;
end;
$$;

create function public.set_chef_note(p_order_id uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.orders set chef_note = left(trim(coalesce(p_note, '')), 280)
    where id = p_order_id and public.owns_restaurant(restaurant_id);
  if not found then
    raise exception 'Order not found' using errcode = '42501';
  end if;
end;
$$;

-- One review per completed order, by the person who ordered it.
create function public.add_review(p_order_id uuid, p_stars integer, p_tags text[], p_text text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  full_name text;
  shown_name text;
  new_id uuid;
begin
  select * into o from public.orders where id = p_order_id;
  if not found or o.customer_id <> auth.uid() then
    raise exception 'Order not found' using errcode = '42501';
  end if;
  if o.status <> 'completed' then
    raise exception 'You can review an order after it’s picked up';
  end if;
  if p_stars not between 1 and 5 then
    raise exception 'Stars must be 1 to 5';
  end if;
  select name into full_name from public.profiles where id = auth.uid();
  shown_name := public.public_name(full_name);
  insert into public.reviews (order_id, restaurant_id, customer_id, customer_name, stars, tags, text)
    values (o.id, o.restaurant_id, auth.uid(), shown_name, p_stars, coalesce(p_tags, '{}'), left(trim(coalesce(p_text, '')), 500))
    returning id into new_id;
  update public.restaurants set rating_sum = rating_sum + p_stars, rating_count = rating_count + 1
    where id = o.restaurant_id;
  return new_id;
end;
$$;

-- Admin: approve a kitchen after checking its documents.
create function public.approve_restaurant(p_restaurant_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only the Manna team can approve kitchens' using errcode = '42501';
  end if;
  if (select law_attested_at from public.restaurants where id = p_restaurant_id) is null then
    raise exception 'The cook hasn''t confirmed they follow their food laws';
  end if;
  if exists (
    -- A permit or license is optional (it earns the Licensed label). Every
    -- kitchen needs a food handler certificate and a verified ID.
    select 1 from unnest(array['food-handler', 'government-id']::public.document_kind[]) k(kind)
    where not exists (
      select 1 from public.restaurant_documents d
      where d.restaurant_id = p_restaurant_id and d.kind = k.kind and d.review_status = 'approved'
    )
  ) then
    raise exception 'Approve the food handler certificate and ID first';
  end if;
  update public.restaurants set verified = true, status = 'live' where id = p_restaurant_id;
  perform public.refresh_licensed(p_restaurant_id);
end;
$$;

-- Admin: after reviewing documents, mark a kitchen Licensed exactly when it
-- has an approved permit or license on file. Call again if one is revoked.
create function public.refresh_licensed(p_restaurant_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only the Manna team can change that' using errcode = '42501';
  end if;
  update public.restaurants set licensed = exists (
    select 1 from public.restaurant_documents d
    where d.restaurant_id = p_restaurant_id and d.kind = 'home-kitchen-permit' and d.review_status = 'approved'
  ) where id = p_restaurant_id;
end;
$$;

-- Each live kitchen's most ordered dish over the last 60 days, once it has
-- been in at least 3 orders. The app shows these with a "Most ordered" label.
create function public.popular_menu_items() returns table (restaurant_id uuid, menu_item_id uuid)
language sql stable security definer set search_path = public as $$
  select distinct on (o.restaurant_id) o.restaurant_id, ol.menu_item_id
  from public.order_lines ol
  join public.orders o on o.id = ol.order_id
  join public.restaurants r on r.id = o.restaurant_id and r.status = 'live'
  where o.status not in ('declined', 'cancelled') and o.created_at > now() - interval '60 days'
  group by o.restaurant_id, ol.menu_item_id
  having count(distinct o.id) >= 3
  order by o.restaurant_id, sum(ol.quantity) desc, ol.menu_item_id;
$$;

-- Admin: take down a review that breaks the rules, and take it out of the rating.
create function public.remove_review(p_review_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r public.reviews;
begin
  if not public.is_admin() then
    raise exception 'Only the Manna team can remove reviews' using errcode = '42501';
  end if;
  delete from public.reviews where id = p_review_id returning * into r;
  if not found then
    raise exception 'Review not found';
  end if;
  update public.restaurants
    set rating_sum = greatest(rating_sum - r.stars, 0), rating_count = greatest(rating_count - 1, 0)
    where id = r.restaurant_id;
end;
$$;

-- Deletes a person's account from inside the app (Apple requires this).
-- Their details, favorites, kitchen listing, address and documents are
-- removed; order and review records stay for the kitchens' bookkeeping,
-- without the person's details. Removing the sign-in itself (auth.users)
-- needs the service role, so an Edge Function calls this and then deletes it.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  delete from public.favorites where customer_id = me;
  delete from public.review_reports where reporter_id = me;
  delete from public.restaurant_addresses a using public.restaurants r
    where a.restaurant_id = r.id and r.owner_id = me;
  delete from public.restaurant_documents d using public.restaurants r
    where d.restaurant_id = r.id and r.owner_id = me;
  update public.restaurants
    set status = 'draft', accepting_orders = false, chef_bio = '', chef_photo_path = null,
        cover_paths = '{}', logo_path = null, in_person = '[]'::jsonb
    where owner_id = me;
  update public.reviews set customer_name = 'Former customer', text = '' where customer_id = me;
  update public.orders set customer_note = '', customer_name = 'Former customer' where customer_id = me;
  update public.profiles
    set name = '', email = null, phone = null, neighborhood = '', dietary = '{}',
        avoid_allergens = '{}', deleted_at = now()
    where id = me;
end;
$$;

revoke all on function public.place_order(uuid, jsonb, text, timestamptz, integer) from public;
revoke all on function public.set_order_status(uuid, public.order_status) from public;
revoke all on function public.set_chef_note(uuid, text) from public;
revoke all on function public.cancel_order(uuid) from public;
revoke all on function public.mark_arrived(uuid) from public;
grant execute on function public.mark_arrived(uuid) to authenticated;
grant execute on function public.cancel_order(uuid) to authenticated;
revoke all on function public.add_review(uuid, integer, text[], text) from public;
revoke all on function public.approve_restaurant(uuid) from public;
revoke all on function public.refresh_licensed(uuid) from public;
grant execute on function public.refresh_licensed(uuid) to authenticated;
grant execute on function public.place_order(uuid, jsonb, text, timestamptz, integer) to authenticated;
grant execute on function public.set_order_status(uuid, public.order_status) to authenticated;
grant execute on function public.set_chef_note(uuid, text) to authenticated;
grant execute on function public.add_review(uuid, integer, text[], text) to authenticated;
grant execute on function public.approve_restaurant(uuid) to authenticated;
grant execute on function public.popular_menu_items() to anon, authenticated;
revoke all on function public.remove_review(uuid) from public;
grant execute on function public.remove_review(uuid) to authenticated;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on public.profiles, public.restaurants, public.restaurant_addresses,
  public.menu_items, public.restaurant_documents, public.favorites to authenticated;
-- Signed-out visitors never need a kitchen's street address.
revoke select on public.restaurant_addresses from anon;
grant insert on public.grower_waitlist to anon, authenticated;
grant insert on public.review_reports to authenticated;
