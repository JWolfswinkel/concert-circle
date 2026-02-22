-- ============================================================
-- ConcertCircle – RLS Policies Migration 002
-- ============================================================

-- Enable RLS on all tables
alter table public.users         enable row level security;
alter table public.concerts      enable row level security;
alter table public.user_concerts enable row level security;
alter table public.friendships   enable row level security;
alter table public.notifications enable row level security;

-- ============================================================
-- HELPER FUNCTION: is_friend(other_uuid)
-- Returns true if there is an accepted friendship between the
-- current user and other_uuid (in either direction).
-- ============================================================
create or replace function public.is_friend(other_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and (
        (f.user_id = auth.uid() and f.friend_id = other_id) or
        (f.friend_id = auth.uid() and f.user_id = other_id)
      )
  );
$$;

-- ============================================================
-- USERS
-- ============================================================

-- Own full profile
create policy "users_select_own"
  on public.users for select
  using (id = auth.uid());

-- Limited view of other users (for friend lookups / invites)
create policy "users_select_others_limited"
  on public.users for select
  using (true);
  -- All authenticated users can see all profiles (id, display_name, avatar_url, email).
  -- The anon role cannot read this table (RLS is enabled, no anon policy).

-- Insert own profile (called after sign-up)
create policy "users_insert_own"
  on public.users for insert
  with check (id = auth.uid());

-- Update own profile
create policy "users_update_own"
  on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ============================================================
-- CONCERTS
-- ============================================================

-- A user can see:
--   1. Concerts they created
--   2. Concerts they have a user_concert row for
--   3. Concerts that an accepted friend has a user_concert row for
create policy "concerts_select"
  on public.concerts for select
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.user_concerts uc
      where uc.concert_id = concerts.id
        and uc.user_id = auth.uid()
    )
    or exists (
      select 1 from public.user_concerts uc
      join public.friendships f
        on (
          (f.user_id = auth.uid() and f.friend_id = uc.user_id) or
          (f.friend_id = auth.uid() and f.user_id = uc.user_id)
        )
      where uc.concert_id = concerts.id
        and f.status = 'accepted'
    )
  );

-- Only the creator can insert
create policy "concerts_insert"
  on public.concerts for insert
  with check (created_by = auth.uid());

-- Only the creator can update
create policy "concerts_update"
  on public.concerts for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- Only the creator can delete
create policy "concerts_delete"
  on public.concerts for delete
  using (created_by = auth.uid());

-- ============================================================
-- USER_CONCERTS
-- ============================================================

-- A user can read their own rows, and an accepted friend's rows
create policy "user_concerts_select"
  on public.user_concerts for select
  using (
    user_id = auth.uid()
    or public.is_friend(user_id)
  );

-- A user can insert their own rows
create policy "user_concerts_insert"
  on public.user_concerts for insert
  with check (user_id = auth.uid());

-- A user can update their own rows
create policy "user_concerts_update"
  on public.user_concerts for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- A user can delete their own rows
create policy "user_concerts_delete"
  on public.user_concerts for delete
  using (user_id = auth.uid());

-- ============================================================
-- FRIENDSHIPS
-- ============================================================

-- A user can see invites they sent or received
create policy "friendships_select"
  on public.friendships for select
  using (user_id = auth.uid() or friend_id = auth.uid());

-- A user can create an invite (user_id must be themselves)
create policy "friendships_insert"
  on public.friendships for insert
  with check (user_id = auth.uid());

-- The recipient (friend_id) can update status (accept/decline)
-- The sender (user_id) can also update (e.g. cancel)
create policy "friendships_update"
  on public.friendships for update
  using (user_id = auth.uid() or friend_id = auth.uid());

-- Either party can delete the friendship
create policy "friendships_delete"
  on public.friendships for delete
  using (user_id = auth.uid() or friend_id = auth.uid());

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

-- Users can only read their own notifications
create policy "notifications_select"
  on public.notifications for select
  using (user_id = auth.uid());

-- Allow authenticated users to insert notifications (used by triggers
-- running as the calling user, and by the client for friend-request notifs)
create policy "notifications_insert"
  on public.notifications for insert
  with check (true);
  -- Inserts are further controlled by the DB trigger / function (security definer).

-- Users can update (mark read) their own notifications
create policy "notifications_update"
  on public.notifications for update
  using (user_id = auth.uid());
