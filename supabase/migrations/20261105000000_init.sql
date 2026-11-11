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
  -- Home ZIP, for kitchens near you anywhere in the US.
  zip text not null default '' check (zip = '' or zip ~ '^[0-9]{5}$'),
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
  -- The area's rough center (its ZIP's or neighborhood's, never the address),
  -- to two decimals (about a kilometer). For kitchens near you.
  area_lat numeric(5, 2) check (area_lat is null or area_lat between -90 and 90),
  area_lng numeric(5, 2) check (area_lng is null or area_lng between -180 and 180),
  timezone text not null default 'America/New_York',
  working_days text[] not null default '{}',
  open_time time,
  close_time time,
  -- Days with their own hours: {"saturday": {"open": "10:00", "close": "14:00"}}.
  -- Other working days use open_time and close_time.
  day_hours jsonb not null default '{}'::jsonb check (jsonb_typeof(day_hours) = 'object'),
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
  -- Optional photo with the pinned update, in the public-photos bucket.
  update_photo_path text,
  -- A cook's hello of up to 30 seconds, in the public-photos bucket.
  intro_video_path text,
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
  -- When the Manna team first approved the kitchen. A founding kitchen's
  -- fee-free months count from here.
  live_since timestamptz,
  -- Manna Pro ($19.99 a month or $199 a year). Set by billing, or by the Manna
  -- team until billing is connected; never by the cook. See has_pro().
  pro_plan text check (pro_plan in ('monthly', 'yearly')),
  pro_started_at timestamptz,
  pro_billing_starts_at timestamptz,
  pro_canceled_at timestamptz,
  created_at timestamptz not null default now()
);

-- Home kitchens keep their street address private. Customers get it on their
-- order once the chef accepts (see set_order_status).
create table public.restaurant_addresses (
  restaurant_id uuid primary key references public.restaurants (id) on delete cascade,
  address text not null default '' check (char_length(address) <= 200),
  -- e.g. "Cooler on the porch, ring once". Shared with the address on accept.
  instructions text not null default '' check (char_length(instructions) <= 140),
  -- Photo of the door, gate or cooler, in the private order-photos bucket. Shared with the address on accept.
  photo_path text
);

-- Farmers and artisans waiting for Manna Mart. Anyone may sign up; only the
-- Manna team can read the list.
-- States kitchens can open in. Mirrors `launched` in STATE_RULES
-- (src/data/regions.ts). Add a state once a lawyer has confirmed its rules.
create table public.launched_states (
  code text primary key check (code ~ '^[A-Z]{2}$'),
  launched_at timestamptz not null default now()
);
insert into public.launched_states (code) values ('FL');

-- People asking to hear when kitchens open near their ZIP. Shows the team
-- where to recruit cooks next. Only admins read the whole list.
create table public.area_waitlist (
  profile_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  zip text not null check (zip ~ '^[0-9]{5}$'),
  created_at timestamptz not null default now(),
  primary key (profile_id, zip)
);
create index on public.area_waitlist (zip);

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
  -- Sold only in drops, not on the everyday menu.
  drop_only boolean not null default false,
  -- For printable labels: ingredients heaviest first, and net weight.
  ingredients text not null default '' check (char_length(ingredients) <= 400),
  net_weight text not null default '' check (char_length(net_weight) <= 40),
  created_at timestamptz not null default now()
);
create index on public.restaurants (area_lat) where status = 'live';
create index on public.menu_items (restaurant_id);

-- A Pro kitchen's drop: a one-off menu with its own pickup window and order
-- deadline ("Thanksgiving pies, order by Tuesday").
create table public.drops (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 40),
  note text not null default '' check (char_length(note) <= 140),
  pickup_start timestamptz not null,
  pickup_end timestamptz not null,
  closes_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (pickup_start < pickup_end and closes_at <= pickup_start)
);
create index on public.drops (restaurant_id, pickup_start);

create table public.drop_items (
  drop_id uuid not null references public.drops (id) on delete cascade,
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  primary key (drop_id, menu_item_id)
);

-- A Pro kitchen's discount codes. Only the kitchen can read them; customers
-- type a code at checkout and place_order() checks it.
create table public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9]{3,15}$'),
  kind text not null check (kind in ('percent', 'amount')),
  value integer not null,
  new_customers_only boolean not null default false,
  max_uses integer check (max_uses is null or max_uses > 0),
  ends_at timestamptz,
  paused boolean not null default false,
  created_at timestamptz not null default now(),
  unique (restaurant_id, code),
  check ((kind = 'percent' and value between 5 and 50) or (kind = 'amount' and value between 100 and 5000))
);

