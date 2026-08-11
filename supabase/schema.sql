-- Cumplimiento — Supabase schema for auth/account data (profiles, organizations, plan activation).
--
-- This schema was never checked into version control before; it lived only in the
-- original Supabase project. It's reverse-engineered from the app's own usage:
--   - app/panel/page.tsx           (profiles + organizations select)
--   - app/panel/dashboard-client.tsx (activate_preview_plan RPC, plan codes/limits/durations)
--   - app/login/actions.ts         (signUp options.data: full_name, company)
--
-- Run this once in the Supabase SQL Editor (Studio → SQL Editor → New query → Run)
-- against a fresh project. Safe to re-run (idempotent).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'free'
    check (plan in ('free', 'monthly', 'quarterly', 'semiannual', 'annual', 'premium')),
  status text not null default 'active',
  participant_limit integer not null default 10,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'owner',
  organization_id uuid references public.organizations (id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- New-user provisioning: signUp() passes full_name/company via options.data,
-- which lands in auth.users.raw_user_meta_data. This trigger turns that into
-- an organization + profile row automatically.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  insert into public.organizations (name, plan, status, participant_limit)
  values (coalesce(new.raw_user_meta_data ->> 'company', 'Mi organización'), 'free', 'active', 10)
  returning id into v_org_id;

  insert into public.profiles (id, full_name, role, organization_id)
  values (new.id, new.raw_user_meta_data ->> 'full_name', 'owner', v_org_id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- activate_preview_plan RPC — "no payment, launch mode" plan switch used by
-- the /panel dashboard. Plan codes/limits/durations mirror the `availablePlans`
-- array in app/panel/dashboard-client.tsx.
-- ---------------------------------------------------------------------------

create or replace function public.activate_preview_plan(requested_plan text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_limit integer;
  v_duration_days integer;
  v_expires timestamptz;
begin
  select organization_id into v_org_id from public.profiles where id = auth.uid();
  if v_org_id is null then
    raise exception 'No organization found for current user';
  end if;

  case requested_plan
    when 'free' then v_limit := 10; v_duration_days := null;
    when 'monthly' then v_limit := 100; v_duration_days := 30;
    when 'quarterly' then v_limit := 100; v_duration_days := 90;
    when 'semiannual' then v_limit := 100; v_duration_days := 180;
    when 'annual' then v_limit := 100; v_duration_days := 365;
    else raise exception 'Unknown plan: %', requested_plan;
  end case;

  v_expires := case when v_duration_days is null then null else now() + (v_duration_days || ' days')::interval end;

  update public.organizations
  set plan = requested_plan,
      status = 'active',
      participant_limit = v_limit,
      expires_at = v_expires
  where id = v_org_id;

  return jsonb_build_object('status', 'active', 'participant_limit', v_limit, 'expires_at', v_expires);
end;
$$;

grant execute on function public.activate_preview_plan(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security — each user can only see their own profile/organization.
-- Writes go through the SECURITY DEFINER functions above, not direct table access.
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Users can view own organization" on public.organizations;
create policy "Users can view own organization" on public.organizations
  for select using (
    id in (select organization_id from public.profiles where id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Public organization lookup — used by /juego (sin sesión) para validar el
-- link de invitación (?org=<id>) antes de mostrar el juego. Solo expone lo
-- mínimo necesario (nombre + si el plan está activo); nunca plan, límite de
-- participantes ni fecha de vencimiento exacta.
-- ---------------------------------------------------------------------------

create or replace function public.get_public_organization(org_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org record;
begin
  select name, status, expires_at into v_org
  from public.organizations
  where id = org_id;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'name', v_org.name,
    'is_active', v_org.status = 'active' and (v_org.expires_at is null or v_org.expires_at > now())
  );
end;
$$;

grant execute on function public.get_public_organization(uuid) to anon, authenticated;
