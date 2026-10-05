-- =============================================================================
-- Branding: custom app logo and splash-screen logo
--   Files live in the public "branding" bucket under "app/" and "splash/".
--   The chosen URLs are stored in app_settings (key 'branding'):
--     { "app_logo_url": text | null, "splash_logo_url": text | null }
--   null means "use the built-in default".
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('branding', 'branding', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])  -- 2 MB
on conflict (id) do nothing;

create policy "branding read" on storage.objects for select
  using (bucket_id = 'branding');

create policy "branding admin upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'branding' and public.has_role('administrator')
              and (storage.foldername(name))[1] in ('app', 'splash'));

create policy "branding admin update" on storage.objects for update to authenticated
  using (bucket_id = 'branding' and public.has_role('administrator'));

create policy "branding admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'branding' and public.has_role('administrator'));

-- The sign-in page and splash screen are shown before anyone signs in,
-- so the branding row (and only that row) is readable by everyone.
create policy "app settings branding public read" on public.app_settings for select to anon, authenticated
  using (key = 'branding');
grant select on public.app_settings to anon;

insert into public.app_settings (key, value)
values ('branding', '{"app_logo_url": null, "splash_logo_url": null}'::jsonb)
on conflict (key) do nothing;
