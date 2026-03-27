# Supabase Manual Setup for Saved Learning Paths

This guide enables persistent storage of generated paths so each user can fetch them later.

## 1. Open Supabase SQL Editor
1. Open your Supabase project dashboard.
2. Go to `SQL Editor`.
3. Click `New query`.

## 2. Run the schema script
1. Copy the SQL below.
2. Paste it into Supabase SQL Editor.
3. Click `Run`.

```sql
create table if not exists public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  title text not null,
  description text not null default '',
  education_level text not null check (education_level in ('school', 'college', 'professional')),

  total_estimated_hours numeric(8,2) not null default 0,
  total_minutes integer not null default 0,
  module_count integer not null default 0,
  topic_count integer not null default 0,

  progress_percent numeric(5,2) not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  current_module_index integer not null default 0,
  completed_module_ids text[] not null default '{}',

  modules jsonb not null default '[]'::jsonb,

  source_type text not null check (source_type in ('text', 'upload', 'link')),
  source_input text not null,
  metadata jsonb not null default '{}'::jsonb,

  last_opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.learning_paths add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.learning_paths add column if not exists title text;
alter table public.learning_paths add column if not exists description text not null default '';
alter table public.learning_paths add column if not exists education_level text;
alter table public.learning_paths add column if not exists total_estimated_hours numeric(8,2) not null default 0;
alter table public.learning_paths add column if not exists total_minutes integer not null default 0;
alter table public.learning_paths add column if not exists module_count integer not null default 0;
alter table public.learning_paths add column if not exists topic_count integer not null default 0;
alter table public.learning_paths add column if not exists progress_percent numeric(5,2) not null default 0;
alter table public.learning_paths add column if not exists current_module_index integer not null default 0;
alter table public.learning_paths add column if not exists completed_module_ids text[] not null default '{}';
alter table public.learning_paths add column if not exists modules jsonb not null default '[]'::jsonb;
alter table public.learning_paths add column if not exists source_type text;
alter table public.learning_paths add column if not exists source_input text;
alter table public.learning_paths add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.learning_paths add column if not exists last_opened_at timestamptz;
alter table public.learning_paths add column if not exists created_at timestamptz not null default now();
alter table public.learning_paths add column if not exists updated_at timestamptz not null default now();

update public.learning_paths
set
  title = coalesce(title, 'Untitled Path'),
  education_level = coalesce(education_level, 'school'),
  source_type = coalesce(source_type, 'text'),
  source_input = coalesce(source_input, title, 'Unknown Source')
where
  title is null
  or education_level is null
  or source_type is null
  or source_input is null;

alter table public.learning_paths alter column title set not null;
alter table public.learning_paths alter column education_level set not null;
alter table public.learning_paths alter column source_type set not null;
alter table public.learning_paths alter column source_input set not null;

alter table public.learning_paths drop constraint if exists learning_paths_education_level_check;
alter table public.learning_paths add constraint learning_paths_education_level_check check (education_level in ('school', 'college', 'professional'));

alter table public.learning_paths drop constraint if exists learning_paths_source_type_check;
alter table public.learning_paths add constraint learning_paths_source_type_check check (source_type in ('text', 'upload', 'link'));

alter table public.learning_paths drop constraint if exists learning_paths_progress_percent_check;
alter table public.learning_paths add constraint learning_paths_progress_percent_check check (progress_percent >= 0 and progress_percent <= 100);

create index if not exists learning_paths_user_updated_idx
  on public.learning_paths (user_id, updated_at desc);

create index if not exists learning_paths_user_created_idx
  on public.learning_paths (user_id, created_at desc);

create index if not exists learning_paths_modules_gin_idx
  on public.learning_paths
  using gin (modules jsonb_path_ops);

alter table public.learning_paths enable row level security;

drop policy if exists "learning_paths_select_own" on public.learning_paths;
create policy "learning_paths_select_own"
  on public.learning_paths
  for select
  using (auth.uid() = user_id);

drop policy if exists "learning_paths_insert_own" on public.learning_paths;
create policy "learning_paths_insert_own"
  on public.learning_paths
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "learning_paths_update_own" on public.learning_paths;
create policy "learning_paths_update_own"
  on public.learning_paths
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "learning_paths_delete_own" on public.learning_paths;
create policy "learning_paths_delete_own"
  on public.learning_paths
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_learning_paths_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_learning_paths_set_updated_at on public.learning_paths;

create trigger trg_learning_paths_set_updated_at
before update on public.learning_paths
for each row
execute function public.set_learning_paths_updated_at();
```

What this creates:
- `public.learning_paths` table
- indexes for fast user-specific listing and filtering
- row-level security (RLS) policies so users can only read/write their own rows
- trigger for automatic `updated_at`

## 3. Verify table and columns
In Supabase `Table Editor`, confirm `learning_paths` has these key columns:
- `id` (uuid, PK)
- `user_id` (uuid, references `auth.users`)
- `title`, `description`, `education_level`
- `modules` (jsonb)
- `progress_percent`, `current_module_index`, `completed_module_ids`
- `source_type`, `source_input`, `metadata`
- `created_at`, `updated_at`, `last_opened_at`

## 4. Verify RLS policies
In Supabase `Authentication`/`Policies` view for `learning_paths`, confirm policies exist:
- `learning_paths_select_own`
- `learning_paths_insert_own`
- `learning_paths_update_own`
- `learning_paths_delete_own`

All of them should enforce `auth.uid() = user_id`.

## 5. Optional performance tuning
Run this query to inspect index usage after real traffic:
```sql
select schemaname, relname, indexrelname, idx_scan
from pg_stat_user_indexes
where relname = 'learning_paths'
order by idx_scan desc;
```

## 6. Frontend environment check
Confirm `.env` has valid values:
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_GROQ_API_KEY=...
```

Then restart dev server.

## 7. Functional verification flow
1. Sign in.
2. Create a new path from text/PDF/URL.
3. Click `Start Learning` on structure page.
4. Confirm record appears in `learning_paths` table.
5. Go to Dashboard and verify the new path appears in `Recent Learning Paths`.
6. Open the path, mark modules completed, move module navigation.
7. Refresh page and confirm progress is restored.

## 8. Common issues and fixes
- `new row violates row-level security policy`:
  - User session missing, or `user_id` in inserted row does not match `auth.uid()`.
- `relation "learning_paths" does not exist`:
  - Schema SQL not executed in correct project/environment.
- Empty dashboard list:
  - Check user is authenticated and records in `learning_paths` have matching `user_id`.
- Path opens from structure page but not after refresh:
  - Verify `/app/path/:id` route is used and DB read policy exists.
