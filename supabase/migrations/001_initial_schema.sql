-- EarnHub initial marketplace schema
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  bio text,
  home_location text default 'Fountain Hill, PA',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 4 and 100),
  description text not null check (char_length(description) between 10 and 3000),
  category text not null default 'Other',
  location text not null,
  pay_amount numeric(10,2) not null check (pay_amount > 0),
  pay_type text not null default 'fixed' check (pay_type in ('fixed','hourly')),
  status text not null default 'open' check (status in ('open','in_progress','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  worker_id uuid not null references public.profiles(id) on delete cascade,
  message text not null default '',
  status text not null default 'pending' check (status in ('pending','accepted','declined','withdrawn')),
  created_at timestamptz not null default now(),
  unique(job_id, worker_id)
);

-- Immutable accounting entries. Actual money movement is not enabled until Stripe Connect is configured.
create table if not exists public.rewards_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  job_id uuid references public.jobs(id) on delete restrict,
  entry_type text not null check (entry_type in ('job_payment','platform_commission','referral_reward','adjustment')),
  amount numeric(10,2) not null,
  currency text not null default 'USD',
  description text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.rewards_ledger enable row level security;

create policy "Profiles are viewable by authenticated users"
on public.profiles for select to authenticated using (true);
create policy "Users create their own profile"
on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users update their own profile"
on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "Authenticated users view open jobs and their own jobs"
on public.jobs for select to authenticated
using (status = 'open' or poster_id = auth.uid());
create policy "Users post jobs as themselves"
on public.jobs for insert to authenticated with check (poster_id = auth.uid());
create policy "Posters update their own jobs"
on public.jobs for update to authenticated using (poster_id = auth.uid()) with check (poster_id = auth.uid());

create policy "Workers view their applications and posters view applications for their jobs"
on public.applications for select to authenticated
using (worker_id = auth.uid() or exists (
  select 1 from public.jobs where jobs.id = applications.job_id and jobs.poster_id = auth.uid()
));
create policy "Workers apply as themselves"
on public.applications for insert to authenticated with check (
  worker_id = auth.uid() and exists (
    select 1 from public.jobs where jobs.id = applications.job_id and jobs.status = 'open'
  )
);
create policy "Posters update application status"
on public.applications for update to authenticated using (
  exists (select 1 from public.jobs where jobs.id = applications.job_id and jobs.poster_id = auth.uid())
) with check (
  exists (select 1 from public.jobs where jobs.id = applications.job_id and jobs.poster_id = auth.uid())
);

create policy "Users view their own ledger entries"
on public.rewards_ledger for select to authenticated using (user_id = auth.uid());

-- Profile rows are automatically created when a new account is registered.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Prevent changes/deletions to ledger history from client sessions.
create or replace function public.prevent_ledger_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Rewards ledger entries are append-only';
end;
$$;
create trigger rewards_ledger_no_update
before update or delete on public.rewards_ledger
for each row execute procedure public.prevent_ledger_mutation();

grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.jobs to authenticated;
grant select, insert, update on public.applications to authenticated;
grant select on public.rewards_ledger to authenticated;