-- A customer's request for something off-menu from a Pro kitchen: a birthday
-- cake, a party tray, catering. The kitchen answers with a price and a pickup
-- window; the customer accepts it as an order (accept_custom_quote).
create table public.custom_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  customer_id uuid not null default auth.uid() references public.profiles (id),
  customer_name text not null default '',
  occasion text not null check (char_length(occasion) between 1 and 40),
  details text not null check (char_length(details) between 10 and 500),
  servings integer not null check (servings between 1 and 300),
  needed_by date not null,
  budget_cents integer check (budget_cents is null or budget_cents > 0),
  status text not null default 'open' check (status in ('open', 'quoted', 'accepted', 'declined', 'withdrawn')),
  quote_cents integer check (quote_cents is null or quote_cents >= 1000),
  quote_note text not null default '' check (char_length(quote_note) <= 280),
  quote_pickup_start timestamptz,
  quote_pickup_end timestamptz,
  quoted_at timestamptz,
  decline_note text not null default '' check (char_length(decline_note) <= 280),
  order_id uuid,
  created_at timestamptz not null default now()
);
create index on public.custom_requests (restaurant_id, created_at desc);
create index on public.custom_requests (customer_id, created_at desc);

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
  -- Manna's movement fee (10%, at least $1.50), paid by the customer. There is no delivery fee:
  -- orders are picked up.
  movement_fee_cents integer not null check (movement_fee_cents >= 0),
  -- Manna's share of the food (5%, or 0 in a founding kitchen's first 3 months),
  -- taken from the kitchen's payout. Tips are never charged.
  kitchen_fee_cents integer not null default 0 check (kitchen_fee_cents >= 0 and kitchen_fee_cents <= subtotal_cents),
  tip_cents integer not null default 0 check (tip_cents >= 0),
  -- A Pro kitchen's discount code, paid for by the kitchen: it comes off the
  -- food, and both fees are worked out on what's left.
  discount_code text,
  discount_cents integer not null default 0 check (discount_cents >= 0 and discount_cents <= subtotal_cents),
  -- The drop this order is from, if any. A drop with orders can't be deleted.
  drop_id uuid references public.drops (id),
  total_cents integer not null,
  -- Filled in when the chef accepts; empty until then.
  pickup_address text not null default '',
  pickup_instructions text not null default '',
  pickup_photo_path text not null default '',
  -- End of the pickup window for bake-day orders.
  pickup_by timestamptz,
  -- When the customer said "I'm here".
  arrived_at timestamptz,
  customer_note text not null default '' check (char_length(customer_note) <= 280),
  chef_note text not null default '' check (char_length(chef_note) <= 280),
  scheduled_for timestamptz,
  estimated_ready_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (total_cents = subtotal_cents - discount_cents + movement_fee_cents + tip_cents)
);

alter table public.custom_requests
  add constraint custom_requests_order_fk foreign key (order_id) references public.orders (id);
create index on public.orders (customer_id, created_at desc);
create index on public.orders (restaurant_id, created_at desc);

create table public.order_lines (
  id bigserial primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  -- Null for a custom order's single line ("Custom: Birthday cake").
  menu_item_id uuid references public.menu_items (id),
  name text not null,
  price_cents integer not null check (price_cents > 0),
  quantity integer not null check (quantity between 1 and 50),
  unique (order_id, menu_item_id)
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

-- A Pro kitchen's alert to everyone who saved it ("Saturday's bake day is
-- open"). Up to 2 a week. Push notifications read from here once they exist.
create table public.kitchen_alerts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 140),
  created_at timestamptz not null default now()
);
create index on public.kitchen_alerts (restaurant_id, created_at desc);

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

-- "Need help with this order?" requests. They go to Manna's support team,
-- never to the kitchen, and the team replies within 24 hours. One per order.
create table public.order_issues (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  customer_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('late', 'pickup', 'change', 'missing', 'quality', 'not-received', 'charge', 'other')),
  note text not null default '' check (char_length(note) <= 500),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  -- "Something else" needs a few words so the team knows what happened.
  check (kind <> 'other' or char_length(btrim(note)) >= 3)
);

-- Oven updates: the kitchen sends the customer a line and a photo while it
-- makes the order. At most 8 per order; photos live in the private
-- order-photos bucket.
create table public.order_updates (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 280),
  photo_path text,
  created_at timestamptz not null default now(),
  check (char_length(btrim(body)) > 0 or photo_path is not null)
);
create index on public.order_updates (order_id, created_at);

