-- S×N_Diving Phase 1 schema. Run after enabling the Supabase Auth service.
create extension if not exists pgcrypto;

create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null check (role in ('owner', 'editor')),
  created_at timestamptz not null default now()
);

create table public.settings (
  id integer primary key default 1 check (id = 1),
  passcode_hash text,
  passcode_version integer not null default 1 check (passcode_version > 0),
  disclaimer text not null default '',
  updated_at timestamptz not null default now()
);

create table public.board_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 20),
  passcode_version integer not null check (passcode_version > 0),
  joined_at timestamptz not null default now()
);

create table public.join_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  success boolean not null,
  created_at timestamptz not null default now()
);

create table public.docs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) > 0),
  category text not null check (char_length(category) > 0),
  summary text not null default '',
  icon text not null default 'mask' check (icon in ('regulator', 'hose', 'bcd', 'computer', 'mask', 'fin', 'wetsuit', 'tank')),
  body jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) > 0),
  body text not null check (char_length(body) > 0),
  next_dive_at timestamptz,
  next_dive_place text,
  pinned boolean not null default false,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);

create table public.threads (
  id bigint generated always as identity primary key,
  category text not null check (category in ('hiyari', 'plan', 'gear', 'chat')),
  title text not null check (char_length(title) between 1 and 60),
  body text not null default '' check (char_length(body) <= 4000),
  hiyari jsonb,
  image_path text,
  author_name text not null check (char_length(author_name) between 1 and 20),
  author_uid uuid not null references auth.users(id) on delete cascade,
  reply_count integer not null default 0 check (reply_count >= 0),
  last_post_at timestamptz not null default now(),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((category = 'hiyari' and hiyari is not null and body = '' and hiyari ? 'what' and hiyari ? 'why' and hiyari ? 'next' and char_length(coalesce(hiyari ->> 'what', '')) > 0 and char_length(coalesce(hiyari ->> 'why', '')) > 0 and char_length(coalesce(hiyari ->> 'next', '')) > 0) or (category <> 'hiyari' and hiyari is null and char_length(body) > 0))
);

