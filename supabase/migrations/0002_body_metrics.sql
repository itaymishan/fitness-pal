-- Body composition metrics (Renpho-style scale screenshots)
-- Run this in the Supabase SQL editor (after 0001_init.sql).

create table public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at timestamptz not null,
  weight_kg numeric,
  bmi numeric,
  body_fat_pct numeric,
  fat_free_weight_kg numeric,
  subcutaneous_fat_pct numeric,
  visceral_fat numeric,
  body_water_pct numeric,
  skeletal_muscle_pct numeric,
  muscle_mass_kg numeric,
  bone_mass_kg numeric,
  protein_pct numeric,
  bmr_kcal numeric,
  metabolic_age numeric,
  photo_url text, -- storage path inside the meal-photos bucket (<user_id>/body/...)
  created_at timestamptz not null default now()
);

create index idx_body_metrics_user_measured on public.body_metrics (user_id, measured_at desc);

alter table public.body_metrics enable row level security;

create policy "Users manage their own body metrics"
  on public.body_metrics for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Reuse the private meal-photos bucket: <user_id>/body/<file> satisfies the
-- existing "Users upload/read/delete their own photos" storage policies
-- (foldername(name)[1] = auth.uid()::text).
