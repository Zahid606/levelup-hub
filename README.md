# Misk-ul-Kalam — Learn Hub

A multilingual (English / Urdu / Bengali) learning site: lessons, quizzes, points and a leaderboard for
students, with tools for admins, managers and volunteers. React + TanStack Start, Supabase (Postgres, Auth,
Realtime), deployed with Nitro (Vercel, Netlify or Cloudflare).

## Run it

```bash
bun install
bun run dev      # http://localhost:5173
bun run build
bun run test     # unit tests (vitest)
```

Environment variables (set them on your host as well as locally):

| Variable | Used for |
| --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | the browser app |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | server functions |
| `SUPABASE_SERVICE_ROLE_KEY` | admin server functions (create/delete users, reset passwords, push). Keep secret |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | optional: phone/desktop push notifications |

## Database

Migrations live in `supabase/migrations`. They are **not** applied automatically any more: paste a new file into
the Supabase dashboard → **SQL Editor** and run it. Every file is written to be safe to run again.

## Messaging

How it works

- **Students and volunteers write to the Admin Team.** They see one conversation, whichever admin or manager
  answers. Replies show the sender's name.
- **Admins and managers share one inbox.** Any of them can read and answer a student, every one of them is
  notified, and a message read by one counts as read for all.
- **Volunteers and their assigned students** chat one-to-one. Nobody else, including admins in the inbox view,
  is shown those chats.
- Messages are sent with a client-made id, so a retry after a dropped connection can never save a duplicate.
- Updates arrive over Supabase Realtime; if that is unavailable the page refreshes itself every few seconds.
- Unread counts come from `get_unread_message_count()` and appear on the menu; new messages also create a bell
  notification (database trigger) and an optional push notification.

Setup: run `supabase/migrations/20261028130000_messaging_v2.sql` once. It adds the contact and unread functions,
the shared-inbox notifications, and makes message text tamper-proof (only the "read" marker can change).

Code map: `src/lib/messaging.ts` (rules, unit-tested), `src/pages/Messages.tsx` (data and realtime),
`src/components/messages/*` (UI), `src/hooks/useUnreadMessages.ts` (menu badge).
