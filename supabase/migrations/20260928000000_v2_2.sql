-- N×S_Diving v2.2. Additive and safe to run again after v2.0.1.
-- This migration deliberately keeps the legacy news/profile columns for compatibility.

-- Permission helpers must be total: a caller without a profile is never an owner/member.
create or replace function public.current_role_name()
returns text language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select role from public.profiles where id = (select auth.uid())), '');
$$;
create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(public.current_role_name() = 'owner', false);
$$;
create or replace function public.is_editor()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(public.current_role_name() in ('editor', 'owner'), false);
$$;
create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(public.current_role_name() in ('member', 'editor', 'owner'), false);
$$;

create table if not exists public.page_texts (
  key text primary key check (key in ('home', 'docs', 'accidents', 'board', 'news', 'more')),
  kicker text not null default '' check (char_length(kicker) <= 40),
  title text not null default '' check (char_length(title) <= 60),
  lead text not null default '' check (char_length(lead) <= 300),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.page_texts enable row level security;
drop policy if exists "page texts public read" on public.page_texts;
drop policy if exists "page texts owner write" on public.page_texts;
create policy "page texts public read" on public.page_texts for select to anon, authenticated using (true);
create policy "page texts owner write" on public.page_texts for all to authenticated
  using (coalesce(public.is_owner(), false)) with check (coalesce(public.is_owner(), false));
drop trigger if exists page_texts_updated_at on public.page_texts;
create trigger page_texts_updated_at before update on public.page_texts
for each row execute function public.set_updated_at();
insert into public.page_texts(key, kicker, title, lead) values
  ('home', 'ダイビング情報の共有サイト', '知って潜れば、海はもっと楽しい。', '機材のこと、事故から学べること、仲間の経験。理解を深めて、安全に楽しく潜るための情報をここで共有します。'),
  ('docs', '資料', '安全資料', '潜る前に、仲間どうしで確認したい情報です。'),
  ('accidents', '事故事例', '事故から学ぶ', 'なぜ起きたか、どうすれば防げたかを考えるための事例です。'),
  ('board', '掲示板', 'みんなの記録', ''),
  ('news', 'お知らせ', 'お知らせ', ''),
  ('more', 'その他', 'このサイトについて', 'ダイビング情報の共有サイト。仲間どうしで知識や経験を共有し、より理解を深めて、安全に楽しく潜れるようにしたい。')
on conflict (key) do nothing;

alter table public.news add column if not exists category text not null default 'other';
alter table public.news add column if not exists staff text not null default '';
alter table public.news add column if not exists dive_start date;
alter table public.news add column if not exists dive_end date;
alter table public.news add column if not exists place text not null default '';
alter table public.news drop constraint if exists news_category_check;
alter table public.news add constraint news_category_check check (category in ('dive', 'other'));
alter table public.news drop constraint if exists news_dive_dates_check;
alter table public.news add constraint news_dive_dates_check check (dive_end is null or dive_start is null or dive_end >= dive_start);
update public.news
set category = case when next_dive_at is not null then 'dive' else coalesce(category, 'other') end,
    dive_start = coalesce(dive_start, (next_dive_at at time zone 'Asia/Tokyo')::date),
    place = case when place = '' then coalesce(next_dive_place, '') else place end
where next_dive_at is not null or category is null;
create index if not exists news_next_dive_v22_idx on public.news(category, dive_start, dive_end);

create or replace function public.reorder_docs(p_ids uuid[])
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare expected_count integer;
begin
  if auth.uid() is null or not coalesce(public.is_owner(), false) then
    raise exception 'メインの管理者権限が必要です。';
  end if;
  if p_ids is null or cardinality(p_ids) = 0 then return; end if;
  if cardinality(p_ids) <> cardinality(array(select distinct unnest(p_ids))) then
    raise exception '資料IDが重複しています。';
  end if;
  select count(*) into expected_count from public.docs where id = any(p_ids);
  if expected_count <> cardinality(p_ids) then raise exception '資料が見つかりません。'; end if;
  update public.docs d set sort_order = ordered.ordinality * 10
  from unnest(p_ids) with ordinality as ordered(id, ordinality)
  where d.id = ordered.id;
end;
$$;

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  doc_slug text not null,
  anchor text not null default '',
  label text not null check (char_length(label) <= 80),
  created_at timestamptz not null default now(),
  unique(user_id, doc_slug, anchor)
);
create index if not exists bookmarks_user_created_idx on public.bookmarks(user_id, created_at desc);
alter table public.bookmarks enable row level security;
drop policy if exists "bookmarks own active" on public.bookmarks;
create policy "bookmarks own active" on public.bookmarks for all to authenticated
  using (user_id = (select auth.uid()) and public.current_role_name() in ('pending', 'member', 'editor', 'owner'))
  with check (user_id = (select auth.uid()) and public.current_role_name() in ('pending', 'member', 'editor', 'owner'));

alter table public.profiles add column if not exists licenses jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists logged_dives integer not null default 0;
alter table public.profiles add column if not exists last_dived_on date;
alter table public.profiles add column if not exists avatar_style jsonb;

