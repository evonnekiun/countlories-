-- Run this once in Supabase Dashboard > SQL Editor for this project.
-- Do not use this as a public-read policy template. These tables hold private user data.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  height_cm numeric(6,2) check (height_cm is null or height_cm > 0),
  current_weight_kg numeric(6,2) check (current_weight_kg is null or current_weight_kg > 0),
  goal_weight_kg numeric(6,2) check (goal_weight_kg is null or goal_weight_kg > 0),
  calorie_goal integer check (calorie_goal is null or calorie_goal > 0),
  protein_goal_g integer check (protein_goal_g is null or protein_goal_g > 0),
  carbs_goal_g integer check (carbs_goal_g is null or carbs_goal_g > 0),
  fat_goal_g integer check (fat_goal_g is null or fat_goal_g > 0),
  focus text,
  calorie_tracking boolean not null default false,
  macro_tracking boolean not null default false,
  reminders_enabled boolean not null default false,
  reminder_time text not null default '12:30',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  eaten_at timestamptz not null default now(),
  food_name text not null,
  calories numeric(8,2) check (calories is null or calories >= 0),
  protein_g numeric(8,2) check (protein_g is null or protein_g >= 0),
  carbs_g numeric(8,2) check (carbs_g is null or carbs_g >= 0),
  fat_g numeric(8,2) check (fat_g is null or fat_g >= 0),
  source text not null default 'manual' check (source in ('manual', 'photo_manual', 'ai_estimate')),
  photo_path text,
  created_at timestamptz not null default now()
);

create table public.movement_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  moved_at timestamptz not null default now(),
  activity text not null,
  feeling text,
  created_at timestamptz not null default now()
);

create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  planned_for date not null,
  meal_name text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index food_entries_owner_time_idx on public.food_entries(user_id, eaten_at desc);
create index movement_entries_owner_time_idx on public.movement_entries(user_id, moved_at desc);
create index meal_plans_owner_day_idx on public.meal_plans(user_id, planned_for);

alter table public.profiles enable row level security;
alter table public.food_entries enable row level security;
alter table public.movement_entries enable row level security;
alter table public.meal_plans enable row level security;

revoke all on public.profiles, public.food_entries, public.movement_entries, public.meal_plans from anon, authenticated;
grant select, insert, update, delete on public.profiles, public.food_entries, public.movement_entries, public.meal_plans to authenticated;

create policy profiles_select_own on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_delete_own on public.profiles for delete to authenticated using (id = (select auth.uid()));

create policy food_select_own on public.food_entries for select to authenticated using (user_id = (select auth.uid()));
create policy food_insert_own on public.food_entries for insert to authenticated with check (user_id = (select auth.uid()));
create policy food_update_own on public.food_entries for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy food_delete_own on public.food_entries for delete to authenticated using (user_id = (select auth.uid()));

create policy movement_select_own on public.movement_entries for select to authenticated using (user_id = (select auth.uid()));
create policy movement_insert_own on public.movement_entries for insert to authenticated with check (user_id = (select auth.uid()));
create policy movement_update_own on public.movement_entries for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy movement_delete_own on public.movement_entries for delete to authenticated using (user_id = (select auth.uid()));

create policy plans_select_own on public.meal_plans for select to authenticated using (user_id = (select auth.uid()));
create policy plans_insert_own on public.meal_plans for insert to authenticated with check (user_id = (select auth.uid()));
create policy plans_update_own on public.meal_plans for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy plans_delete_own on public.meal_plans for delete to authenticated using (user_id = (select auth.uid()));
