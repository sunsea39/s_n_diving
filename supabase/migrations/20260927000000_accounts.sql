-- N×S_Diving v2.0: personal accounts. Additive and safe to run again.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'pending' check (role in ('pending', 'member', 'editor', 'owner', 'suspended')),
  display_name text not null check (char_length(display_name) between 1 and 20),
  avatar_path text,
  bio text not null default '' check (char_length(bio) <= 200),
  license text not null default '' check (char_length(license) <= 60),
  dive_count integer check (dive_count is null or dive_count between 0 and 100000),
  favorite_areas text not null default '' check (char_length(favorite_areas) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references auth.users(id)
);

create table if not exists public.gear_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  maker_model text not null default '' check (char_length(maker_model) <= 80),
  purchased_on date,
  last_service_on date,
  next_service_on date,
  memo text not null default '' check (char_length(memo) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill real users before installing the trigger. Anonymous users intentionally have no profile.
insert into public.profiles (id, display_name)
select u.id,
  left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''), nullif(split_part(coalesce(u.email, ''), '@', 1), ''), 'ユーザー'), 20)
from auth.users u
where coalesce(u.is_anonymous, false) = false
on conflict (id) do nothing;

insert into public.profiles (id, role, display_name, approved_at)
select a.user_id, 'owner', left(coalesce(nullif(trim(a.display_name), ''), '管理者'), 20), now()
from public.admins a
on conflict (id) do update set role = 'owner', display_name = excluded.display_name,
  approved_at = coalesce(public.profiles.approved_at, excluded.approved_at);

create or replace function public.handle_new_user_profile()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if coalesce(new.is_anonymous, false) then return new; end if;
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'ユーザー'), 20)
  ) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users for each row execute function public.handle_new_user_profile();

create or replace function public.current_role_name()
returns text language sql stable security definer set search_path = public, pg_temp as $$
  select role from public.profiles where id = (select auth.uid());
$$;
create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select public.current_role_name() = 'owner';
$$;
create or replace function public.is_editor()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select public.current_role_name() in ('editor', 'owner');
$$;
create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select public.current_role_name() in ('member', 'editor', 'owner');
$$;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select public.is_owner();
$$;
create or replace function public.is_board_member()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select public.is_member();
$$;