-- Order chat: the customer and the kitchen message each other about one
-- order, from when the kitchen accepts it until 24 hours after pickup.
create table public.order_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index on public.order_messages (order_id, created_at);

-- When each person last opened each order's chat, for unread counts.
create table public.order_chat_reads (
  order_id uuid not null references public.orders (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (order_id, user_id)
);

-- Either side can block the other. A block stops the chat both ways.
create table public.user_blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- Messages people flag. The team checks each one within 24 hours (App Store guideline 1.2).
create table public.message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.order_messages (id) on delete cascade,
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (message_id, reporter_id)
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

-- True for the order's customer and the owner of its kitchen.
create function public.in_order_chat(oid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.orders o
    where o.id = oid and (o.customer_id = auth.uid() or public.owns_restaurant(o.restaurant_id))
  );
$$;

-- The chat opens when the kitchen accepts and closes 24 hours after pickup.
create function public.order_chat_open(oid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.orders o
    where o.id = oid and (
      o.status in ('accepted', 'preparing', 'ready')
      or (o.status = 'completed' and exists (
        select 1 from public.order_status_events e
        where e.order_id = o.id and e.status = 'completed' and e.at > now() - interval '24 hours'
      ))
    )
  );
$$;

-- Whether a block stands between the signed-in person and the other side of this order.
create function public.order_chat_blocked(oid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.orders o
    join public.restaurants r on r.id = o.restaurant_id
    join public.user_blocks b on
      (b.blocker_id = o.customer_id and b.blocked_id = r.owner_id)
      or (b.blocker_id = r.owner_id and b.blocked_id = o.customer_id)
    where o.id = oid
  );
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

-- Manna's share of a kitchen's food sales: 5%, or nothing for a founding
-- kitchen's first 3 months after it went live. Mirrors kitchenFeeRate() in src/lib/pricing.ts.
create function public.kitchen_fee_rate(r public.restaurants, ts timestamptz) returns numeric
language sql stable set search_path = public as $$
  select case
    when r.founding and ts < coalesce(r.live_since, r.created_at) + interval '3 months' then 0
    else 0.05
  end;
$$;

-- Whether a kitchen has Manna Pro at a moment: a founding kitchen's first 3
-- months, or a plan that hasn't been canceled, or a canceled plan running out
-- the period it was canceled in. Mirrors proStatus() in src/lib/pro.ts.
create function public.has_pro(r public.restaurants, ts timestamptz) returns boolean
language plpgsql stable set search_path = public as $$
declare
  step interval;
  period_end timestamptz;
begin
  if r.founding and ts < coalesce(r.live_since, r.created_at) + interval '3 months' then
    return true;
  end if;
  if r.pro_plan is null or r.pro_billing_starts_at is null then
    return false;
  end if;
  if r.pro_canceled_at is null then
    return true;
  end if;
  step := case r.pro_plan when 'yearly' then interval '1 year' else interval '1 month' end;
  period_end := r.pro_billing_starts_at;
  while period_end <= r.pro_canceled_at loop
    period_end := period_end + step;
  end loop;
  return ts < period_end;
end;
$$;

-- How many alerts a kitchen sent in the last 7 days. For the alerts policy,
-- which can't count its own table directly.
create function public.alerts_this_week(rid uuid) returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::integer from public.kitchen_alerts where restaurant_id = rid and created_at > now() - interval '7 days';
$$;

-- has_pro() for a kitchen by id, right now. For policies.
create function public.kitchen_has_pro(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select public.has_pro(r, now()) from public.restaurants r where r.id = rid), false);
$$;

create function public.kitchen_open_at(r public.restaurants, ts timestamptz) returns boolean
language plpgsql stable as $$
declare
  local_ts timestamp := ts at time zone r.timezone;
  t time := local_ts::time;
  today text := lower(trim(to_char(local_ts, 'Day')));
  yesterday text := lower(trim(to_char(local_ts - interval '1 day', 'Day')));
  o time;
  c time;
