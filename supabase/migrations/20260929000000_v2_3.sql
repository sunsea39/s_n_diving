-- N×S_Diving v2.3. Additive and safe to run again after v2.2.
-- Avatar styles accept the v2.3 accessory fields and the legacy mask boolean.

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
      where key not in ('skin','hair','hairColor','face','suit','bg','mask','accessory','bandanaColor')
    )
    and p_style->>'skin' in ('light','fair','tan','brown','deep')
    and p_style->>'hair' in ('buzz','short','bob','long','pony','bun')
    and p_style->>'hairColor' in ('black','brown','light','blond','gray','teal')
    and p_style->>'face' in ('smile','calm','wink','cool')
    and p_style->>'suit' in ('navy','black','teal','coral')
    and p_style->>'bg' in ('mist','sea','sand','coral','sky','night')
    and (
      not (p_style ? 'bandanaColor')
      or p_style->>'bandanaColor' in ('red','navy','teal','yellow','pink','black','white')
    )
    and (
      (has_legacy_mask and not has_accessory and jsonb_typeof(p_style->'mask') = 'boolean')
      or (
        has_accessory
        and p_style->>'accessory' in ('none','mask','bandana')
        and (not has_legacy_mask or jsonb_typeof(p_style->'mask') = 'boolean')
        and (
          p_style->>'accessory' <> 'bandana'
          or p_style->>'bandanaColor' in ('red','navy','teal','yellow','pink','black','white')
        )
      )
    ), false);
end;
$$;

-- Public other news remains visible after publication. Dive news is restricted to
-- approved members, while editors and owners may also read drafts.
drop policy if exists "news published read" on public.news;
drop policy if exists "news public and member read" on public.news;
create policy "news public and member read" on public.news for select to anon, authenticated
  using (
    (category = 'other' and published_at is not null and published_at <= now())
    or (category = 'dive' and coalesce(public.is_member(), false))
    or coalesce(public.is_editor(), false)
  );

-- Validators are used by a CHECK constraint, and must not be executable by the public.
revoke execute on function public.valid_avatar_style(jsonb) from public, anon;
grant execute on function public.valid_avatar_style(jsonb) to authenticated;
