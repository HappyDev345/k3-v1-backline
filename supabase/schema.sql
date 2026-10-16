-- ============================================================
-- BACKLINE database schema + Row Level Security
-- Run this once in: Supabase Dashboard -> SQL Editor -> New query
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- profiles ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique,
  display_name text not null default '',
  role_title   text not null default '',
  location     text not null default '',
  bio          text not null default '',
  skills       text[] not null default '{}',
  avatar_url   text not null default '',
  created_at   timestamptz not null default now()
);

-- ---------- projects ----------
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  creator_id   uuid not null references public.profiles(id) on delete cascade,
  title        text not null,
  description  text not null default '',
  type         text not null default 'Other'
               check (type in ('Live Event', 'Film', 'Music', 'Photography', 'Other')),
  location     text not null default '',
  event_date   date,
  compensation text not null default 'Paid',
  spots        int not null default 1 check (spots >= 1),
  roles        text[] not null default '{}',
  tags         text[] not null default '{}',
  created_at   timestamptz not null default now()
);

-- ---------- project_members (future: accepted crew) ----------
create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default '',
  primary key (project_id, user_id)
);

create table if not exists public.saved_projects (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

-- ---------- posts (feed + forum threads; forum threads have a category) ----------
create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title      text,
  body       text not null,
  category   text,
  media_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.likes (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

-- ---------- messaging ----------
create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null,
  created_at      timestamptz not null default now()
);

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  actor_id   uuid references public.profiles(id) on delete cascade,
  type       text not null check (type in ('like', 'comment', 'follow', 'message')),
  ref_id     text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles              enable row level security;
alter table public.projects              enable row level security;
alter table public.project_members       enable row level security;
alter table public.saved_projects        enable row level security;
alter table public.posts                 enable row level security;
alter table public.comments              enable row level security;
alter table public.likes                 enable row level security;
alter table public.follows               enable row level security;
alter table public.conversations         enable row level security;
alter table public.conversation_members  enable row level security;
alter table public.messages              enable row level security;
alter table public.notifications         enable row level security;

-- profiles: public to read, only owner can update (rows created by trigger)
create policy "profiles readable" on public.profiles for select using (true);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- projects: public to read, only creator can write
create policy "projects readable" on public.projects for select using (true);
create policy "creator inserts project" on public.projects for insert with check (auth.uid() = creator_id);
create policy "creator updates project" on public.projects for update using (auth.uid() = creator_id);
create policy "creator deletes project" on public.projects for delete using (auth.uid() = creator_id);

-- project_members: visible to all, managed by project creator
create policy "members readable" on public.project_members for select using (true);
create policy "creator adds member" on public.project_members for insert with check (
  exists (select 1 from public.projects p where p.id = project_id and p.creator_id = auth.uid()));
create policy "creator or self removes member" on public.project_members for delete using (
  auth.uid() = user_id or
  exists (select 1 from public.projects p where p.id = project_id and p.creator_id = auth.uid()));

-- saved_projects: private to each user
create policy "own saves readable" on public.saved_projects for select using (auth.uid() = user_id);
create policy "own saves insert"   on public.saved_projects for insert with check (auth.uid() = user_id);
create policy "own saves delete"   on public.saved_projects for delete using (auth.uid() = user_id);

-- posts / comments / likes / follows: public to read, owner-scoped writes
create policy "posts readable" on public.posts for select using (true);
create policy "author inserts post" on public.posts for insert with check (auth.uid() = author_id);
create policy "author updates post" on public.posts for update using (auth.uid() = author_id);
create policy "author deletes post" on public.posts for delete using (auth.uid() = author_id);

create policy "comments readable" on public.comments for select using (true);
create policy "user inserts comment" on public.comments for insert with check (auth.uid() = author_id);
create policy "author deletes comment" on public.comments for delete using (auth.uid() = author_id);

create policy "likes readable" on public.likes for select using (true);
create policy "user inserts like" on public.likes for insert with check (auth.uid() = user_id);
create policy "user deletes like" on public.likes for delete using (auth.uid() = user_id);

create policy "follows readable" on public.follows for select using (true);
create policy "user follows" on public.follows for insert with check (auth.uid() = follower_id);
create policy "user unfollows" on public.follows for delete using (auth.uid() = follower_id);

-- conversations / members / messages
create policy "member reads conversation" on public.conversations for select using (
  exists (select 1 from public.conversation_members cm
          where cm.conversation_id = id and cm.user_id = auth.uid()));
create policy "authenticated starts conversation" on public.conversations for insert
  with check (auth.role() = 'authenticated');

create policy "member reads membership" on public.conversation_members for select using (
  exists (select 1 from public.conversation_members self
          where self.conversation_id = conversation_id and self.user_id = auth.uid()));
-- NOTE (school-project simplification): any signed-in user can add themselves to a
-- conversation membership row. A production app should verify membership via invites.
create policy "user joins membership" on public.conversation_members for insert
  with check (auth.uid() = user_id);

create policy "member reads messages" on public.messages for select using (
  exists (select 1 from public.conversation_members cm
          where cm.conversation_id = conversation_id and cm.user_id = auth.uid()));
create policy "member sends message" on public.messages for insert with check (
  auth.uid() = sender_id and
  exists (select 1 from public.conversation_members cm
          where cm.conversation_id = conversation_id and cm.user_id = auth.uid()));

-- notifications: private to the recipient
create policy "own notifs readable" on public.notifications for select using (auth.uid() = user_id);
create policy "own notifs update"   on public.notifications for update using (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create a profile when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, username)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'display_name', ''),
          nullif(new.raw_user_meta_data ->> 'username', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Notifications
create or replace function public.notify_like()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, actor_id, type, ref_id)
  select p.author_id, new.user_id, 'like', new.post_id::text
  from public.posts p
  where p.id = new.post_id and p.author_id <> new.user_id;
  return new;
