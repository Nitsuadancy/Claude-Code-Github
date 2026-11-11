-- Storage buckets and who may read and write them. Paths start with the
-- uploader's user id ("<user id>/kitchen/<file>"), except oven-update photos,
-- which start with the order id ("<order id>/<file>").
--
-- Runs only where Supabase Storage exists (not in the local test database).

-- The order id a path starts with, or null when it doesn't start with one.
create or replace function public.storage_order_id(object_name text) returns uuid
language sql immutable as $$
  select case
    when split_part(object_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then split_part(object_name, '/', 1)::uuid
  end;
$$;

do $migration$
begin
  if not exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    raise notice 'No storage schema here; skipping bucket setup.';
    return;
  end if;

  insert into storage.buckets (id, name, public) values
    ('public-photos', 'public-photos', true),
    ('order-photos', 'order-photos', false),
    ('documents', 'documents', false)
  on conflict (id) do nothing;

  -- Kitchen, dish and chef photos, pinned-update photos and intro videos: anyone may look;
  -- people write only in their own folder.
  execute $p$
    create policy "public photos are public" on storage.objects
      for select using (bucket_id = 'public-photos')
  $p$;
  execute $p$
    create policy "people upload to their own photo folder" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'public-photos' and split_part(name, '/', 1) = auth.uid()::text)
  $p$;
  execute $p$
    create policy "people replace and remove their own photos" on storage.objects
      for delete to authenticated
      using (bucket_id = 'public-photos' and split_part(name, '/', 1) = auth.uid()::text)
  $p$;

  -- Permits and IDs: the cook who uploaded them and the Manna team.
  execute $p$
    create policy "cooks upload their documents" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'documents' and split_part(name, '/', 1) = auth.uid()::text)
  $p$;
  execute $p$
    create policy "cooks and admins read documents" on storage.objects
      for select to authenticated
      using (bucket_id = 'documents' and (split_part(name, '/', 1) = auth.uid()::text or public.is_admin()))
  $p$;

  -- Order photos: a kitchen's pickup spot photo lives in the cook's folder and is
  -- shown to customers whose accepted orders carry it; oven-update photos live
  -- under the order and are shown to both sides of that order.
  execute $p$
    create policy "kitchens upload order photos" on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'order-photos'
        and (
          split_part(name, '/', 1) = auth.uid()::text
          or exists (
            select 1 from public.orders o
            where o.id = public.storage_order_id(name) and public.owns_restaurant(o.restaurant_id)
          )
        )
      )
  $p$;
  execute $p$
    create policy "both sides of an order see its photos" on storage.objects
      for select to authenticated
      using (
        bucket_id = 'order-photos'
        and (
          split_part(name, '/', 1) = auth.uid()::text
          or public.in_order_chat(public.storage_order_id(name))
          or exists (select 1 from public.orders o where o.pickup_photo_path = name and o.customer_id = auth.uid())
          or public.is_admin()
        )
      )
  $p$;
end
$migration$;