create or replace function public.valid_avatar_style(p_style jsonb)
returns boolean language plpgsql immutable set search_path = public, pg_temp as $$
begin
  return coalesce(
    jsonb_typeof(p_style) = 'object'
    and p_style ?& array['skin','hair','hairColor','face','suit','bg','mask']
    and not exists (select 1 from jsonb_object_keys(p_style) as key where key not in ('skin','hair','hairColor','face','suit','bg','mask'))
    and p_style->>'skin' in ('light','fair','tan','brown','deep')
    and p_style->>'hair' in ('buzz','short','bob','long','pony','bun')
    and p_style->>'hairColor' in ('black','brown','light','blond','gray','teal')
    and p_style->>'face' in ('smile','calm','wink','cool')
    and p_style->>'suit' in ('navy','black','teal','coral')
    and p_style->>'bg' in ('mist','sea','sand','coral','sky','night')
    and jsonb_typeof(p_style->'mask') = 'boolean', false);
end;
$$;
create or replace function public.valid_licenses(p_licenses jsonb)
returns boolean language plpgsql immutable set search_path = public, pg_temp as $$
declare item jsonb; org text; rank text;
begin
  if jsonb_typeof(p_licenses) <> 'array' or jsonb_array_length(p_licenses) > 5 then return false; end if;
  for item in select value from jsonb_array_elements(p_licenses) loop
    org := item->>'org'; rank := item->>'rank';
    if jsonb_typeof(item) <> 'object' or org is null or rank is null or char_length(rank) = 0 or char_length(rank) > 60 then return false; end if;
    if not ((org = 'BSAC' and rank in ('オーシャンダイバー','スポーツダイバー','ダイブリーダー','アドバンスドダイバー','ファーストクラスダイバー','インストラクター'))
      or (org = 'PADI' and rank in ('オープン・ウォーター・ダイバー','アドバンスド・オープン・ウォーター・ダイバー','レスキュー・ダイバー','マスター・スクーバ・ダイバー','ダイブマスター','インストラクター'))
      or (org = 'NAUI' and rank in ('スクーバダイバー','アドバンスドスクーバダイバー','レスキュースクーバダイバー','マスタースクーバダイバー','ダイブマスター','インストラクター'))
      or (org = 'SSI' and rank in ('オープンウォーターダイバー','アドバンスドアドベンチャラー','ストレス＆レスキュー','アドバンスドオープンウォーターダイバー','マスターダイバー','ダイブガイド','ダイブマスター','インストラクター'))
      or (org = 'その他' and char_length(rank) <= 60)) then return false; end if;
  end loop;
  return true;
end;
$$;
alter table public.profiles drop constraint if exists profiles_avatar_style_check;
alter table public.profiles add constraint profiles_avatar_style_check check (avatar_style is null or public.valid_avatar_style(avatar_style));
alter table public.profiles drop constraint if exists profiles_licenses_check;
alter table public.profiles add constraint profiles_licenses_check check (public.valid_licenses(licenses));
update public.profiles set licenses = jsonb_build_array(jsonb_build_object('org', 'その他', 'rank', license))
where licenses = '[]'::jsonb and nullif(trim(license), '') is not null;

create table if not exists public.dive_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dived_on date not null,
  prefecture text not null,
  location text not null default '' check (char_length(location) <= 40),
  service text not null default '' check (char_length(service) <= 60),
  dives integer not null default 1 check (dives between 1 and 10),
  comment text not null default '' check (char_length(comment) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (prefecture in ('北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県','海外'))
);
create index if not exists dive_logs_user_dived_idx on public.dive_logs(user_id, dived_on desc);
alter table public.dive_logs enable row level security;
drop policy if exists "dive logs own active" on public.dive_logs;
create policy "dive logs own active" on public.dive_logs for all to authenticated
  using (user_id = (select auth.uid()) and public.current_role_name() in ('pending', 'member', 'editor', 'owner'))
  with check (user_id = (select auth.uid()) and public.current_role_name() in ('pending', 'member', 'editor', 'owner'));
drop trigger if exists dive_logs_updated_at on public.dive_logs;
create trigger dive_logs_updated_at before update on public.dive_logs for each row execute function public.set_updated_at();

create or replace function public.refresh_profile_dive_totals()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare affected_user uuid;
begin
  affected_user := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
  update public.profiles set
    logged_dives = coalesce((select sum(dives) from public.dive_logs where user_id = affected_user), 0),
    last_dived_on = (select max(dived_on) from public.dive_logs where user_id = affected_user)
  where id = affected_user;
  if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id then
    update public.profiles set
      logged_dives = coalesce((select sum(dives) from public.dive_logs where user_id = old.user_id), 0),
      last_dived_on = (select max(dived_on) from public.dive_logs where user_id = old.user_id)
    where id = old.user_id;
  end if;
  return null;
end;
$$;
drop trigger if exists dive_logs_refresh_profile_totals on public.dive_logs;
create trigger dive_logs_refresh_profile_totals after insert or update or delete on public.dive_logs
for each row execute function public.refresh_profile_dive_totals();

-- Reassert column privileges: aggregate and authorization state are database-only.
revoke all on public.page_texts, public.bookmarks, public.dive_logs from anon;
revoke all on public.page_texts, public.bookmarks, public.dive_logs from authenticated;
grant select on public.page_texts to anon, authenticated;
grant insert, update on public.page_texts to authenticated;
grant select, insert, delete on public.bookmarks to authenticated;
grant select, insert, update, delete on public.dive_logs to authenticated;
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_path, avatar_style, bio, license, licenses, dive_count, favorite_areas) on public.profiles to authenticated;

-- New functions are never publicly executable. Validators need authenticated execution for CHECKs.
revoke execute on function public.reorder_docs(uuid[]), public.valid_avatar_style(jsonb), public.valid_licenses(jsonb), public.refresh_profile_dive_totals() from public, anon;
grant execute on function public.reorder_docs(uuid[]), public.valid_avatar_style(jsonb), public.valid_licenses(jsonb) to authenticated;
