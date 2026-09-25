-- Meal Tracker initial schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

-- ─── Tables ────────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  calorie_target integer not null default 2200,
  protein_target_g integer not null default 150,
  carb_target_g integer not null default 250,
  fat_target_g integer not null default 70,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snacks')),
  created_at timestamptz not null default now(),
  unique (user_id, date, meal_type)
);

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  name text not null,
  quantity text,
  calories numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  photo_url text, -- storage path inside the meal-photos bucket
  notes text,
  created_at timestamptz not null default now()
);

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  quantity text,
  calories numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index idx_meals_user_date on public.meals (user_id, date desc);
create index idx_meal_items_meal on public.meal_items (meal_id);

-- ─── Auto-create a profile row on signup ───────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Row Level Security ────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.favorites enable row level security;

create policy "Users manage their own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users manage their own meals"
  on public.meals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage items of their own meals"
  on public.meal_items for all
  using (
    exists (
      select 1 from public.meals m
      where m.id = meal_items.meal_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.meals m
      where m.id = meal_items.meal_id and m.user_id = auth.uid()
    )
  );

create policy "Users manage their own favorites"
  on public.favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Storage: private meal-photos bucket ───────────────────────────────────

insert into storage.buckets (id, name, public)
values ('meal-photos', 'meal-photos', false)
on conflict (id) do nothing;

create policy "Users upload to their own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users read their own photos"
  on storage.objects for select
  using (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete their own photos"
  on storage.objects for delete
  using (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
