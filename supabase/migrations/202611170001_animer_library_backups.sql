create table public.animer_library_backups (
  user_id uuid primary key references auth.users (id) on delete cascade,
  backup jsonb not null check (
    jsonb_typeof(backup) = 'object' and octet_length(backup::text) <= 10485760
  )
);

alter table public.animer_library_backups enable row level security;
revoke all on public.animer_library_backups from public, anon, authenticated;
grant select, insert, update on public.animer_library_backups to authenticated;

create policy "Read own Animer backup"
  on public.animer_library_backups for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Insert own Animer backup"
  on public.animer_library_backups for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Update own Animer backup"
  on public.animer_library_backups for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