begin
  -- Today's shift: the day's own hours, or the usual ones.
  if today = any (r.working_days) then
    o := coalesce((r.day_hours -> today ->> 'open')::time, r.open_time);
    c := coalesce((r.day_hours -> today ->> 'close')::time, r.close_time);
    if o is not null and c is not null and o <> c
       and (case when o < c then t >= o and t < c else t >= o end) then
      return true;
    end if;
  end if;
  -- The tail of last night's shift, if it ran past midnight.
  if yesterday = any (r.working_days) then
    o := coalesce((r.day_hours -> yesterday ->> 'open')::time, r.open_time);
    c := coalesce((r.day_hours -> yesterday ->> 'close')::time, r.close_time);
    if o is not null and c is not null and o > c and t < c then
      return true;
    end if;
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
     or new.live_since is distinct from old.live_since
     or new.pro_plan is distinct from old.pro_plan
     or new.pro_started_at is distinct from old.pro_started_at
     or new.pro_billing_starts_at is distinct from old.pro_billing_starts_at
     or new.pro_canceled_at is distinct from old.pro_canceled_at
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
alter table public.area_waitlist enable row level security;
alter table public.launched_states enable row level security;
alter table public.menu_items enable row level security;
alter table public.restaurant_documents enable row level security;
alter table public.orders enable row level security;
alter table public.order_lines enable row level security;
alter table public.order_status_events enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;
alter table public.review_reports enable row level security;
alter table public.order_issues enable row level security;
alter table public.order_messages enable row level security;
alter table public.order_updates enable row level security;
alter table public.order_chat_reads enable row level security;
alter table public.user_blocks enable row level security;
alter table public.message_reports enable row level security;
alter table public.drops enable row level security;
alter table public.drop_items enable row level security;
alter table public.discount_codes enable row level security;
alter table public.custom_requests enable row level security;
alter table public.kitchen_alerts enable row level security;

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

create policy "anyone sees where Manna is open" on public.launched_states for select using (true);

create policy "people join the list for their area" on public.area_waitlist
  for insert with check (profile_id = auth.uid());
create policy "people read their own areas, admins read all" on public.area_waitlist
  for select using (profile_id = auth.uid() or public.is_admin());
create policy "people leave the list" on public.area_waitlist
  for delete using (profile_id = auth.uid());

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

create policy "customers ask for help with their orders" on public.order_issues
  for insert with check (
    customer_id = auth.uid()
    and exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
  );
create policy "customers and admins read help requests" on public.order_issues
  for select using (customer_id = auth.uid() or public.is_admin());
create policy "admins resolve help requests" on public.order_issues
  for update using (public.is_admin()) with check (public.is_admin());

create policy "both sides read oven updates" on public.order_updates
  for select using (public.in_order_chat(order_id) or public.is_admin());
create policy "kitchens post oven updates while making the order" on public.order_updates
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and public.owns_restaurant(o.restaurant_id)
        and o.status in ('accepted', 'preparing', 'ready')
    )
    and (select count(*) from public.order_updates u where u.order_id = order_updates.order_id) < 8
  );

-- Each side reads its order's chat, minus anyone they blocked. The team sees
-- only messages someone reported.
create policy "both sides read the order chat" on public.order_messages
  for select using (
    (public.in_order_chat(order_id)
      and not exists (select 1 from public.user_blocks b where b.blocker_id = auth.uid() and b.blocked_id = sender_id))
    or (public.is_admin() and exists (select 1 from public.message_reports r where r.message_id = order_messages.id))
  );
create policy "both sides message while the chat is open" on public.order_messages
  for insert with check (
    sender_id = auth.uid()
    and public.in_order_chat(order_id)
    and public.order_chat_open(order_id)
    and not public.order_chat_blocked(order_id)
  );
create policy "admins remove reported messages" on public.order_messages
  for delete using (public.is_admin());
-- Manna Pro ------------------------------------------------------------------
create policy "drops of visible kitchens" on public.drops
  for select using (
    public.owns_restaurant(restaurant_id) or public.is_admin()
    or exists (select 1 from public.restaurants r where r.id = restaurant_id and r.status = 'live')
  );
create policy "Pro kitchens make drops" on public.drops
  for insert with check (public.owns_restaurant(restaurant_id) and public.kitchen_has_pro(restaurant_id));
create policy "kitchens edit their drops" on public.drops
  for update using (public.owns_restaurant(restaurant_id)) with check (public.owns_restaurant(restaurant_id));
create policy "kitchens delete their drops" on public.drops
  for delete using (public.owns_restaurant(restaurant_id));
create policy "drop items follow drops" on public.drop_items
  for select using (exists (select 1 from public.drops d where d.id = drop_id));
