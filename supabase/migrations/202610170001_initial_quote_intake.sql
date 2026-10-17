-- NELTRIX initial quote intake and staff roles.
-- Apply in the Supabase SQL Editor or with the Supabase CLI before enabling quote intake.
begin;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'customer' check (role in ('customer', 'ops')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'customer')
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 100),
  email text not null check (char_length(email) <= 254),
  phone text,
  origin_country text not null check (origin_country in ('Brazil', 'United States')),
  destination_country text not null check (destination_country in ('Brazil', 'United States')),
  shipment_type text not null check (shipment_type in ('Documents or parcel', 'Commercial cargo', 'Air freight', 'Ocean freight', 'Not sure yet')),
  details text,
  status text not null default 'new' check (status in ('new', 'reviewing', 'quoted', 'declined', 'converted', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (origin_country <> destination_country)
);

create index if not exists quote_requests_created_at_idx on public.quote_requests (created_at desc);
create index if not exists quote_requests_status_created_at_idx on public.quote_requests (status, created_at desc);

create table if not exists public.quote_rate_limits (
  ip_hash text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0)
);

alter table public.profiles enable row level security;
alter table public.quote_requests enable row level security;
alter table public.quote_rate_limits enable row level security;

create or replace function public.is_ops_user()
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

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_ops_user()));

drop policy if exists "Ops can update quote requests" on public.quote_requests;
create policy "Ops can read quote requests"
on public.quote_requests for select to authenticated
using ((select public.is_ops_user()));

create policy "Ops can update quote requests"
on public.quote_requests for update to authenticated
using ((select public.is_ops_user()))
with check ((select public.is_ops_user()));

revoke all on public.quote_requests from anon, authenticated;
grant select, update on public.quote_requests to authenticated;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
revoke all on public.quote_rate_limits from anon, authenticated;

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

  insert into public.quote_rate_limits (ip_hash, window_started_at, request_count)
  values (p_ip_hash, v_now, 1)
  on conflict (ip_hash) do update
    set request_count = case
      when public.quote_rate_limits.window_started_at < v_now - interval '15 minutes' then 1
      else public.quote_rate_limits.request_count + 1
    end,
    window_started_at = case
      when public.quote_rate_limits.window_started_at < v_now - interval '15 minutes' then v_now
      else public.quote_rate_limits.window_started_at
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

revoke all on function public.submit_quote_request(text, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_quote_request(text, text, text, text, text, text, text, text) to service_role;
grant execute on function public.is_ops_user() to authenticated;

commit;
