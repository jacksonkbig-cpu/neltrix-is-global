-- Move operational rate-limit state and the staff authorization helper out of the exposed API schema.
begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

alter table public.quote_rate_limits set schema private;
revoke all on table private.quote_rate_limits from public, anon, authenticated;
alter table private.quote_rate_limits enable row level security;

create or replace function private.is_ops_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'ops'
  );
$$;

revoke all on function private.is_ops_user() from public, anon;
grant execute on function private.is_ops_user() to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select private.is_ops_user()));

drop policy if exists "Ops can read quote requests" on public.quote_requests;
create policy "Ops can read quote requests"
on public.quote_requests for select to authenticated
using ((select private.is_ops_user()));

drop policy if exists "Ops can update quote requests" on public.quote_requests;
create policy "Ops can update quote requests"
on public.quote_requests for update to authenticated
using ((select private.is_ops_user()))
with check ((select private.is_ops_user()));

create or replace function public.submit_quote_request(
  p_full_name text,
  p_email text,
  p_phone text,
  p_origin_country text,
  p_destination_country text,
  p_shipment_type text,
  p_details text,
  p_ip_hash text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_count integer;
  v_id uuid;
begin
  if p_ip_hash is null or char_length(p_ip_hash) <> 64 then
    raise exception 'INVALID_RATE_LIMIT_KEY';
  end if;

  insert into private.quote_rate_limits (ip_hash, window_started_at, request_count)
  values (p_ip_hash, v_now, 1)
  on conflict (ip_hash) do update
    set request_count = case
      when private.quote_rate_limits.window_started_at < v_now - interval '15 minutes' then 1
      else private.quote_rate_limits.request_count + 1
    end,
    window_started_at = case
      when private.quote_rate_limits.window_started_at < v_now - interval '15 minutes' then v_now
      else private.quote_rate_limits.window_started_at
    end
  returning request_count into v_count;

  if v_count > 5 then
    raise exception 'RATE_LIMITED';
  end if;

  insert into public.quote_requests (
    full_name, email, phone, origin_country, destination_country, shipment_type, details
  ) values (
    p_full_name, lower(p_email), nullif(p_phone, ''), p_origin_country, p_destination_country,
    p_shipment_type, nullif(p_details, '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.is_ops_user() from public, anon, authenticated;
drop function public.is_ops_user();

revoke all on function public.submit_quote_request(text, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_quote_request(text, text, text, text, text, text, text, text) to service_role;

commit;
