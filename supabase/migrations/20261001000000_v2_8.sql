-- N×S_Diving v2.8. Additive and safe to run again after v2.4.
-- Home-featured documents are limited transactionally so concurrent editor updates
-- cannot exceed the four-document limit.

alter table public.docs add column if not exists home_featured boolean;
update public.docs set home_featured = false where home_featured is null;
alter table public.docs alter column home_featured set default false;
alter table public.docs alter column home_featured set not null;

create or replace function public.limit_home_featured_docs()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not new.home_featured then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('docs_home_featured', 0));
  if (
    select count(*)
    from public.docs
    where home_featured and id is distinct from new.id
  ) >= 4 then
    raise exception 'ホームに表示できる資料は4件までです';
  end if;
  return new;
end;
$$;

drop trigger if exists docs_limit_home_featured on public.docs;
create trigger docs_limit_home_featured
before insert or update on public.docs
for each row execute function public.limit_home_featured_docs();

-- Trigger functions are never a client API.
revoke execute on function public.limit_home_featured_docs() from public, anon;