create table public.posts (
  id bigint generated always as identity primary key,
  thread_id bigint not null references public.threads(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  image_path text,
  author_name text not null check (char_length(author_name) between 1 and 20),
  author_uid uuid not null references auth.users(id) on delete cascade,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.settings (id, passcode_hash, passcode_version, disclaimer)
values (1, null, 1, '')
on conflict (id) do nothing;

create index threads_last_post_at_idx on public.threads (last_post_at desc);
create index posts_thread_id_created_at_idx on public.posts (thread_id, created_at);
create index join_attempts_user_created_at_idx on public.join_attempts (user_id, created_at desc);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

create or replace function public.is_board_member()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select public.is_admin() or exists (
    select 1 from public.board_members member
    join public.settings setting on setting.id = 1
    where member.user_id = (select auth.uid())
      and member.passcode_version = setting.passcode_version
  );
$$;

create or replace function public.join_board(p_passcode text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  current_uid uuid := auth.uid();
  current_hash text;
  current_version integer;
  user_failed_count integer;
  global_failed_count integer;
begin
  if current_uid is null then
    raise exception 'セッションを確認できません。もう一度お試しください。';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('join_board_global', 0));
  perform pg_advisory_xact_lock(hashtextextended(current_uid::text, 0));

  select count(*) into user_failed_count from public.join_attempts
    where user_id = current_uid and success = false and created_at > now() - interval '10 minutes';
  select count(*) into global_failed_count from public.join_attempts
    where success = false and created_at > now() - interval '10 minutes';
  if user_failed_count >= 5 or global_failed_count >= 30 then
    return 'locked';
  end if;

  select passcode_hash, passcode_version into current_hash, current_version from public.settings where id = 1 for update;
  if current_hash is null then
    return 'not_set';
  end if;
  if p_passcode is null or crypt(p_passcode, current_hash) <> current_hash then
    insert into public.join_attempts(user_id, success) values (current_uid, false);
    return 'wrong';
  end if;

  insert into public.join_attempts(user_id, success) values (current_uid, true);
  insert into public.board_members(user_id, display_name, passcode_version)
    values (current_uid, left(coalesce(nullif(trim(auth.jwt() -> 'user_metadata' ->> 'display_name'), ''), '仲間'), 20), current_version)
  on conflict (user_id) do update set passcode_version = excluded.passcode_version, joined_at = now();
  return 'ok';
end;
$$;

create or replace function public.set_passcode(p_passcode text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception '管理者権限が必要です。'; end if;
  if p_passcode is null or char_length(p_passcode) < 8 then raise exception '合言葉は8文字以上で入力してください。'; end if;
  update public.settings set passcode_hash = crypt(p_passcode, gen_salt('bf')), passcode_version = passcode_version + 1 where id = 1;
  if not found then raise exception '設定の初期化に失敗しました。'; end if;
end;
$$;

create or replace function public.set_disclaimer(p_disclaimer text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception '管理者権限が必要です。'; end if;
  update public.settings set disclaimer = coalesce(p_disclaimer, '') where id = 1;
end;
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function public.limit_board_post_rate()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare total_count integer;
begin
  if new.author_uid is distinct from auth.uid() then raise exception '投稿者が一致しません。'; end if;
  select count(*) into total_count from (
    select author_uid from public.threads where author_uid = new.author_uid and created_at > now() - interval '1 minute'
    union all
    select author_uid from public.posts where author_uid = new.author_uid and created_at > now() - interval '1 minute'
  ) recent;
  if total_count >= 3 then raise exception '投稿は1分間に3件までです。少し時間をおいてください。'; end if;
  return new;
end;
$$;

create or replace function public.refresh_thread_stats()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare affected_thread bigint;
begin
  if tg_op = 'DELETE' then affected_thread := old.thread_id; else affected_thread := new.thread_id; end if;
  update public.threads
    set reply_count = (select count(*) from public.posts where thread_id = affected_thread),
        last_post_at = coalesce((select max(created_at) from public.posts where thread_id = affected_thread), created_at)
    where id = affected_thread;
  return null;
end;
$$;

create trigger settings_updated_at before update on public.settings for each row execute function public.set_updated_at();
create trigger docs_updated_at before update on public.docs for each row execute function public.set_updated_at();
create trigger threads_updated_at before update on public.threads for each row execute function public.set_updated_at();
create trigger posts_updated_at before update on public.posts for each row execute function public.set_updated_at();
create trigger threads_rate_limit before insert on public.threads for each row execute function public.limit_board_post_rate();
create trigger posts_rate_limit before insert on public.posts for each row execute function public.limit_board_post_rate();
create trigger posts_refresh_thread_on_insert after insert on public.posts for each row execute function public.refresh_thread_stats();
create trigger posts_refresh_thread_on_delete after delete on public.posts for each row execute function public.refresh_thread_stats();

alter table public.admins enable row level security;
alter table public.settings enable row level security;
alter table public.board_members enable row level security;
alter table public.join_attempts enable row level security;
alter table public.docs enable row level security;
alter table public.news enable row level security;
alter table public.threads enable row level security;
alter table public.posts enable row level security;

create policy "admins read themselves only through admin check" on public.admins for select to authenticated using (public.is_admin());
create policy "docs public published read" on public.docs for select to anon, authenticated using (status = 'published' or public.is_admin());
create policy "docs admin write" on public.docs for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "news published read" on public.news for select to anon, authenticated using (published_at is not null and published_at <= now() or public.is_admin());
create policy "news admin write" on public.news for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "threads board read" on public.threads for select to authenticated using (public.is_board_member() and (not hidden or public.is_admin()));
create policy "threads board insert" on public.threads for insert to authenticated with check (public.is_board_member() and author_uid = (select auth.uid()));
create policy "threads owner or admin update" on public.threads for update to authenticated using (public.is_admin() or (public.is_board_member() and author_uid = (select auth.uid()))) with check (public.is_admin() or (public.is_board_member() and author_uid = (select auth.uid()) and hidden = false));
create policy "threads owner or admin delete" on public.threads for delete to authenticated using (public.is_admin() or (public.is_board_member() and author_uid = (select auth.uid())));
create policy "posts board read" on public.posts for select to authenticated using (public.is_board_member() and (not hidden or public.is_admin()));
create policy "posts board insert" on public.posts for insert to authenticated with check (public.is_board_member() and author_uid = (select auth.uid()));
create policy "posts owner or admin update" on public.posts for update to authenticated using (public.is_admin() or (public.is_board_member() and author_uid = (select auth.uid()))) with check (public.is_admin() or (public.is_board_member() and author_uid = (select auth.uid()) and hidden = false));
create policy "posts owner or admin delete" on public.posts for delete to authenticated using (public.is_admin() or (public.is_board_member() and author_uid = (select auth.uid())));

-- This view deliberately projects only the public disclaimer; passcode_hash is never exposed to clients.
create view public.public_settings with (security_invoker = false) as select disclaimer from public.settings where id = 1;

revoke all on public.settings, public.board_members, public.join_attempts from anon, authenticated;
revoke update on public.threads, public.posts from authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.docs, public.news, public.public_settings to anon, authenticated;
grant insert, delete on public.docs, public.news, public.threads, public.posts to authenticated;
grant update on public.docs, public.news to authenticated;
grant update (title, body, hiyari, hidden) on public.threads to authenticated;
grant update (body, hidden) on public.posts to authenticated;
grant select on public.threads, public.posts, public.admins to authenticated;
revoke execute on function public.is_admin(), public.is_board_member(), public.join_board(text), public.set_passcode(text), public.set_disclaimer(text) from public;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_admin(), public.is_board_member(), public.join_board(text), public.set_passcode(text), public.set_disclaimer(text) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('board-images', 'board-images', false, 3145728, array['image/jpeg']::text[])
on conflict (id) do update set public = false, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg']::text[];
create policy "board images read" on storage.objects for select to authenticated using (bucket_id = 'board-images' and public.is_board_member());
create policy "board images upload own" on storage.objects for insert to authenticated with check (bucket_id = 'board-images' and public.is_board_member() and split_part(name, '/', 1) = (select auth.uid())::text and lower(right(name, 4)) = '.jpg');
create policy "board images update own or admin" on storage.objects for update to authenticated using (bucket_id = 'board-images' and (owner_id = (select auth.uid())::text or public.is_admin())) with check (bucket_id = 'board-images' and (owner_id = (select auth.uid())::text or public.is_admin()));
create policy "board images delete own or admin" on storage.objects for delete to authenticated using (bucket_id = 'board-images' and (owner_id = (select auth.uid())::text or public.is_admin()));
