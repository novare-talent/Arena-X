# Referral Program — Launch Plan (approved decisions baked in)

## 0. Approved decisions

| Decision | Choice |
|---|---|
| Reward mechanism | **Admin-issued OpenAI API keys** — user generates a new restricted key from their own OpenAI account and delivers it to the referrer. No in-product LLM cost tracking. |
| Qualification bar | **Referred user must (a) verify email AND (b) complete ≥1 ranked match.** No onboarding requirement. |
| Public leaderboard | **Public** — anyone can see top referrers. |
| Tier interpretation | Assumed **cumulative tier-up with delta grants** — confirm at the bottom |

| Verified+active referrals | Cumulative reward | Delta to deliver on tier-up |
|---:|---:|---:|
|  20 |  $10 |  $10 |
|  75 |  $25 |  $15 |
| 100 |  $50 |  $25 |
| 300 | $100 |  $50 |
| 500 | $200 | $100 |

---

## 1. What's already in place ✅ (don't rebuild)

- `profiles.referral_code` + `profiles.referred_by` + `referrals` table (`referrer_id`, `referred_id`, `reward_granted`)
- `/invite/[code]` landing page + `?ref=` capture on the email signup form
- `signUp` server action writes `profiles.referred_by` + a `referrals` row (after a 1.5s sleep — kills in G3)
- Profile shows the link + a `{n} JOINED` badge + the list of who joined (shipped last turn)
- RLS: users can read their own referrals

## 2. The seven gaps and how each is fixed

| # | Gap | Fix |
|---|---|---|
| **G1** | OAuth signups silently lose referrals (form-only `?ref=`) | On `/invite/[code]` set HttpOnly cookie `arenax_ref` (30 min). In `auth/callback/route.ts` after `exchangeCodeForSession`, resolve cookie → referrer → write `referred_by` + insert `referrals`; delete cookie. One code path covers email + OAuth. |
| **G2** | Unverified accounts counted | Add `referrals.verified_at` + `referrals.qualified_at`. Trigger on `auth.users.email_confirmed_at` flip → set `verified_at`. Trigger on first completed ranked match → set `qualified_at`. Tier counts use `qualified_at IS NOT NULL` only. |
| **G3** | 1.5s race in `signUp` | Move referral linkage into the existing `handle_new_user` trigger. Signup passes `raw_user_meta_data.referral_code`; trigger resolves it inline. OAuth path uses the G1 cookie. Delete the `setTimeout` + service-role write. |
| **G4** | `reward_granted` is dead | New `referral_grants` audit table with status (`pending`/`delivered`/`revoked`) and the issued key. When a referrer crosses a tier (qualification trigger fires the check), a row is created in `pending`. **Admin manually generates the OpenAI key** with the correct cap, pastes it into the admin form, system marks `delivered` + reveals the key in the referrer's profile + emails them. |
| **G5** | No anti-abuse (real money at stake) | (a) Normalize emails before comparing — `john+1@gmail.com` ≡ `john@gmail.com`; refuse self-referrals across email roots. (b) `signup_throttle (ip_hash, day, count)` — reject referred-signups beyond **5/day per IP hash**. (c) Qualification bar already requires verified + ≥1 ranked match (kills zombies). (d) Soft cap: **50 qualified refs/day** per referrer; spikes flag `referrals.review_required = true` and pause grants until admin clears. |
| **G6** | No admin tracking | `/admin/referrals` page: top-referrers table (qualified count, status, lifetime $ delivered) · funnel chart (clicks → signup → verified → qualified → tier) · per-referrer detail with revoke + flag review · **pending-grants queue with "paste key" form**. Click tracking via `referral_clicks (code, day, count)` incremented from the `/invite/[code]` server load. |
| **G7** | Share UX is one Copy button | Profile share row: WhatsApp / Twitter / LinkedIn / Email intents with pre-filled copy. New `InviteCard` (reuse `ShareSheet` + `StoryCard` pattern) for image share. Dismissible post-match nudge ("Great match — share your rank + invite a rival"), capped to once/week per user. |

---

## 3. Reward delivery flow (the new key bit)

```
referred user verifies email                 →  referrals.verified_at = now()
referred user completes 1st ranked match     →  referrals.qualified_at = now()
                                                check_tier_crossing(referrer)
                                                   ↓ if a new tier just crossed
                                                INSERT INTO referral_grants (status='pending', amount=DELTA)
                                                + notify referrer in-product banner
                                                + Email: "you've hit Tier X — key arriving within 24h"

Admin (you) opens /admin/referrals/grants
   - sees pending grants list with: user · tier · amount due
   - clicks "Fulfill" → opens OpenAI dashboard, creates a new restricted key
     (label: "arenax-ref-{username}-tier-{N}", usage limit: $X)
   - pastes the key (sk-...) into the form, hits Deliver
   - status → 'delivered', fulfilled_by = admin user id, fulfilled_at = now()
   - System emails referrer: "Your $X OpenAI key is in your profile."
   - Key visible in referrer's profile under "OpenAI keys earned"
```

You aren't on the hot path of every signup — you only see a queue with a handful of pending grants per week (probably). Each one is ~30 sec of work on your side.

---

## 4. DB migration (single file)

`supabase/referrals_v2.sql` — idempotent:

