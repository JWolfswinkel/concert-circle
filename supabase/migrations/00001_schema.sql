-- ============================================================
-- ConcertCircle – Schema Migration 001
-- Run this in the Supabase SQL editor (or via supabase db push)
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------
-- TABLE: public.users
-- Mirrors auth.users with public-facing profile fields
-- ----------------------------------------------------------
create table if not exists public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  display_name text,
  email       text,
  avatar_url  text
);

comment on table public.users is 'Public profile data for each authenticated user.';

-- ----------------------------------------------------------
-- TABLE: public.concerts
-- ----------------------------------------------------------
create table if not exists public.concerts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  artist      text not null,
  location    text not null,
  date        date not null,
  ticket_url  text,
  source_url  text,
  created_by  uuid not null references public.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

comment on table public.concerts is 'Concert events created by users.';

-- ----------------------------------------------------------
-- TABLE: public.user_concerts
-- Tracks each user's intention for a concert
-- ----------------------------------------------------------
create table if not exists public.user_concerts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  concert_id  uuid not null references public.concerts (id) on delete cascade,
  status      text not null check (status in ('going', 'interested')),
  created_at  timestamptz not null default now(),
  unique (user_id, concert_id)
);

comment on table public.user_concerts is 'User intention (going/interested) per concert.';

-- ----------------------------------------------------------
-- TABLE: public.friendships
-- status: pending → accepted / declined
-- user_id initiated the request; friend_id received it
-- ----------------------------------------------------------
create table if not exists public.friendships (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  friend_id   uuid not null references public.users (id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at  timestamptz not null default now(),
  unique (user_id, friend_id),
  -- Prevent self-friendship
  constraint no_self_friendship check (user_id <> friend_id)
);

comment on table public.friendships is 'Friend link requests between users.';

-- ----------------------------------------------------------
-- TABLE: public.notifications
-- ----------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  type        text not null,
  payload     jsonb not null default '{}',
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

comment on table public.notifications is 'In-app notifications for each user.';

-- Indexes for common query patterns
create index if not exists concerts_created_by_idx       on public.concerts (created_by);
create index if not exists concerts_date_idx             on public.concerts (date);
create index if not exists user_concerts_user_id_idx     on public.user_concerts (user_id);
create index if not exists user_concerts_concert_id_idx  on public.user_concerts (concert_id);
create index if not exists friendships_user_id_idx       on public.friendships (user_id);
create index if not exists friendships_friend_id_idx     on public.friendships (friend_id);
create index if not exists notifications_user_id_idx     on public.notifications (user_id);
create index if not exists notifications_is_read_idx     on public.notifications (user_id, is_read);
