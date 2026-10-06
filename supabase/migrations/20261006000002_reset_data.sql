-- =============================================================================
-- "Delete all data" (Settings → System → Danger zone)
-- Wipes all case records. Called only from the resetAllData server action,
-- after it has re-verified the administrator's password, using the service role.
-- User accounts are removed by the server action through the Auth admin API,
-- and stored files through the Storage API (neither can be done from SQL).
-- =============================================================================

create or replace function public.reset_all_data(p_actor uuid, p_reset_settings boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Children first; most of these also cascade from cases/people.
  delete from public.event_participants where true;
  delete from public.events where true;
  delete from public.tasks where true;
  delete from public.case_documents where true;
  delete from public.case_notes where true;
  delete from public.case_tags where true;
  delete from public.case_parties where true;
  delete from public.cases where true;
  delete from public.person_notes where true;
  delete from public.people where true;
  delete from public.notifications where true;
  delete from public.email_change_requests where true;
  -- The deletes above wrote audit rows; clear the log last.
  delete from public.activity_logs where true;

  if p_reset_settings then
    update public.app_settings set value = jsonb_build_object(
      'title', 'Oath of Service',
      'body',
      'I solemnly affirm that I will faithfully and impartially discharge the duties of my office.' || chr(10) || chr(10) ||
      'I will uphold the law and treat every person who comes before this office with fairness, dignity and respect, without fear or favour.' || chr(10) || chr(10) ||
      'I will safeguard the confidentiality of the records entrusted to me, use them only for their lawful purpose, and never disclose them without proper authority.' || chr(10) || chr(10) ||
      'I will act with honesty and integrity, avoid conflicts of interest, and perform my work diligently and without undue delay.' || chr(10) || chr(10) ||
      'This I affirm freely and in good conscience.'),
      updated_at = now(), updated_by = p_actor
    where key = 'oath';
    update public.app_settings set value = '{"app_logo_url": null, "splash_logo_url": null}'::jsonb,
      updated_at = now(), updated_by = p_actor
    where key = 'branding';
  end if;

  -- Leave one entry so the audit log shows who reset the system and when.
  perform public.log_activity('system.reset', 'system', null, null,
    case when p_reset_settings then 'All data deleted and settings reset to defaults' else 'All data deleted' end,
    jsonb_build_object('reset_settings', p_reset_settings), p_actor);
end;
$$;

revoke execute on function public.reset_all_data(uuid, boolean) from public, anon, authenticated;
grant execute on function public.reset_all_data(uuid, boolean) to service_role;
