# ConcertCircle

See which concerts your friends are going to — without the group chat noise.

## Tech stack

| Layer        | Choice                              |
|-------------|-------------------------------------|
| Framework   | Next.js 15 (App Router, TypeScript) |
| Auth & DB   | Supabase (Postgres + RLS + Realtime)|
| Styling     | Tailwind CSS                        |
| Hosting     | Vercel (recommended)                |

---

## Prerequisites

- Node.js ≥ 20
- npm ≥ 10 (or pnpm / yarn)
- A [Supabase](https://supabase.com) project (free tier works)

---

## 1 — Supabase project setup

### 1a. Create a project

1. Go to [app.supabase.com](https://app.supabase.com) → **New project**.
2. Choose a region close to your users.
3. Note your **Project URL** and **anon key** (Settings → API).

### 1b. Run the SQL migrations

In the Supabase dashboard go to **SQL Editor** and run each file in order:

```
supabase/migrations/00001_schema.sql    ← tables + indexes
supabase/migrations/00002_rls.sql       ← row-level security policies
supabase/migrations/00003_triggers.sql  ← auth sync + notification triggers
```

Paste each file's content and click **Run**.
Alternatively, if you have the [Supabase CLI](https://supabase.com/docs/guides/cli) installed:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### 1c. Enable Email confirmations (optional for dev)

For local development you may want to **disable** email confirmation so you can sign up without clicking a link:

Authentication → Providers → Email → uncheck "Confirm email".

Re-enable this before going to production.

---

## 2 — OAuth providers

### Google

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Create an **OAuth 2.0 Client ID** (Web application).
3. Add authorised redirect URI:
   ```
   https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
   ```
4. Copy the **Client ID** and **Client Secret**.
5. In Supabase → Authentication → Providers → Google: paste them in, enable the provider, and save.

### Apple (scaffold provided)

Apple Sign In requires:
- An Apple Developer account ($99/year).
- A **Services ID** with Sign In with Apple enabled.
- A **private key** (`.p8` file).
- A domain verification file served from your domain.

Steps:
1. Developer Console → Certificates, Identifiers & Profiles → Identifiers → + → Services IDs.
2. Enable "Sign In with Apple", configure your domain and redirect URL:
   ```
   https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
   ```
3. Create a Key with "Sign In with Apple" capability, download the `.p8` file.
4. In Supabase → Authentication → Providers → Apple: fill in Services ID, Team ID, Key ID, and paste the `.p8` content.

The OAuth button is already wired up in `SignInForm.tsx`. Testing locally is difficult — use a deployed URL for Apple.

---

## 3 — Local dev setup

### 3a. Clone and install

```bash
git clone <repo-url> concert-circle
cd concert-circle
npm install
```

### 3b. Environment variables

Copy the example file:

```bash
cp .env.example .env.local
```

Fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3c. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 4 — Deployment (Vercel)

```bash
npm i -g vercel
vercel --prod
```

Set the same environment variables in Vercel → Project → Settings → Environment Variables.

Update `NEXT_PUBLIC_SITE_URL` to your production URL.

In Supabase → Authentication → URL Configuration:
- Site URL: `https://your-domain.com`
- Additional redirect URLs: `https://your-domain.com/auth/callback`

---

## Project structure

```
src/
  app/
    (app)/                  ← authenticated route group
      dashboard/            ← Dashboard page + client component
      concerts/             ← Concerts list + CRUD client component
      friends/              ← Friends list + invite/accept/decline
      feed/                 ← Friends' concert feed
      notifications/        ← Notification list + mark-read
    auth/
      callback/route.ts     ← OAuth callback handler
    page.tsx                ← Root: shows auth page (middleware redirects logged-in users)
    layout.tsx              ← Root HTML shell
    globals.css             ← Tailwind + custom classes
  components/
    auth/                   ← AuthPage, SignInForm, SignUpForm
    concerts/               ← ConcertCard, ConcertForm, StatusToggle
    layout/                 ← Nav (with unread badge + real-time subscription)
    ui/                     ← Alert
  lib/
    supabase/
      client.ts             ← Browser Supabase client
      server.ts             ← Server Supabase client (cookies)
  middleware.ts             ← Route protection + auth cookie refresh
  types/
    database.ts             ← TypeScript types matching the DB schema

supabase/
  migrations/
    00001_schema.sql        ← Tables + indexes
    00002_rls.sql           ← RLS policies + helper function
    00003_triggers.sql      ← Auto user profile, notification triggers
```

---

## Data model notes

### Friendships — direction

Friendships are **one-directional requests** that become **mutually readable** once accepted.

- `user_id` = the person who sent the invite.
- `friend_id` = the person who received it.
- Once `status = 'accepted'`, the RLS `is_friend()` helper treats the link as mutual — both users can see each other's concerts and user_concert rows.
- After accepting, the UI prompts the acceptor: "Would you like to invite them to follow you back?" If they say yes, a new `friendships` row is inserted in the other direction, creating a true bidirectional link.

### Notifications — trigger-driven

All notifications are created by Postgres triggers (`00003_triggers.sql`):

| Trigger | Event | Creates notification for |
|---------|-------|--------------------------|
| `on_auth_user_created` | New auth user | — (creates `public.users` row) |
| `on_friendship_insert` | New friendship request | `friend_id` (pending request) |
| `on_friendship_accepted` | `status` → `accepted` | `user_id` (request sender) |
| `on_user_concert_insert` | New user_concert row | Both matched friends |
| `on_user_concert_update` | Status changed | Both matched friends |

The Supabase Realtime subscription in `Nav.tsx` updates the badge count instantly.

---

## Manual test checklist

### Auth
- [ ] Sign up with email + password → confirmation email (or direct sign-in if confirmation disabled).
- [ ] Sign in with email + password.
- [ ] Sign in with Google (requires OAuth configured).
- [ ] After login, `/` redirects to `/dashboard`.
- [ ] Log out → redirected to `/`.
- [ ] Visiting `/dashboard` while logged out redirects to `/`.

### Concerts
- [ ] Create a concert with all required fields.
- [ ] Create a concert with a ticket URL — link appears on card.
- [ ] Mark a concert as "Going" — badge turns green.
- [ ] Mark a concert as "Interested" — badge turns yellow.
- [ ] Toggle Going → click again → status removed.
- [ ] Edit a concert you created — changes save correctly.
- [ ] Delete a concert you created — removed from list.
- [ ] "My concerts" filter shows only concerts you've marked.

### Friends
- [ ] Invite a non-existent email → error message.
- [ ] Invite your own email → error message.
- [ ] Invite a valid existing user → success message; they see a pending request.
- [ ] Accept a request → both users see each other in friends list.
- [ ] Decline a request → removed from pending.
- [ ] Remove a friend → removed from list.

### Feed
- [ ] As User A (accepted friend of User B): User B marks a concert → it appears in User A's feed.
- [ ] Feed shows correct Going/Interested badges per friend.
- [ ] Feed only shows upcoming concerts (today or later).

### Notifications
- [ ] After receiving a friend request → notification appears in `/notifications`.
- [ ] After accepting a friend request → sender gets a notification.
- [ ] After a friend marks the same concert as you → both get a "concert match" notification.
- [ ] Unread badge appears in nav.
- [ ] Click a notification → marked as read, dot disappears.
- [ ] "Mark all as read" → all dots gone.

---

## Known limitations / next steps

- **URL import**: The "Import from URL" feature is not implemented. To add it, create a Supabase Edge Function that receives a URL, fetches the page, parses metadata (Open Graph or structured data), and returns concert fields pre-filled. Use a `source_url` column to store the origin.
- **Apple OAuth**: Scaffolded. Requires Apple Developer account. See Section 2 above.
- **Email notifications**: Not implemented. To add: use a Supabase Edge Function triggered by a webhook on the `notifications` table, call Resend or Postmark. Store `RESEND_API_KEY` in Supabase Vault — never in the frontend.
- **Concert deduplication**: Multiple users can create the same concert as separate rows. A future improvement would be a canonical concert record search/link flow.
- **Pagination**: Concert and notification lists are not paginated; add `.range()` queries for large datasets.
