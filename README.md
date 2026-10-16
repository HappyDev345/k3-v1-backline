# BACKLINE

A creative networking and collaboration platform for audiovisual production,
live events, film, music and photography — full-stack edition.

Stack: **React + Vite** (frontend) · **Supabase** (PostgreSQL, Auth, Storage, Realtime) · **Vercel** (hosting)

---

## Features in this build (roadmap Phases 2–5)

| Area | What's working |
|---|---|
| Accounts | Email/password sign-up and sign-in (Supabase Auth), auto-created profile |
| Profiles | View/edit profile: display name, username, role, location, bio, skills, avatar upload |
| Discover | Real projects from the database: search, combined filters (type / role / location), sorting, saved projects, publish projects, express interest |
| Feed | Posts with title + body, likes, comments, Everyone / Following tabs |
| People | Search creatives by name/role/skill/location, follow, start a conversation |
| Forum | Category-organised threads with replies |
| Messages | Realtime 1:1 conversations (Supabase Realtime) |
| Notifications | Like / comment / follow / message alerts, unread badge, mark-all-read |

Phase 6 items (thorough security testing, accessibility audit, backups, performance
work) are intentionally left for you — see the checklist at the bottom.

---

## 1. Prerequisites

- Node.js 18+ (https://nodejs.org)
- A free Supabase account (https://supabase.com)

## 2. Set up the database

1. Create a new Supabase project.
2. In the dashboard, open **SQL Editor → New query**, paste the entire contents of
   `supabase/schema.sql`, and click **Run**. This creates all tables, security
   policies, triggers and the `media` storage bucket.
3. (Recommended for testing) **Authentication → Providers**: keep Email enabled, and
   under **Authentication → Sign In / Providers → Email** you can turn *off*
   "Confirm email" so you can register accounts instantly while developing.

## 3. Configure the frontend

```bash
cp .env.example .env
```

Fill in the two values from **Supabase Dashboard → Project Settings → API**:
- `VITE_SUPABASE_URL` — the Project URL
- `VITE_SUPABASE_ANON_KEY` — the `anon` `public` key

## 4. Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173). Register two test
accounts in two different browsers (or one normal window + one private window)
to see follows, messages and notifications flow between real users.

## 5. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Then in the Vercel dashboard: **Project → Settings → Environment Variables**,
add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Redeploy.
Every push to your GitHub repo will auto-deploy if you import the repo via Vercel.

---

## Project structure

```
backline/
├── index.html                  # fonts + app shell
├── supabase/
│   └── schema.sql              # tables, RLS policies, triggers, storage
├── src/
│   ├── main.jsx                # router + auth provider bootstrap
│   ├── App.jsx                 # routes + global auth modal
│   ├── index.css               # the whole design system (dark navy / blue-purple)
│   ├── lib/
│   │   ├── supabase.js         # Supabase client (reads .env)
│   │   ├── conversations.js    # find-or-create 1:1 conversation helper
│   │   └── utils.js            # timeAgo, initials, date formatting
│   ├── context/
│   │   └── AuthContext.jsx     # session + profile state, sign in/up/out
│   ├── components/
│   │   ├── NavBar.jsx          # navigation + notification badge
│   │   ├── AuthModal.jsx       # sign in / create account
│   │   ├── Avatar.jsx
│   │   ├── ProjectCard.jsx     # reusable (Discover + Profile)
│   │   ├── ProjectModal.jsx    # project details + express interest
│   │   └── PostCard.jsx        # post + like + comments
│   └── pages/
│       ├── FeedPage.jsx
│       ├── DiscoverPage.jsx    # search + filters + new project
│       ├── PeoplePage.jsx
│       ├── ProfilePage.jsx     # view / edit + user's projects & posts
│       ├── MessagesPage.jsx    # realtime 1:1 chat
│       ├── ForumPage.jsx       # categories, threads, replies
│       └── NotificationsPage.jsx
```

## Known simplifications (fine for a major work, tighten before "launch")

- Conversation membership insert policy allows any signed-in user to add themselves
  to a conversation row; a production app should use invitations. Conversations
  themselves are only readable by members.
- Discover filtering runs client-side after fetching recent projects — fine at
  small scale; move to `.ilike()` / `.contains()` queries as data grows.
- No unread-per-conversation tracking, no media attachments on posts (storage +
  `media_urls` column are ready), no password reset UI, no moderation/reporting yet.
- The SQL in `schema.sql` was written but not executed here — run it and check the
  SQL Editor output for any errors on first setup.

## Phase 6 checklist (your roadmap)

- [ ] Test every RLS policy with two accounts (try to read/edit other users' data)
- [ ] Accessibility pass: labels, focus states, contrast, keyboard-only navigation
- [ ] Error handling and empty states on every fetch
- [ ] Performance: indexes are implicit in PKs; add indexes if you filter large tables
- [ ] Database backups (Supabase → Database → Backups)
- [ ] Content reporting / blocking / spam prevention