end;
$$;
drop trigger if exists on_like on public.likes;
create trigger on_like after insert on public.likes for each row execute function public.notify_like();

create or replace function public.notify_comment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, actor_id, type, ref_id)
  select p.author_id, new.author_id, 'comment', new.post_id::text
  from public.posts p
  where p.id = new.post_id and p.author_id <> new.author_id;
  return new;
end;
$$;
drop trigger if exists on_comment on public.comments;
create trigger on_comment after insert on public.comments for each row execute function public.notify_comment();

create or replace function public.notify_follow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, actor_id, type, ref_id)
  values (new.followee_id, new.follower_id, 'follow', new.follower_id::text);
  return new;
end;
$$;
drop trigger if exists on_follow on public.follows;
create trigger on_follow after insert on public.follows for each row execute function public.notify_follow();

create or replace function public.notify_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  other uuid;
begin
  select cm.user_id into other from public.conversation_members cm
  where cm.conversation_id = new.conversation_id and cm.user_id <> new.sender_id
  limit 1;
  if other is not null then
    insert into public.notifications (user_id, actor_id, type, ref_id)
    values (other, new.sender_id, 'message', new.conversation_id::text);
  end if;
  return new;
end;
$$;
drop trigger if exists on_message on public.messages;
create trigger on_message after insert on public.messages for each row execute function public.notify_message();

-- ============================================================
-- STORAGE: public bucket for avatars / post media
-- ============================================================
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "media readable" on storage.objects for select using (bucket_id = 'media');
create policy "authenticated uploads media" on storage.objects for insert
  with check (bucket_id = 'media' and auth.role() = 'authenticated');
create policy "owners update media" on storage.objects for update
  using (bucket_id = 'media' and auth.uid() = owner);
create policy "owners delete media" on storage.objects for delete
  using (bucket_id = 'media' and auth.uid() = owner);