create policy "kitchens choose their drop items" on public.drop_items
  for all using (
    exists (select 1 from public.drops d where d.id = drop_id and public.owns_restaurant(d.restaurant_id))
  ) with check (
    exists (
      select 1 from public.drops d join public.menu_items m on m.restaurant_id = d.restaurant_id
      where d.id = drop_id and m.id = menu_item_id and public.owns_restaurant(d.restaurant_id)
    )
  );

create policy "kitchens and admins read their codes" on public.discount_codes
  for select using (public.owns_restaurant(restaurant_id) or public.is_admin());
create policy "Pro kitchens make codes" on public.discount_codes
  for insert with check (public.owns_restaurant(restaurant_id) and public.kitchen_has_pro(restaurant_id));
create policy "kitchens pause their codes" on public.discount_codes
  for update using (public.owns_restaurant(restaurant_id)) with check (public.owns_restaurant(restaurant_id));
create policy "kitchens delete unused codes" on public.discount_codes
  for delete using (
    public.owns_restaurant(restaurant_id)
    and not exists (select 1 from public.orders o where o.restaurant_id = discount_codes.restaurant_id and o.discount_code = discount_codes.code)
  );

create policy "both sides read custom requests" on public.custom_requests
  for select using (customer_id = auth.uid() or public.owns_restaurant(restaurant_id) or public.is_admin());
create policy "customers ask Pro kitchens for custom orders" on public.custom_requests
  for insert with check (
    customer_id = auth.uid()
    and status = 'open'
    and needed_by between current_date + 3 and current_date + 60
    and public.kitchen_has_pro(restaurant_id)
    and exists (select 1 from public.restaurants r where r.id = restaurant_id and r.status = 'live' and r.owner_id <> auth.uid())
  );

create policy "kitchens, followers and admins read alerts" on public.kitchen_alerts
  for select using (
    public.owns_restaurant(restaurant_id) or public.is_admin()
    or exists (select 1 from public.favorites f where f.restaurant_id = kitchen_alerts.restaurant_id and f.customer_id = auth.uid())
  );
create policy "Pro kitchens send two alerts a week" on public.kitchen_alerts
  for insert with check (
    public.owns_restaurant(restaurant_id)
    and public.kitchen_has_pro(restaurant_id)
    and public.alerts_this_week(restaurant_id) < 2
  );

create policy "own chat read times" on public.order_chat_reads
  for all using (user_id = auth.uid()) with check (user_id = auth.uid() and public.in_order_chat(order_id));
create policy "own blocks" on public.user_blocks
  for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy "people report messages they can see" on public.message_reports
  for insert with check (
    reporter_id = auth.uid()
    and exists (select 1 from public.order_messages m where m.id = message_id and public.in_order_chat(m.order_id))
  );
