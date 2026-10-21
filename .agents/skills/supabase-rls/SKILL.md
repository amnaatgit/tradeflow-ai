---
name: supabase-rls
description: Guidelines for adding tables and row-level security policies in Supabase so user data stays private.
---

How to add a per-user table
- Add columns: id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), created_at timestamptz default now(), plus your table-specific columns.
- Add an index on user_id for performance: create index if not exists idx_<table>_user_id on <table>(user_id);

RLS policies (four policies)
1. Enable RLS: alter table <table> enable row level security;
2. Insert policy: allow insert when auth.uid() = user_id;
3. Select policy: allow select when auth.uid() = user_id;
4. Update/Delete: allow update, delete when auth.uid() = user_id;

Migrations
- Add SQL to supabase/migrations with a descriptive filename. Prefer `create table if not exists` and `create index if not exists` so migrations are re-runnable.

Browser access
- Use createClient() from lib/supabase/client.ts in the browser to read/write data. RLS will ensure only the signed-in user's rows are accessible.