create or replace function public.set_member_role(p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare old_role text;
begin
  if not public.is_owner() then raise exception 'メインの管理者権限が必要です。'; end if;
  if p_user is null or p_user = auth.uid() then raise exception '自分自身の権限は変更できません。'; end if;
  if p_role not in ('pending', 'member', 'editor', 'owner', 'suspended') then raise exception '無効な権限です。'; end if;
  perform pg_advisory_xact_lock(hashtextextended('profiles_owner_role', 0));
  select role into old_role from public.profiles where id = p_user for update;
  if old_role is null then raise exception 'メンバーが見つかりません。'; end if;
  if old_role = 'owner' and p_role <> 'owner' and (select count(*) from public.profiles where role = 'owner') <= 1 then
    raise exception '最後のメインの管理者は変更できません。';
  end if;
  update public.profiles
  set role = p_role,
      approved_at = case when old_role = 'pending' and p_role in ('member', 'editor', 'owner') then now() else approved_at end,
      approved_by = case when old_role = 'pending' and p_role in ('member', 'editor', 'owner') then auth.uid() else approved_by end
  where id = p_user;
end;
$$;

create or replace function public.admin_set_password(p_user uuid, p_password text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_owner() then raise exception 'メインの管理者権限が必要です。'; end if;
  if p_user is null or p_user = auth.uid() then raise exception '自分自身のパスワードはここでは変更できません。'; end if;
  if p_password is null or char_length(p_password) < 8 then raise exception 'パスワードは8文字以上で入力してください。'; end if;
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() where id = p_user;
  if not found then raise exception 'メンバーが見つかりません。'; end if;
end;
$$;

create or replace function public.list_members()
returns table (id uuid, email text, role text, display_name text, avatar_path text, created_at timestamptz, approved_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.is_owner() then raise exception 'メインの管理者権限が必要です。'; end if;
  return query select p.id, u.email, p.role, p.display_name, p.avatar_path, p.created_at, p.approved_at, u.last_sign_in_at
    from public.profiles p join auth.users u on u.id = p.id order by p.created_at desc;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists gear_notes_updated_at on public.gear_notes;
create trigger gear_notes_updated_at before update on public.gear_notes for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.gear_notes enable row level security;
drop policy if exists "profiles read" on public.profiles;
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated using (
  id = (select auth.uid())
  or public.is_owner()
  or (public.is_member() and role in ('member', 'editor', 'owner'))
);
create policy "profiles self update" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
drop policy if exists "gear notes own" on public.gear_notes;
create policy "gear notes own" on public.gear_notes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- News is editable by editors; content and configuration remain owner-only via is_admin().
drop policy if exists "news published read" on public.news;
drop policy if exists "news admin write" on public.news;
drop policy if exists "news editor write" on public.news;
create policy "news published read" on public.news for select to anon, authenticated
  using ((published_at is not null and published_at <= now()) or public.is_editor());
create policy "news editor write" on public.news for all to authenticated
  using (public.is_editor()) with check (public.is_editor());

drop policy if exists "threads board read" on public.threads;
drop policy if exists "threads board insert" on public.threads;
drop policy if exists "threads owner or admin update" on public.threads;
drop policy if exists "threads owner or admin delete" on public.threads;
drop policy if exists "threads owner or editor update" on public.threads;
drop policy if exists "threads owner or editor delete" on public.threads;
drop policy if exists "posts board read" on public.posts;
drop policy if exists "posts board insert" on public.posts;
drop policy if exists "posts owner or admin update" on public.posts;
drop policy if exists "posts owner or admin delete" on public.posts;
drop policy if exists "posts owner or editor update" on public.posts;
drop policy if exists "posts owner or editor delete" on public.posts;
create policy "threads board read" on public.threads for select to authenticated
  using (public.is_member() and (not hidden or public.is_editor()));
create policy "threads board insert" on public.threads for insert to authenticated
  with check (public.is_member() and author_uid = (select auth.uid()));
create policy "threads owner or editor update" on public.threads for update to authenticated
  using (public.is_editor() or (public.is_member() and author_uid = (select auth.uid())))
  with check (public.is_editor() or (public.is_member() and author_uid = (select auth.uid()) and hidden = false));
create policy "threads owner or editor delete" on public.threads for delete to authenticated
  using (public.is_editor() or (public.is_member() and author_uid = (select auth.uid())));
create policy "posts board read" on public.posts for select to authenticated
  using (public.is_member() and (not hidden or public.is_editor()));
create policy "posts board insert" on public.posts for insert to authenticated
  with check (public.is_member() and author_uid = (select auth.uid()));
create policy "posts owner or editor update" on public.posts for update to authenticated
  using (public.is_editor() or (public.is_member() and author_uid = (select auth.uid())))
  with check (public.is_editor() or (public.is_member() and author_uid = (select auth.uid()) and hidden = false));
create policy "posts owner or editor delete" on public.posts for delete to authenticated
  using (public.is_editor() or (public.is_member() and author_uid = (select auth.uid())));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/webp']::text[])
on conflict (id) do update set public = true, file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg', 'image/webp']::text[];
drop policy if exists "board images read" on storage.objects;
drop policy if exists "board images upload own" on storage.objects;
drop policy if exists "board images update own or admin" on storage.objects;
drop policy if exists "board images delete own or admin" on storage.objects;
drop policy if exists "board images update own or editor" on storage.objects;
drop policy if exists "board images delete own or editor" on storage.objects;
create policy "board images read" on storage.objects for select to authenticated
  using (bucket_id = 'board-images' and public.is_member());
create policy "board images upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'board-images' and public.is_member() and split_part(name, '/', 1) = (select auth.uid())::text and lower(right(name, 4)) = '.jpg');
create policy "board images update own or editor" on storage.objects for update to authenticated
  using (bucket_id = 'board-images' and (owner_id = (select auth.uid())::text or public.is_editor()))
  with check (bucket_id = 'board-images' and (owner_id = (select auth.uid())::text or public.is_editor()));
create policy "board images delete own or editor" on storage.objects for delete to authenticated
  using (bucket_id = 'board-images' and (owner_id = (select auth.uid())::text or public.is_editor()));
drop policy if exists "avatars public read" on storage.objects;
drop policy if exists "avatars own insert" on storage.objects;
drop policy if exists "avatars own update" on storage.objects;
drop policy if exists "avatars own delete" on storage.objects;
create policy "avatars public read" on storage.objects for select to anon, authenticated using (bucket_id = 'avatars');
create policy "avatars own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text and owner_id = (select auth.uid())::text);
create policy "avatars own update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text and owner_id = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text and owner_id = (select auth.uid())::text);
create policy "avatars own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text and owner_id = (select auth.uid())::text);

revoke all on public.profiles, public.gear_notes from anon;
revoke insert, delete on public.profiles from authenticated;
revoke update on public.profiles from authenticated;
grant select on public.profiles, public.gear_notes to authenticated;
grant insert, delete on public.gear_notes to authenticated;
grant update (display_name, avatar_path, bio, license, dive_count, favorite_areas) on public.profiles to authenticated;
grant update (name, maker_model, purchased_on, last_service_on, next_service_on, memo) on public.gear_notes to authenticated;
revoke insert, update, delete on public.news from authenticated;
grant insert, update, delete on public.news to authenticated;

revoke execute on function public.handle_new_user_profile(), public.current_role_name(), public.is_owner(), public.is_editor(), public.is_member(), public.set_member_role(uuid, text), public.admin_set_password(uuid, text), public.list_members() from public;
revoke execute on function public.join_board(text), public.set_passcode(text) from authenticated;
grant execute on function public.current_role_name(), public.is_owner(), public.is_editor(), public.is_member(), public.is_admin(), public.is_board_member() to anon, authenticated;
grant execute on function public.set_member_role(uuid, text), public.admin_set_password(uuid, text), public.list_members() to authenticated;