create policy "reporters and admins read message reports" on public.message_reports
  for select using (reporter_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Functions the app calls
-- ---------------------------------------------------------------------------

-- Places an order. Prices come from the menu, never from the app.
-- p_lines: [{"menu_item_id": "...", "quantity": 2}, ...]
-- p_drop_id: order from one of the kitchen's drops (its own pickup window).
-- p_discount_code: a Pro kitchen's code, checked here.
create function public.place_order(
  p_restaurant_id uuid,
  p_lines jsonb,
  p_customer_note text default '',
  p_scheduled_for timestamptz default null,
  p_tip_cents integer default 0,
  p_drop_id uuid default null,
  p_discount_code text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  r public.restaurants;
  d public.drops;
  dc public.discount_codes;
  v_scheduled timestamptz := p_scheduled_for;
  discount integer := 0;
  food integer;
  kitchen_fee integer;
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
  if p_drop_id is not null then
    -- A drop has its own pickup window and deadline, whatever the kitchen's usual hours.
    select * into d from public.drops where id = p_drop_id and restaurant_id = r.id;
    if not found or now() >= d.closes_at then
      raise exception 'Orders for this drop have closed';
    end if;
    v_scheduled := d.pickup_start;
    ready_at := d.pickup_start;
    window_end := d.pickup_end;
  elsif r.order_mode = 'bake-days' then
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
  cook_day := (coalesce(v_scheduled, now()) at time zone r.timezone)::date;

  insert into public.orders (
    customer_id, restaurant_id, customer_name, restaurant_name, subtotal_cents, movement_fee_cents,
    tip_cents, total_cents, customer_note, scheduled_for, estimated_ready_at, pickup_by
  ) values (
    -- Placeholder totals; the real ones are written once every line is priced.
    auth.uid(), r.id, public.public_name((select name from public.profiles where id = auth.uid())), r.name,
    1, 0, 0, 1,
    left(coalesce(p_customer_note, ''), 280), v_scheduled, ready_at, window_end
  ) returning id into new_id;
  if p_drop_id is not null then
    update public.orders set drop_id = p_drop_id where id = new_id;
  end if;

  for line in select * from jsonb_array_elements(p_lines) loop
    qty := (line ->> 'quantity')::integer;
    -- Lock the dish so two simultaneous orders can't both take the last portion.
    select * into item from public.menu_items
      where id = (line ->> 'menu_item_id')::uuid and restaurant_id = r.id
      for update;
    if not found or not item.available then
      raise exception 'A dish in your cart is no longer available';
    end if;
    if p_drop_id is null and item.drop_only then
      raise exception '% is only sold in a drop', item.name;
    end if;
    if p_drop_id is not null
       and not exists (select 1 from public.drop_items di where di.drop_id = p_drop_id and di.menu_item_id = item.id) then
      raise exception '% isn''t part of this drop', item.name;
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
  if nullif(trim(p_discount_code), '') is not null then
    -- Mirrors applyCode() in src/lib/discounts.ts.
    select * into dc from public.discount_codes
      where restaurant_id = r.id and code = upper(regexp_replace(p_discount_code, '[^A-Za-z0-9]', '', 'g'));
    if not found or dc.paused or (dc.ends_at is not null and now() >= dc.ends_at) then
      raise exception 'That code doesn''t work here';
    end if;
    if dc.max_uses is not null and (
      select count(*) from public.orders o
      where o.restaurant_id = r.id and o.discount_code = dc.code and o.id <> new_id
        and o.status not in ('declined', 'cancelled')
    ) >= dc.max_uses then
      raise exception 'That code isn''t available anymore';
    end if;
    if dc.new_customers_only and exists (
      select 1 from public.orders o
      where o.restaurant_id = r.id and o.customer_id = auth.uid() and o.id <> new_id
        and o.status not in ('declined', 'cancelled')
    ) then
      raise exception 'That code is for a first order from this kitchen';
    end if;
    discount := least(
      case dc.kind when 'percent' then round(subtotal * dc.value / 100.0)::integer else dc.value end,
      subtotal
    );
  end if;
  food := subtotal - discount;
  -- 10% of the food, at least $1.50, on what the customer pays for the food.
  -- Mirrors movementFee() in src/lib/pricing.ts.
  movement_fee := case when food <= 0 then 0 else greatest(round(food * 0.10), 150) end;
  kitchen_fee := round(food * public.kitchen_fee_rate(r, now()));

  update public.orders set
    subtotal_cents = subtotal,
    discount_code = case when discount > 0 then dc.code end,
    discount_cents = discount,
    movement_fee_cents = movement_fee,
    kitchen_fee_cents = kitchen_fee,
    tip_cents = p_tip_cents,
    total_cents = food + movement_fee + p_tip_cents
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
        (select a.instructions from public.restaurant_addresses a where a.restaurant_id = o.restaurant_id), ''),
      pickup_photo_path = coalesce(
        (select a.photo_path from public.restaurant_addresses a where a.restaurant_id = o.restaurant_id), '')
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
  if not exists (
    select 1 from public.restaurants r join public.launched_states l on l.code = r.state where r.id = p_restaurant_id
  ) then
    raise exception 'Manna hasn''t launched in this kitchen''s state yet';
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
  update public.restaurants set verified = true, status = 'live', live_since = coalesce(live_since, now())
    where id = p_restaurant_id;
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
-- Live kitchens within p_miles of a point, nearest first. Uses each
-- kitchen's area center, never its address.
create function public.nearby_kitchens(p_lat numeric, p_lng numeric, p_miles numeric default 25)
returns table (restaurant_id uuid, miles numeric)
language sql stable set search_path = public as $$
  select id, round(d::numeric, 1) from (
    select r.id,
      3958.8 * 2 * asin(sqrt(
        power(sin(radians(r.area_lat - p_lat) / 2), 2)
        + cos(radians(p_lat)) * cos(radians(r.area_lat)) * power(sin(radians(r.area_lng - p_lng) / 2), 2)
      )) as d
    from public.restaurants r
    where r.status = 'live' and r.area_lat is not null and r.area_lng is not null
      -- A quick box first, so the distance math runs on a few rows.
      and r.area_lat between p_lat - p_miles / 69.0 and p_lat + p_miles / 69.0
  ) k
  where d <= p_miles
  order by d;
$$;

-- Admin: kitchens set up and waiting in states that haven't launched, busiest first.
create function public.kitchens_waiting_by_state() returns table (state text, kitchens bigint)
language sql stable security definer set search_path = public as $$
  select r.state, count(*) from public.restaurants r
  where public.is_admin() and r.status in ('draft', 'pending_review')
    and not exists (select 1 from public.launched_states l where l.code = r.state)
  group by r.state order by count(*) desc;
$$;

-- Admin: where people are waiting for kitchens, busiest ZIPs first.
create function public.area_demand() returns table (zip text, people bigint)
language sql stable security definer set search_path = public as $$
  select zip, count(*) from public.area_waitlist where public.is_admin() group by zip order by count(*) desc;
$$;

-- Custom orders -------------------------------------------------------------
-- The kitchen answers a request with a price and a pickup window on the day
-- the customer asked for. It can send a new price until the customer decides.
create function public.quote_custom_request(
  p_request_id uuid,
  p_price_cents integer,
  p_note text,
  p_pickup_start timestamptz,
  p_pickup_end timestamptz
) returns void
language plpgsql security definer set search_path = public as $$
declare
  q public.custom_requests;
begin
  select * into q from public.custom_requests where id = p_request_id for update;
  if not found or not public.owns_restaurant(q.restaurant_id) then
    raise exception 'Request not found' using errcode = '42501';
  end if;
  if q.status not in ('open', 'quoted') then
    raise exception 'This request has already been answered';
  end if;
  if p_price_cents is null or p_price_cents < 1000 then
    raise exception 'Price must be at least $10';
  end if;
  if p_pickup_start <= now() or p_pickup_end <= p_pickup_start then
    raise exception 'Pick a pickup window that hasn''t passed';
  end if;
  update public.custom_requests set
    status = 'quoted', quote_cents = p_price_cents, quote_note = left(coalesce(p_note, ''), 280),
    quote_pickup_start = p_pickup_start, quote_pickup_end = p_pickup_end, quoted_at = now()
  where id = q.id;
end;
$$;

create function public.decline_custom_request(p_request_id uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.custom_requests set status = 'declined', decline_note = left(coalesce(p_note, ''), 280)
    where id = p_request_id and public.owns_restaurant(restaurant_id) and status in ('open', 'quoted');
  if not found then
    raise exception 'Request not found' using errcode = '42501';
  end if;
end;
$$;

create function public.withdraw_custom_request(p_request_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.custom_requests set status = 'withdrawn'
    where id = p_request_id and customer_id = auth.uid() and status in ('open', 'quoted');
  if not found then
    raise exception 'Request not found' using errcode = '42501';
  end if;
end;
$$;

-- The customer accepts the kitchen's price. The kitchen already said yes, so
-- the order starts accepted, with the pickup address shared.
create function public.accept_custom_quote(p_request_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  q public.custom_requests;
  r public.restaurants;
  fee integer;
  new_id uuid;
begin
  select * into q from public.custom_requests where id = p_request_id for update;
  if not found or q.customer_id <> auth.uid() then
    raise exception 'Request not found' using errcode = '42501';
  end if;
  if q.status <> 'quoted' or q.quote_pickup_start <= now() then
    raise exception 'This price can''t be accepted anymore';
  end if;
  select * into r from public.restaurants where id = q.restaurant_id;
  fee := greatest(round(q.quote_cents * 0.10), 150);
  insert into public.orders (
    customer_id, restaurant_id, status, customer_name, restaurant_name, subtotal_cents, movement_fee_cents,
    kitchen_fee_cents, tip_cents, total_cents, customer_note, scheduled_for, estimated_ready_at, pickup_by,
    pickup_address, pickup_instructions, pickup_photo_path
  ) values (
    q.customer_id, r.id, 'accepted', q.customer_name, r.name, q.quote_cents, fee,
    round(q.quote_cents * public.kitchen_fee_rate(r, now())), 0, q.quote_cents + fee, left(q.details, 280),
    q.quote_pickup_start, q.quote_pickup_start, q.quote_pickup_end,
    coalesce((select a.address from public.restaurant_addresses a where a.restaurant_id = r.id), ''),
    coalesce((select a.instructions from public.restaurant_addresses a where a.restaurant_id = r.id), ''),
    coalesce((select a.photo_path from public.restaurant_addresses a where a.restaurant_id = r.id), '')
  ) returning id into new_id;
  insert into public.order_lines (order_id, menu_item_id, name, price_cents, quantity)
    values (new_id, null, 'Custom: ' || q.occasion, q.quote_cents, 1);
  insert into public.order_status_events (order_id, status) values (new_id, 'placed'), (new_id, 'accepted');
  update public.custom_requests set status = 'accepted', order_id = new_id where id = q.id;
  return new_id;
end;
$$;

create function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  delete from public.favorites where customer_id = me;
  delete from public.area_waitlist where profile_id = me;
  delete from public.custom_requests where customer_id = me and status <> 'accepted';
  update public.custom_requests set customer_name = 'Former customer', details = 'Removed with the account.'
    where customer_id = me;
  delete from public.kitchen_alerts a using public.restaurants r where a.restaurant_id = r.id and r.owner_id = me;
  update public.discount_codes c set paused = true from public.restaurants r
    where c.restaurant_id = r.id and r.owner_id = me;
  delete from public.review_reports where reporter_id = me;
  delete from public.order_issues where customer_id = me;
  delete from public.order_messages where sender_id = me;
  delete from public.order_chat_reads where user_id = me;
  delete from public.user_blocks where blocker_id = me or blocked_id = me;
  delete from public.message_reports where reporter_id = me;
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
    set name = '', email = null, phone = null, neighborhood = '', zip = '', dietary = '{}',
        avoid_allergens = '{}', deleted_at = now()
    where id = me;
end;
$$;

revoke all on function public.place_order(uuid, jsonb, text, timestamptz, integer, uuid, text) from public;
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
grant execute on function public.place_order(uuid, jsonb, text, timestamptz, integer, uuid, text) to authenticated;
grant execute on function public.set_order_status(uuid, public.order_status) to authenticated;
grant execute on function public.set_chef_note(uuid, text) to authenticated;
grant execute on function public.add_review(uuid, integer, text[], text) to authenticated;
grant execute on function public.approve_restaurant(uuid) to authenticated;
grant execute on function public.popular_menu_items() to anon, authenticated;
revoke all on function public.remove_review(uuid) from public;
grant execute on function public.remove_review(uuid) to authenticated;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
revoke all on function public.quote_custom_request(uuid, integer, text, timestamptz, timestamptz) from public;
revoke all on function public.decline_custom_request(uuid, text) from public;
revoke all on function public.withdraw_custom_request(uuid) from public;
revoke all on function public.accept_custom_quote(uuid) from public;
grant execute on function public.quote_custom_request(uuid, integer, text, timestamptz, timestamptz) to authenticated;
grant execute on function public.decline_custom_request(uuid, text) to authenticated;
grant execute on function public.withdraw_custom_request(uuid) to authenticated;
grant execute on function public.accept_custom_quote(uuid) to authenticated;

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on public.profiles, public.restaurants, public.restaurant_addresses,
  public.menu_items, public.restaurant_documents, public.favorites to authenticated;
-- Signed-out visitors never need a kitchen's street address.
revoke select on public.restaurant_addresses from anon;
grant insert on public.grower_waitlist to anon, authenticated;
grant insert on public.review_reports to authenticated;
grant insert (order_id, kind, note) on public.order_issues to authenticated;
grant update (resolved_at) on public.order_issues to authenticated;
grant insert (order_id, body), delete on public.order_messages to authenticated;
grant insert (order_id, body, photo_path) on public.order_updates to authenticated;
grant insert (order_id, read_at), update (read_at) on public.order_chat_reads to authenticated;
grant insert (blocked_id), delete on public.user_blocks to authenticated;
grant insert (message_id) on public.message_reports to authenticated;
grant insert, update, delete on public.drops, public.drop_items, public.discount_codes to authenticated;
-- Customers never read a kitchen's codes; signed-out visitors never need them.
revoke select on public.discount_codes from anon;
grant insert (restaurant_id, customer_name, occasion, details, servings, needed_by, budget_cents)
  on public.custom_requests to authenticated;
grant insert (restaurant_id, body) on public.kitchen_alerts to authenticated;
grant insert (zip), delete on public.area_waitlist to authenticated;
grant execute on function public.nearby_kitchens(numeric, numeric, numeric) to anon, authenticated;
revoke all on function public.area_demand() from public;
revoke all on function public.kitchens_waiting_by_state() from public;
grant execute on function public.kitchens_waiting_by_state() to authenticated;
grant execute on function public.area_demand() to authenticated;

-- Live updates for the order screen and the chat, where Supabase Realtime is available.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.orders, public.order_messages;
  end if;
end $$;