```sql
-- G2: qualification stages
alter table public.referrals
  add column if not exists verified_at     timestamptz,
  add column if not exists qualified_at    timestamptz,
  add column if not exists review_required boolean not null default false;

-- G4: grant audit + key storage
create table if not exists public.referral_grants (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  tier_threshold  int  not null,                 -- 20/75/100/300/500
  amount_usd      int  not null,                 -- delta (10/15/25/50/100)
  status          text not null default 'pending'
                  check (status in ('pending','delivered','revoked')),
  openai_api_key  text,                          -- pasted by admin when fulfilling
  key_label       text,
  granted_at      timestamptz default now(),     -- when the tier was crossed
  fulfilled_at    timestamptz,
  fulfilled_by    uuid references public.profiles(id),
  revoked_at      timestamptz,
  revoke_reason   text,
  unique (user_id, tier_threshold)               -- idempotent: no double-grant
);

alter table public.referral_grants enable row level security;

-- referrer can read only delivered grants (so they see their keys)
create policy "Referrer can view delivered grants"
  on public.referral_grants for select
  using (auth.uid() = user_id and status = 'delivered');

-- G5: throttle table (server-side write only, via service role)
create table if not exists public.signup_throttle (
  ip_hash text not null,
  day     date not null default current_date,
  count   int  not null default 0,
  primary key (ip_hash, day)
);

-- G6: click tracking (server-side write only)
create table if not exists public.referral_clicks (
  code  text not null,
  day   date not null default current_date,
  count int  not null default 0,
  primary key (code, day)
);

-- (full trigger updates ship with the migration:
--  handle_new_user → reads raw_user_meta_data.referral_code, writes referred_by + referrals row;
--  on_email_confirmed → stamps referrals.verified_at;
--  on_first_match     → stamps referrals.qualified_at + runs check_tier_crossing.)
```

---

## 5. Code touch points

| Area | Files | Why |
|---|---|---|
| **Signup → cookie** | `src/app/invite/[code]/page.tsx`, `src/app/signup/page.tsx` | Set `arenax_ref` HttpOnly cookie when visited (G1 OAuth) |
| **OAuth callback** | `src/app/auth/callback/route.ts` | Read cookie → write referral on OAuth completion (G1) |
| **Email signup action** | `src/app/auth/actions.ts` | Drop the `setTimeout` + service-role write (G3); now the trigger handles it |
| **DB triggers** | `supabase/referrals_v2.sql` | Linkage + verified/qualified flags + tier-cross check (G2, G3, G4) |
| **Anti-abuse** | new `src/lib/referralAbuse.ts` + edge in `signUp` + OAuth callback | Email-root normalize + IP-hash throttle (G5) |
| **Profile UI** | `src/components/profile/ProfileClient.tsx` + `src/app/profile/page.tsx` | Tier progress bar · qualified vs total · *"OpenAI keys earned"* section with copy buttons · share intents · InviteCard (G7) |
| **Public leaderboard** | new `src/app/leaderboard/referrers/page.tsx` + client | Top referrers by qualified count |
| **Click tracking** | `src/app/invite/[code]/page.tsx` | `upsert` into `referral_clicks` per code/day (G6) |
| **Admin dashboard** | new `src/app/admin/referrals/page.tsx` + client | Top referrers, funnel, pending-grants queue with key-paste form, revoke (G6) |
| **Post-match nudge** | `src/components/arena/ResultClient.tsx` | Once-per-week dismissible invite prompt (G7) |
| **Email** | new `src/lib/email.ts` (Resend or Supabase email) | "You hit tier X" + "Your key is ready" notifications (G4) |

---

## 6. Phased build (~4½ days, MVP at end of P3)

| Phase | Scope | Est |
|---|---|---|
| **P1** | DB migration · trigger-based linkage · OAuth cookie capture · verified/qualified flags | 1.5 d |
| **P2** | Tier-cross check function · pending `referral_grants` row creation · idempotency tests | 0.5 d |
| **P3** | Profile: tier progress · qualified count · "OpenAI keys earned" list with copy · share intents · InviteCard | 1 d |
| **P4** | `/admin/referrals` — top referrers + funnel + pending-grants queue with key-paste form + revoke | 1 d |
| **P5** | Public `/leaderboard/referrers` page | 0.5 d |
| **P6** | Anti-abuse: email-root normalize · IP-hash throttle · daily review-flag cron · email notifications | 1 d |

**P1+P2+P3 = "safe-to-launch MVP"** (≈3 days). P4 must ship before you advertise tier crossings (otherwise grants pile up with no fulfillment UI). P5/P6 same week.

---

## 7. Risks & how each is handled

| Risk | Handling |
|---|---|
| Issued key gets abused beyond cap | OpenAI key restrictions: set per-key usage limit + IP allowlist when generating. Cap = grant amount. |
| Same person creates many accounts to farm referrals | (a) Email-root normalization, (b) IP-hash daily throttle, (c) qualification requires real match play, (d) admin review queue on spikes (>50/day or full tier in <7 days) |
| Referred user plays the match by colluding (referrer creates throwaway, "duels" themselves to qualify) | The duel ledger already tracks both player ids; flag if both share IP at signup. Admin can revoke. |
| Key delivery email lands in spam / user loses key | Key stays visible in their profile permanently (under "OpenAI keys earned") — they can copy it any time. Admin can re-issue + revoke old. |
| OpenAI account quota / billing surprise | Each issued key has a usage cap = grant amount. Total max exposure per user = $200 (lifetime cap at tier 500). |
| Public leaderboard becomes a wall of farmers | Show **qualified** count only (zombie accounts filtered out); add a "verified" check icon next to known-clean accounts; admin can hide flagged accounts. |

---

## 8. Two small confirmations before I start

1. **Tier interpretation** — confirm cumulative-with-delta (deliver +$10/+$15/+$25/+$50/+$100; lifetime cap $200). Or did you mean something else? Default = the above unless you say otherwise.
2. **Notification channel** — when a referrer crosses a tier, do you want an **email** sent (needs us to add Resend or use Supabase's built-in email)? Or **in-product banner only** is fine for v1? Cheapest: in-product banner first, email later.

Approve those (or correct them) and I'll start at **Phase 1** (migration + trigger linkage + OAuth cookie capture).