-- Placeholder "items" table copied from core tables migration
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text,
  data jsonb,
  inserted_at timestamptz default now()
);

alter table items enable row level security;

create policy "Users can insert their rows" on items for insert with (auth.role() = 'authenticated') ;
create policy "Users can select their rows" on items for select using (auth.uid() = user_id);
create policy "Users can update their rows" on items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their rows" on items for delete using (auth.uid() = user_id);

create index if not exists idx_items_user_id on items(user_id);
