-- N S_Diving v2.4. Additive and safe to run again after v2.3.
-- Push delivery configuration is deliberately read from Vault at runtime; no secret is stored here.

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- v2.4 stores the headband shape. The previous bandana shape remains valid so legacy
-- profiles can be read and are normalized to headbands by the client.
create or replace function public.valid_avatar_style(p_style jsonb)
returns boolean language plpgsql immutable set search_path = public, pg_temp as $$
declare
  has_legacy_mask boolean;
  has_accessory boolean;
begin
  has_legacy_mask := p_style ? 'mask';
  has_accessory := p_style ? 'accessory';
  return coalesce(
    jsonb_typeof(p_style) = 'object'
    and p_style ?& array['skin','hair','hairColor','face','suit','bg']
    and not exists (
      select 1 from jsonb_object_keys(p_style) as key
      where key not in ('skin','hair','hairColor','face','suit','bg','mask','accessory','headbandColor','bandanaColor')
    )
    and p_style->>'skin' in ('light','fair','tan','brown','deep')
    and p_style->>'hair' in ('buzz','short','bob','long','pony','bun')
    and p_style->>'hairColor' in ('black','brown','light','blond','gray','teal')
    and p_style->>'face' in ('smile','calm','wink','cool')
    and p_style->>'suit' in ('navy','black','teal','coral')
    and p_style->>'bg' in ('mist','sea','sand','coral','sky','night')
    and (not (p_style ? 'headbandColor') or p_style->>'headbandColor' in ('brown','red','navy','teal','yellow','pink','black','white'))
    and (not (p_style ? 'bandanaColor') or p_style->>'bandanaColor' in ('brown','red','navy','teal','yellow','pink','black','white'))
    and (
      (has_legacy_mask and not has_accessory and jsonb_typeof(p_style->'mask') = 'boolean')
      or (
        has_accessory
        and p_style->>'accessory' in ('none','mask','headband','bandana')
        and (not has_legacy_mask or jsonb_typeof(p_style->'mask') = 'boolean')
        and (
          p_style->>'accessory' not in ('headband','bandana')
          or coalesce(p_style->>'headbandColor', p_style->>'bandanaColor') in ('brown','red','navy','teal','yellow','pink','black','white')
        )
      )
    ), false);
end;
$$;

alter table public.news add column if not exists notified_at timestamptz;
alter table public.accidents add column if not exists notified_at timestamptz;
alter table public.profiles add column if not exists notifications_seen_at timestamptz not null default now();

-- Existing published content predates notifications and must never be delivered as new.
update public.news set notified_at = now() where published_at is not null and published_at <= now() and notified_at is null;
update public.accidents set notified_at = now() where status = 'published' and notified_at is null;

create table if not exists public.notification_events (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('news', 'accident')),
  ref_id uuid not null,
  audience text not null check (audience in ('members')),
  title text not null check (char_length(title) <= 100),
  body text not null default '' check (char_length(body) <= 80),
  url text not null,
  created_at timestamptz not null default now(),
  unique (kind, ref_id)
);
create index if not exists notification_events_created_at_idx on public.notification_events (created_at desc);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  created_at timestamptz not null default now(),
  last_success_at timestamptz
);
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.notification_events enable row level security;
alter table public.push_subscriptions enable row level security;
drop policy if exists "notification events members read" on public.notification_events;
create policy "notification events members read" on public.notification_events
  for select to authenticated using (coalesce(public.is_member(), false));
drop policy if exists "push subscriptions own member" on public.push_subscriptions;
create policy "push subscriptions own member" on public.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid()) and coalesce(public.is_member(), false))
  with check (user_id = (select auth.uid()) and coalesce(public.is_member(), false));

-- This function is invoked by content triggers and the five-minute cron job only.
create or replace function public.emit_due_notifications()
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  item record;
begin
  for item in
    select 'news'::text as kind, n.id as ref_id, n.title, n.body,
      '/news/' || n.id::text as url
    from public.news n
    where n.category in ('dive', 'other')
      and n.published_at is not null and n.published_at <= now() and n.notified_at is null
    union all
    select 'accident'::text as kind, a.id as ref_id, a.title, a.summary as body,
      '/accidents/' || a.slug as url
    from public.accidents a
    where a.status = 'published' and a.notified_at is null
  loop
    insert into public.notification_events(kind, ref_id, audience, title, body, url)
    values (item.kind, item.ref_id, 'members', left(item.title, 100), left(coalesce(item.body, ''), 80), item.url)
    on conflict (kind, ref_id) do nothing;
    if item.kind = 'news' then
      update public.news set notified_at = now() where id = item.ref_id and notified_at is null;
    else
      update public.accidents set notified_at = now() where id = item.ref_id and notified_at is null;
    end if;
  end loop;
end;
$$;

create or replace function public.queue_push_for_notification_event()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  function_url text;
  webhook_secret text;
begin
  select decrypted_secret into function_url
  from vault.decrypted_secrets where name = 'ns_push_function_url' limit 1;
  select decrypted_secret into webhook_secret
  from vault.decrypted_secrets where name = 'ns_push_webhook_secret' limit 1;
  if nullif(function_url, '') is null or nullif(webhook_secret, '') is null then
    return new;
  end if;
  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', webhook_secret),
    body := jsonb_build_object('event_id', new.id)
  );
  return new;
end;
$$;

create or replace function public.emit_notifications_after_news_change()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.emit_due_notifications();
  return new;
end;
$$;

create or replace function public.emit_notifications_after_accident_change()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.emit_due_notifications();
  return new;
end;
$$;

drop trigger if exists notification_events_queue_push on public.notification_events;
create trigger notification_events_queue_push
after insert on public.notification_events
for each row execute function public.queue_push_for_notification_event();
drop trigger if exists news_emit_notifications on public.news;
create trigger news_emit_notifications
after insert or update of published_at, category on public.news
for each row execute function public.emit_notifications_after_news_change();
drop trigger if exists accidents_emit_notifications on public.accidents;
create trigger accidents_emit_notifications
after insert or update of status on public.accidents
for each row execute function public.emit_notifications_after_accident_change();

do $cron$
begin
  if not exists (select 1 from cron.job where jobname = 'ns-emit-notifications') then
    perform cron.schedule('ns-emit-notifications', '*/5 * * * *', 'select public.emit_due_notifications()');
  end if;
end;
$cron$;

revoke all on public.notification_events, public.push_subscriptions from anon, authenticated;
grant select on public.notification_events to authenticated;
grant select, insert, delete on public.push_subscriptions to authenticated;
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_path, avatar_style, bio, license, licenses, dive_count, favorite_areas, notifications_seen_at) on public.profiles to authenticated;

-- CHECK validators need authenticated execution; delivery helpers are not a client API.
revoke execute on function
  public.valid_avatar_style(jsonb),
  public.emit_due_notifications(),
  public.queue_push_for_notification_event(),
  public.emit_notifications_after_news_change(),
  public.emit_notifications_after_accident_change()
from public, anon;
revoke execute on function
  public.emit_due_notifications(),
  public.queue_push_for_notification_event(),
  public.emit_notifications_after_news_change(),
  public.emit_notifications_after_accident_change()
from authenticated;
grant execute on function public.valid_avatar_style(jsonb) to authenticated;
