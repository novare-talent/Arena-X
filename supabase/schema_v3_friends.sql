-- ─────────────────────────────────────────────────────────────────────────────
-- Schema v3 — Friends & Challenges
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- TABLE: friendships
-- Handles both pending requests and accepted friendships in one table.
-- requester = person who sent the request
-- addressee = person who received it
-- status: 'pending' | 'accepted' | 'declined'
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.profiles(id) on delete cascade,
  addressee_id  uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'pending'
                  check (status in ('pending', 'accepted', 'declined')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Only one relationship row between any two users
  unique(requester_id, addressee_id),
  -- Can't friend yourself
  check (requester_id <> addressee_id)
);

create index idx_friendships_addressee on public.friendships(addressee_id, status);
create index idx_friendships_requester on public.friendships(requester_id, status);

alter table public.friendships enable row level security;

-- Anyone involved can read their own friendship rows
create policy "Users can view own friendships"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Only the requester can insert
create policy "Users can send friend requests"
  on public.friendships for insert
  with check (auth.uid() = requester_id);

-- Only the addressee can accept/decline; requester can delete (cancel)
create policy "Users can update friendship status"
  on public.friendships for update
  using (auth.uid() = addressee_id);

create policy "Users can delete own friendship"
  on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger friendships_updated_at
  before update on public.friendships
  for each row execute procedure public.set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: challenges
-- Direct 1v1 challenge between friends.
-- status: 'pending' | 'accepted' | 'declined' | 'expired'
-- mode:   'ranked'  | 'casual'
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.challenges (
  id             uuid primary key default gen_random_uuid(),
  challenger_id  uuid not null references public.profiles(id) on delete cascade,
  challenged_id  uuid not null references public.profiles(id) on delete cascade,
  track          text not null default 'dsa',
  mode           text not null default 'casual'
                   check (mode in ('ranked', 'casual')),
  status         text not null default 'pending'
                   check (status in ('pending', 'accepted', 'declined', 'expired')),
  match_id       uuid references public.matches(id) on delete set null,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null default (now() + interval '2 minutes'),

  check (challenger_id <> challenged_id)
);

create index idx_challenges_challenged on public.challenges(challenged_id, status);
create index idx_challenges_challenger on public.challenges(challenger_id, status);

alter table public.challenges enable row level security;

create policy "Users can view own challenges"
  on public.challenges for select
  using (auth.uid() = challenger_id or auth.uid() = challenged_id);

create policy "Challenger can create challenge"
  on public.challenges for insert
  with check (auth.uid() = challenger_id);

-- Service role updates status (accepted/declined/expired) via API routes
create policy "Service role can update challenges"
  on public.challenges for update
  using (true);

-- Enable Realtime on both tables
alter publication supabase_realtime add table public.friendships;
alter publication supabase_realtime add table public.challenges;

-- Add mode column to matches (ranked vs casual for friend challenges)
alter table public.matches
  add column if not exists mode text not null default 'ranked'
    check (mode in ('ranked', 'casual'));