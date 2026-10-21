-- Per-user table template: every row belongs to the signed-in user who created it.
-- Replace "notes" and the columns with your own. Run in the Supabase SQL editor or as a migration.

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  title text not null,
  body text
);

alter table public.notes enable row level security;

create policy "notes: read own"   on public.notes for select using (auth.uid() = user_id);
create policy "notes: insert own" on public.notes for insert with check (auth.uid() = user_id);
create policy "notes: update own" on public.notes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notes: delete own" on public.notes for delete using (auth.uid() = user_id);

create index if not exists notes_user_id_idx on public.notes (user_id);

-- Optional: require the 2FA level for writes when the user has 2FA turned on.
-- create policy "notes: aal2 when enrolled" on public.notes as restrictive for all to authenticated
--   using (
--     array[(auth.jwt() ->> 'aal')] <@ (
--       select case when count(id) > 0 then array['aal2'] else array['aal1', 'aal2'] end
--       from auth.mfa_factors where user_id = auth.uid() and status = 'verified'
--     )
--   );
