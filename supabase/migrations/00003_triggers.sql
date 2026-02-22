-- ============================================================
-- ConcertCircle – Triggers & Functions Migration 003
-- ============================================================

-- ============================================================
-- 1. Auto-create public.users row on auth.users insert
--    (runs when a user signs up via any provider)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email        = excluded.email,
    display_name = coalesce(excluded.display_name, public.users.display_name),
    avatar_url   = coalesce(excluded.avatar_url, public.users.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. Notify matched friends when a user_concert row is inserted
--    or updated.
--
--    For every accepted friend who also has a user_concert for
--    the same concert, create a notification for BOTH sides:
--    - Notify the existing friend that you've marked the concert
--    - Notify you that the friend is already going/interested
-- ============================================================
create or replace function public.notify_concert_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  friend_row record;
  concert_row record;
begin
  -- Fetch concert details once
  select title, artist into concert_row
  from public.concerts
  where id = new.concert_id;

  -- Find accepted friends who also have this concert marked
  for friend_row in
    select uc.user_id as friend_user_id, uc.status as friend_status
    from public.user_concerts uc
    join public.friendships f on (
      (f.user_id = new.user_id and f.friend_id = uc.user_id) or
      (f.friend_id = new.user_id and f.user_id = uc.user_id)
    )
    where uc.concert_id = new.concert_id
      and uc.user_id <> new.user_id
      and f.status = 'accepted'
  loop
    -- Notify the matched friend about the current user's new status
    insert into public.notifications (user_id, type, payload)
    values (
      friend_row.friend_user_id,
      'concert_match',
      jsonb_build_object(
        'concert_id',    new.concert_id,
        'concert_title', concert_row.title,
        'concert_artist',concert_row.artist,
        'actor_id',      new.user_id,
        'actor_status',  new.status
      )
    )
    on conflict do nothing;

    -- Notify the current user about the existing friend
    insert into public.notifications (user_id, type, payload)
    values (
      new.user_id,
      'concert_match',
      jsonb_build_object(
        'concert_id',    new.concert_id,
        'concert_title', concert_row.title,
        'concert_artist',concert_row.artist,
        'actor_id',      friend_row.friend_user_id,
        'actor_status',  friend_row.friend_status
      )
    )
    on conflict do nothing;
  end loop;

  return new;
end;
$$;

drop trigger if exists on_user_concert_insert on public.user_concerts;
create trigger on_user_concert_insert
  after insert on public.user_concerts
  for each row execute function public.notify_concert_match();

drop trigger if exists on_user_concert_update on public.user_concerts;
create trigger on_user_concert_update
  after update of status on public.user_concerts
  for each row execute function public.notify_concert_match();

-- ============================================================
-- 3. Create a notification for the friend_id when a friendship
--    request is inserted (pending status)
-- ============================================================
create or replace function public.notify_friend_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
begin
  if new.status = 'pending' then
    select display_name into sender_name
    from public.users
    where id = new.user_id;

    insert into public.notifications (user_id, type, payload)
    values (
      new.friend_id,
      'friend_request',
      jsonb_build_object(
        'friendship_id', new.id,
        'from_user_id',  new.user_id,
        'from_name',     sender_name
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_friendship_insert on public.friendships;
create trigger on_friendship_insert
  after insert on public.friendships
  for each row execute function public.notify_friend_request();

-- ============================================================
-- 4. Notify the sender when their friend request is accepted
-- ============================================================
create or replace function public.notify_friend_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  acceptor_name text;
begin
  if new.status = 'accepted' and old.status = 'pending' then
    select display_name into acceptor_name
    from public.users
    where id = new.friend_id;

    insert into public.notifications (user_id, type, payload)
    values (
      new.user_id,
      'friend_accepted',
      jsonb_build_object(
        'friendship_id',   new.id,
        'from_user_id',    new.friend_id,
        'from_name',       acceptor_name
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_friendship_accepted on public.friendships;
create trigger on_friendship_accepted
  after update of status on public.friendships
  for each row execute function public.notify_friend_accepted();
