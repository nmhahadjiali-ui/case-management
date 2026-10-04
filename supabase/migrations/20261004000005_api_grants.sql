-- Table privileges for the Data API roles.
-- Local Supabase grants these by default, but newer hosted projects do not
-- auto-expose new tables. Access is still governed by the RLS policies.
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to authenticated, service_role;

alter default privileges in schema public grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema public grant usage, select on sequences to authenticated, service_role;

-- Re-apply the column-level restriction from the RLS migration.
revoke update on public.notifications from authenticated;
grant update (is_read) on public.notifications to authenticated;
