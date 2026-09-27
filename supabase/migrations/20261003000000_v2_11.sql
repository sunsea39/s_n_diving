-- N×S_Diving v2.11. License catalog management. Additive and safe to run again after v2.9.

create table if not exists public.license_orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 30),
  sort_order integer not null default 0,
  allow_free_text boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.license_ranks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.license_orgs(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, name)
);

-- Keep these rows aligned with src/content/licenses.ts. The explicit order is also
-- the first-run order shown by the profile picker.
insert into public.license_orgs (name, sort_order, allow_free_text) values
  ('BSAC', 10, false),
  ('PADI', 20, false),
  ('NAUI', 30, false),
  ('SSI', 40, false),
  ('その他', 50, true)
on conflict (name) do nothing;

insert into public.license_ranks (org_id, name, sort_order)
select org.id, seed.name, seed.sort_order
from (
  values
    ('BSAC', 'オーシャンダイバー', 10),
    ('BSAC', 'スポーツダイバー', 20),
    ('BSAC', 'ダイブリーダー', 30),
    ('BSAC', 'アドバンスドダイバー', 40),
    ('BSAC', 'ファーストクラスダイバー', 50),
    ('BSAC', 'インストラクター', 60),
    ('PADI', 'オープン・ウォーター・ダイバー', 10),
    ('PADI', 'アドバンスド・オープン・ウォーター・ダイバー', 20),
    ('PADI', 'レスキュー・ダイバー', 30),
    ('PADI', 'マスター・スクーバ・ダイバー', 40),
    ('PADI', 'ダイブマスター', 50),
    ('PADI', 'インストラクター', 60),
    ('NAUI', 'スクーバダイバー', 10),
    ('NAUI', 'アドバンスドスクーバダイバー', 20),
    ('NAUI', 'レスキュースクーバダイバー', 30),
    ('NAUI', 'マスタースクーバダイバー', 40),
    ('NAUI', 'ダイブマスター', 50),
    ('NAUI', 'インストラクター', 60),
    ('SSI', 'オープンウォーターダイバー', 10),
    ('SSI', 'アドバンスドアドベンチャラー', 20),
    ('SSI', 'ストレス＆レスキュー', 30),
    ('SSI', 'アドバンスドオープンウォーターダイバー', 40),
    ('SSI', 'マスターダイバー', 50),
    ('SSI', 'ダイブガイド', 60),
    ('SSI', 'ダイブマスター', 70),
    ('SSI', 'インストラクター', 80)
) as seed(org_name, name, sort_order)
join public.license_orgs org on org.name = seed.org_name
on conflict (org_id, name) do nothing;

drop trigger if exists license_orgs_updated_at on public.license_orgs;
create trigger license_orgs_updated_at before update on public.license_orgs
for each row execute function public.set_updated_at();
drop trigger if exists license_ranks_updated_at on public.license_ranks;
create trigger license_ranks_updated_at before update on public.license_ranks
for each row execute function public.set_updated_at();

alter table public.license_orgs enable row level security;
alter table public.license_ranks enable row level security;
drop policy if exists "license orgs public read" on public.license_orgs;
drop policy if exists "license orgs owner write" on public.license_orgs;
create policy "license orgs public read" on public.license_orgs
  for select to anon, authenticated using (true);
create policy "license orgs owner write" on public.license_orgs
  for all to authenticated
  using (coalesce(public.is_owner(), false))
  with check (coalesce(public.is_owner(), false));
drop policy if exists "license ranks public read" on public.license_ranks;
drop policy if exists "license ranks owner write" on public.license_ranks;
create policy "license ranks public read" on public.license_ranks
  for select to anon, authenticated using (true);
create policy "license ranks owner write" on public.license_ranks
  for all to authenticated
  using (coalesce(public.is_owner(), false))
  with check (coalesce(public.is_owner(), false));

-- Catalog lookup is deliberately only applied to rows newly added by this write,
-- so an owner may retire catalog entries without breaking old profiles.
create or replace function public.validate_profile_licenses()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  item jsonb;
  item_org text;
  item_rank text;
  catalog_org public.license_orgs%rowtype;
begin
  -- rename_license_org / rename_license_rank rewrite entries users already hold (possibly ranks that
  -- were later removed from the catalog); they set this transaction-local flag so those rewrites pass.
  if current_setting('ns.license_rename', true) = 'on' then
    return new;
  end if;
  if jsonb_typeof(new.licenses) <> 'array' or jsonb_array_length(new.licenses) > 5 then
    raise exception '選べないライセンスが含まれています';
  end if;

  for item in select value from jsonb_array_elements(new.licenses) loop
    item_org := item ->> 'org';
    item_rank := item ->> 'rank';
    if jsonb_typeof(item) <> 'object'
      or item_org is null or item_rank is null
      or char_length(item_rank) not between 1 and 60
      or exists (select 1 from jsonb_object_keys(item) as key where key not in ('org', 'rank')) then
      raise exception '選べないライセンスが含まれています（団体：%、ランク：%）',
        coalesce(item_org, ''), coalesce(item_rank, '');
    end if;

    if tg_op = 'UPDATE' and exists (
      select 1 from jsonb_array_elements(old.licenses) as old_item(value)
      where old_item.value ->> 'org' = item_org and old_item.value ->> 'rank' = item_rank
    ) then
      continue;
    end if;

    select * into catalog_org from public.license_orgs where name = item_org;
    if not found or (
      catalog_org.allow_free_text = false
      and not exists (
        select 1 from public.license_ranks rank
        where rank.org_id = catalog_org.id and rank.name = item_rank
      )
    ) then
      raise exception '選べないライセンスが含まれています（団体：%、ランク：%）', item_org, item_rank;
    end if;
  end loop;
  return new;
