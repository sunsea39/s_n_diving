-- N×S_Diving v1.1. This migration is additive and safe to re-run on a Phase 1 database.
create table if not exists public.accidents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) > 0),
  occurred_on date,
  occurred_label text not null default '',
  location text not null default '',
  dive_style text not null default '',
  outcome text not null check (outcome in ('fatal', 'serious', 'minor', 'near_miss')),
  tags text[] not null default '{}',
  summary text not null default '',
  timeline jsonb not null default '[]'::jsonb,
  causes jsonb not null default '[]'::jsonb,
  lessons jsonb not null default '[]'::jsonb,
  related_doc_slugs text[] not null default '{}',
  sources jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.accidents add column if not exists occurred_on date;
alter table public.accidents add column if not exists occurred_label text not null default '';
alter table public.accidents add column if not exists location text not null default '';
alter table public.accidents add column if not exists dive_style text not null default '';
alter table public.accidents add column if not exists tags text[] not null default '{}';
alter table public.accidents add column if not exists summary text not null default '';
alter table public.accidents add column if not exists timeline jsonb not null default '[]'::jsonb;
alter table public.accidents add column if not exists causes jsonb not null default '[]'::jsonb;
alter table public.accidents add column if not exists lessons jsonb not null default '[]'::jsonb;
alter table public.accidents add column if not exists related_doc_slugs text[] not null default '{}';
alter table public.accidents add column if not exists sources jsonb not null default '[]'::jsonb;
alter table public.accidents add column if not exists status text not null default 'draft';
alter table public.accidents add column if not exists created_at timestamptz not null default now();
alter table public.accidents add column if not exists updated_at timestamptz not null default now();
alter table public.accidents add column if not exists updated_by uuid references auth.users(id) on delete set null;

-- Allow a document list card without an illustration while retaining the Phase 1 icon choices.
alter table public.docs drop constraint if exists docs_icon_check;
alter table public.docs alter column icon set default '';
alter table public.docs alter column icon drop not null;
alter table public.docs add constraint docs_icon_check check (icon is null or icon in ('', 'regulator', 'hose', 'bcd', 'computer', 'mask', 'fin', 'wetsuit', 'tank'));

create or replace function public.passcode_is_set()
returns boolean language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then
    raise exception '管理者権限が必要です。';
  end if;
  return exists (select 1 from public.settings where id = 1 and passcode_hash is not null);
end;
$$;

create index if not exists accidents_occurred_on_idx on public.accidents (occurred_on desc);
create index if not exists accidents_status_idx on public.accidents (status);

drop trigger if exists accidents_updated_at on public.accidents;
create trigger accidents_updated_at before update on public.accidents
for each row execute function public.set_updated_at();

alter table public.accidents enable row level security;
drop policy if exists "accidents public published read" on public.accidents;
drop policy if exists "accidents admin write" on public.accidents;
create policy "accidents public published read" on public.accidents
  for select to anon, authenticated using (status = 'published' or public.is_admin());
create policy "accidents admin write" on public.accidents
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.accidents to anon, authenticated;
grant insert, update, delete on public.accidents to authenticated;
revoke execute on function public.passcode_is_set() from public;
grant execute on function public.passcode_is_set() to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('docs-images', 'docs-images', true, 3145728, array['image/jpeg']::text[])
on conflict (id) do update set public = true, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg']::text[];

drop policy if exists "docs images public read" on storage.objects;
drop policy if exists "docs images admin insert" on storage.objects;
drop policy if exists "docs images admin update" on storage.objects;
drop policy if exists "docs images admin delete" on storage.objects;
create policy "docs images public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'docs-images');
create policy "docs images admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'docs-images' and public.is_admin());
create policy "docs images admin update" on storage.objects
  for update to authenticated using (bucket_id = 'docs-images' and public.is_admin())
  with check (bucket_id = 'docs-images' and public.is_admin());
create policy "docs images admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'docs-images' and public.is_admin());
