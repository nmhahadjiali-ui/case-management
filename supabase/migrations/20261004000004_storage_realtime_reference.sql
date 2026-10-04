-- =============================================================================
-- Storage buckets, realtime and reference data
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Storage
--   case-documents : PRIVATE. Objects stored at "<case_id>/<uuid>-<file name>".
--                    Downloads go through short-lived signed URLs.
--   avatars        : public-read profile pictures at "<user_id>/<file name>".
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('case-documents', 'case-documents', false, 26214400, null),  -- 25 MB
  ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "case documents read" on storage.objects for select to authenticated
  using (bucket_id = 'case-documents' and public.is_active_user());

create policy "case documents upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'case-documents'
              and public.has_role('administrator', 'case_manager', 'staff'));

create policy "case documents delete" on storage.objects for delete to authenticated
  using (bucket_id = 'case-documents'
         and (owner_id = auth.uid()::text or public.has_role('administrator', 'case_manager')));

create policy "avatars read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars');

create policy "avatars upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Realtime: push new notifications to the header bell
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.notifications;

-- ---------------------------------------------------------------------------
-- Reference data (required in every environment — not demo data)
-- ---------------------------------------------------------------------------
insert into public.case_types (name, slug, sort_order) values
  ('Civil', 'civil', 1),
  ('Criminal', 'criminal', 2),
  ('Family', 'family', 3),
  ('Property', 'property', 4),
  ('Inheritance', 'inheritance', 5),
  ('Divorce', 'divorce', 6),
  ('Land', 'land', 7),
  ('Administrative', 'administrative', 8),
  ('Other', 'other', 9)
on conflict (slug) do nothing;

insert into public.app_settings (key, value) values
  ('organization', jsonb_build_object('name', 'Case Management Office')),
  ('oath', jsonb_build_object(
     'title', 'Oath of Service',
     'body',
     'I solemnly affirm that I will faithfully and impartially discharge the duties of my office.' || chr(10) || chr(10) ||
     'I will uphold the law and treat every person who comes before this office with fairness, dignity and respect, without fear or favour.' || chr(10) || chr(10) ||
     'I will safeguard the confidentiality of the records entrusted to me, use them only for their lawful purpose, and never disclose them without proper authority.' || chr(10) || chr(10) ||
     'I will act with honesty and integrity, avoid conflicts of interest, and perform my work diligently and without undue delay.' || chr(10) || chr(10) ||
     'This I affirm freely and in good conscience.'))
on conflict (key) do nothing;