end;
$$;

alter table public.profiles drop constraint if exists profiles_licenses_check;
drop trigger if exists profiles_validate_licenses on public.profiles;
create trigger profiles_validate_licenses
before insert or update on public.profiles
for each row execute function public.validate_profile_licenses();

create or replace function public.rename_license_org(p_org_id uuid, p_name text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  old_name text;
  new_name text := trim(p_name);
begin
  if auth.uid() is null or not coalesce(public.is_owner(), false) then
    raise exception 'メインの管理者権限が必要です。';
  end if;
  if p_org_id is null or char_length(new_name) not between 1 and 30 then
    raise exception '団体名は1〜30文字で入力してください。';
  end if;
  select name into old_name from public.license_orgs where id = p_org_id for update;
  if old_name is null then raise exception '団体が見つかりません。'; end if;
  if exists (select 1 from public.license_orgs where name = new_name and id <> p_org_id) then
    raise exception '同じ団体名がすでにあります。';
  end if;
  update public.license_orgs set name = new_name where id = p_org_id;
  perform set_config('ns.license_rename', 'on', true);
  update public.profiles p
  set licenses = (
    select coalesce(jsonb_agg(
      case when item.value ->> 'org' = old_name
        then jsonb_set(item.value, '{org}', to_jsonb(new_name))
        else item.value end
      order by item.position
    ), '[]'::jsonb)
    from jsonb_array_elements(p.licenses) with ordinality as item(value, position)
  )
  where p.licenses @> jsonb_build_array(jsonb_build_object('org', old_name));
  perform set_config('ns.license_rename', 'off', true);
end;
$$;

create or replace function public.rename_license_rank(p_rank_id uuid, p_name text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  old_name text;
  org_name text;
  org_uuid uuid;
  new_name text := trim(p_name);
begin
  if auth.uid() is null or not coalesce(public.is_owner(), false) then
    raise exception 'メインの管理者権限が必要です。';
  end if;
  if p_rank_id is null or char_length(new_name) not between 1 and 60 then
    raise exception 'ランク名は1〜60文字で入力してください。';
  end if;
  select rank.name, rank.org_id, org.name into old_name, org_uuid, org_name
  from public.license_ranks rank join public.license_orgs org on org.id = rank.org_id
  where rank.id = p_rank_id for update;
  if old_name is null then raise exception 'ランクが見つかりません。'; end if;
  if exists (select 1 from public.license_ranks where org_id = org_uuid and name = new_name and id <> p_rank_id) then
    raise exception '同じランク名がすでにあります。';
  end if;
  update public.license_ranks set name = new_name where id = p_rank_id;
  perform set_config('ns.license_rename', 'on', true);
  update public.profiles p
  set licenses = (
    select coalesce(jsonb_agg(
      case when item.value ->> 'org' = org_name and item.value ->> 'rank' = old_name
        then jsonb_set(item.value, '{rank}', to_jsonb(new_name))
        else item.value end
      order by item.position
    ), '[]'::jsonb)
    from jsonb_array_elements(p.licenses) with ordinality as item(value, position)
  )
  where p.licenses @> jsonb_build_array(jsonb_build_object('org', org_name, 'rank', old_name));
  perform set_config('ns.license_rename', 'off', true);
end;
$$;

create or replace function public.license_usage()
returns table (org text, rank text, count bigint)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or not coalesce(public.is_owner(), false) then
    raise exception 'メインの管理者権限が必要です。';
  end if;
  return query
  select item.value ->> 'org', null::text, count(distinct p.id)
  from public.profiles p cross join lateral jsonb_array_elements(p.licenses) as item(value)
  group by item.value ->> 'org'
  union all
  select item.value ->> 'org', item.value ->> 'rank', count(distinct p.id)
  from public.profiles p cross join lateral jsonb_array_elements(p.licenses) as item(value)
  group by item.value ->> 'org', item.value ->> 'rank';
end;
$$;

revoke all on public.license_orgs, public.license_ranks from anon, authenticated;
grant select on public.license_orgs, public.license_ranks to anon, authenticated;
grant insert, update, delete on public.license_orgs, public.license_ranks to authenticated;

-- RPCs are client APIs for authenticated owners only; trigger code is never callable.
revoke execute on function
  public.validate_profile_licenses(),
  public.rename_license_org(uuid, text),
  public.rename_license_rank(uuid, text),
  public.license_usage()
from public, anon;
revoke execute on function public.validate_profile_licenses() from authenticated;
grant execute on function
  public.rename_license_org(uuid, text),
  public.rename_license_rank(uuid, text),
  public.license_usage()
to authenticated;
