# Supabase Setup for Coding Attempt History

Run the SQL below once in your Supabase SQL editor.

```sql
create table if not exists public.coding_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  learning_path_id uuid not null references public.learning_paths(id) on delete cascade,
  module_id text not null,
  language text not null,
  passed_count integer not null default 0,
  total_count integer not null default 0,
  status text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists coding_attempts_user_path_module_idx
  on public.coding_attempts (user_id, learning_path_id, module_id, created_at desc);

alter table public.coding_attempts enable row level security;

create policy "Users can insert own coding attempts"
  on public.coding_attempts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can read own coding attempts"
  on public.coding_attempts
  for select
  to authenticated
  using (auth.uid() = user_id);
```

## Notes

- If `gen_random_uuid()` is unavailable, enable extension:

```sql
create extension if not exists pgcrypto;
```

- No new environment variable is required for attempt history.
- Existing Supabase client configuration is sufficient.
