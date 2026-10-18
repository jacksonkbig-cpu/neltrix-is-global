-- Keep privileged quote submission server-only and restrict the staff helper to signed-in users.
-- This migration mirrors the hotfix applied to the production Supabase project on 2026-10-18.
begin;
revoke execute on function private.is_ops_user() from public, anon, authenticated;
grant execute on function private.is_ops_user() to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.submit_quote_request(text, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_quote_request(text, text, text, text, text, text, text, text) to service_role;
revoke usage on schema private from public, anon;
grant usage on schema private to authenticated;
commit;
