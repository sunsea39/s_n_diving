-- N×S_Diving v2.0.1 security fix. Safe to run again.
--
-- Bug: for callers without a profile (not logged in), current_role_name() is NULL, so is_owner()
-- returned NULL instead of false. In PL/pgSQL, `if not public.is_owner() then raise` does nothing
-- when the condition is NULL, which let anonymous callers run owner-only RPCs
-- (set_member_role, admin_set_password, list_members, set_disclaimer).
-- Fix: the role checks never return NULL, owner RPCs check with coalesce as a second guard,
-- and anon loses EXECUTE on every privileged function.

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
  if auth.uid() is null or not coalesce(public.is_owner(), false) then raise exception 'メインの管理者権限が必要です。'; end if;
  if p_user is null or p_user = auth.uid() then raise exception '自分自身の権限は変更できません。'; end if;
  if p_role is null or p_role not in ('pending', 'member', 'editor', 'owner', 'suspended') then raise exception '無効な権限です。'; end if;
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
  if auth.uid() is null or not coalesce(public.is_owner(), false) then raise exception 'メインの管理者権限が必要です。'; end if;
  if p_user is null or p_user = auth.uid() then raise exception '自分自身のパスワードはここでは変更できません。'; end if;
  if p_password is null or char_length(p_password) < 8 then raise exception 'パスワードは8文字以上で入力してください。'; end if;
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() where id = p_user;
  if not found then raise exception 'メンバーが見つかりません。'; end if;
end;
$$;

-- Also fixes: auth.users.email is varchar(255), which did not match the declared text column.
create or replace function public.list_members()
returns table (id uuid, email text, role text, display_name text, avatar_path text, created_at timestamptz, approved_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or not coalesce(public.is_owner(), false) then raise exception 'メインの管理者権限が必要です。'; end if;
  return query select p.id, u.email::text, p.role, p.display_name, p.avatar_path, p.created_at, p.approved_at, u.last_sign_in_at
    from public.profiles p join auth.users u on u.id = p.id order by p.created_at desc;
end;
$$;

create or replace function public.set_disclaimer(p_disclaimer text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or not coalesce(public.is_owner(), false) then raise exception '管理者権限が必要です。'; end if;
  update public.settings set disclaimer = coalesce(p_disclaimer, '') where id = 1;
end;
$$;

create or replace function public.passcode_is_set()
returns boolean language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or not coalesce(public.is_owner(), false) then raise exception '管理者権限が必要です。'; end if;
  return exists (select 1 from public.settings where id = 1 and passcode_hash is not null);
end;
$$;

-- Supabase grants EXECUTE on new functions to anon by default; take it back for everything privileged.
revoke execute on function
  public.set_member_role(uuid, text),
  public.admin_set_password(uuid, text),
  public.list_members(),
  public.set_disclaimer(text),
  public.set_passcode(text),
  public.passcode_is_set(),
  public.join_board(text),
  public.handle_new_user_profile()
from public, anon;
revoke execute on function public.join_board(text), public.set_passcode(text), public.handle_new_user_profile() from authenticated;
grant execute on function
  public.set_member_role(uuid, text),
  public.admin_set_password(uuid, text),
  public.list_members(),
  public.set_disclaimer(text),
  public.passcode_is_set()
to authenticated;
