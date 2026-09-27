-- N×S_Diving v2.9. Additive and safe to run again after v2.8.
-- Read state is deliberately per-content, rather than a mutable global timestamp.

create table if not exists public.content_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('news', 'accident', 'accident_batch')),
  ref_id uuid not null,
  read_at timestamptz not null default now(),
  primary key (user_id, kind, ref_id)
);
create index if not exists content_reads_user_read_at_idx
  on public.content_reads (user_id, read_at desc);

alter table public.content_reads enable row level security;
drop policy if exists "content reads own active select" on public.content_reads;
drop policy if exists "content reads own active insert" on public.content_reads;
drop policy if exists "content reads own active delete" on public.content_reads;
create policy "content reads own active select" on public.content_reads
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and public.current_role_name() in ('pending', 'member', 'editor', 'owner')
  );
create policy "content reads own active insert" on public.content_reads
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.current_role_name() in ('pending', 'member', 'editor', 'owner')
  );
create policy "content reads own active delete" on public.content_reads
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    and public.current_role_name() in ('pending', 'member', 'editor', 'owner')
  );

-- A batch is one notification about several newly published accidents.
alter table public.notification_events drop constraint if exists notification_events_kind_check;
alter table public.notification_events add constraint notification_events_kind_check
  check (kind in ('news', 'accident', 'accident_batch'));

create or replace function public.set_accidents_status(p_ids uuid[], p_status text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  target_count integer;
  publish_count integer;
  batch_titles text;
begin
  if auth.uid() is null or not coalesce(public.is_owner(), false) then
    raise exception 'メインの管理者権限が必要です。';
  end if;
  if p_status is null or p_status not in ('published', 'draft') then
    raise exception '無効な公開状態です。';
  end if;
  if p_ids is null or cardinality(p_ids) = 0 then
    raise exception '事故事例を選択してください。';
  end if;
  if cardinality(p_ids) <> cardinality(array(select distinct unnest(p_ids))) then
    raise exception '事故事例IDが重複しています。';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('accidents_bulk_status', 0));
  select count(*) into target_count from public.accidents where id = any(p_ids);
  if target_count <> cardinality(p_ids) then
    raise exception '事故事例が見つかりません。';
  end if;

  select count(*) into publish_count
  from public.accidents
  where id = any(p_ids) and status is distinct from 'published';

  if p_status = 'published' and publish_count >= 2 then
    -- Set this before changing status so the v2.4 after-update trigger cannot
    -- emit individual accident events for the batch.
    update public.accidents
    set notified_at = now()
    where id = any(p_ids) and status is distinct from 'published';

    select left(string_agg(title, '、' order by occurred_on desc nulls last, title), 80)
    into batch_titles
    from (
      select title, occurred_on
      from public.accidents
      where id = any(p_ids) and status is distinct from 'published'
      order by occurred_on desc nulls last, title
      limit 3
    ) as latest;

    update public.accidents set status = 'published'
    where id = any(p_ids) and status is distinct from 'published';

    insert into public.notification_events(kind, ref_id, audience, title, body, url)
    values (
      'accident_batch',
      gen_random_uuid(),
      'members',
      format('事故事例を %s 件追加しました', publish_count),
      left(coalesce(batch_titles, ''), 80),
      '/accidents'
    );
  else
    -- A one-row publication intentionally keeps the v2.4 per-item trigger.
    update public.accidents set status = p_status
    where id = any(p_ids) and status is distinct from p_status;
  end if;
end;
$$;

-- The picker permits the original equipment art, no image, and the five v2.9 images.
alter table public.docs drop constraint if exists docs_icon_check;
alter table public.docs add constraint docs_icon_check check (
  icon is null or icon in (
    '', 'regulator', 'hose', 'bcd', 'computer', 'mask', 'fin', 'wetsuit', 'tank',
    'note', 'first-aid', 'camera', 'caution', 'fish'
  )
);

revoke all on public.content_reads from anon, authenticated;
grant select, insert, delete on public.content_reads to authenticated;

-- New client RPCs are never executable through PUBLIC or anon.
revoke execute on function public.set_accidents_status(uuid[], text) from public, anon;
grant execute on function public.set_accidents_status(uuid[], text) to authenticated;
