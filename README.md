# CaseFlow — Case Management System

A full-stack case management application: cases, parties, hearings and events, tasks, documents, notifications, and an audit log, with role-based access enforced by the database.

**Stack:** Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 · shadcn/ui (Base UI) · Supabase (Postgres, Auth, RLS, Storage, Realtime) · React Hook Form + Zod · Recharts · Lucide.

## Getting started (local)

Requirements: Node 20+, Docker Desktop (running).

```bash
npm install
npm run db:start        # starts local Supabase and applies supabase/migrations
cp .env.example .env.local   # fill in the values printed by db:start (API_URL, ANON_KEY, SERVICE_ROLE_KEY)
npm run seed            # demo users + sample data (local only)
npm run dev             # http://localhost:3000
```

Demo accounts (password `Demo1234!`):

| Email | Role |
|---|---|
| admin@demo.local | Administrator |
| manager@demo.local | Case Manager |
| staff@demo.local, clerk@demo.local | Staff |
| viewer@demo.local | Viewer |

Other scripts: `npm run seed -- --reset` (wipe case data + demo users, reseed), `npm run db:reset` (re-apply migrations from scratch), `npm run typecheck`, `npm run lint`, `npm run build`.

Local Supabase Studio is at http://127.0.0.1:54323 and password-reset emails land in Mailpit at http://127.0.0.1:54324.

## Deploying to a hosted Supabase project

1. `npx supabase link --project-ref <ref>` then `npx supabase db push` to apply the migrations.
2. In Auth → URL Configuration, set the Site URL and add `https://<your-domain>/auth/callback` as a redirect URL.
3. Set the environment variables from `.env.example` on your host. `SUPABASE_SERVICE_ROLE_KEY` is server-only (used for admin user management) and must never get a `NEXT_PUBLIC_` prefix.
4. The **first account that signs up becomes Administrator**; later accounts are Viewers until an administrator changes their role (Settings → Users & Roles), or administrators can create accounts directly there.
5. Do not run the seed script against production (it refuses non-local URLs unless `ALLOW_REMOTE_SEED=true`).

## Project layout

```
supabase/migrations/   schema, views/triggers/RPCs, RLS policies, storage + reference data
scripts/seed.mjs       demo data (development only)
src/proxy.ts           session refresh + redirect for signed-out users (Next 16 "proxy" = middleware)
src/lib/
  supabase/            browser, server and service-role clients
  data/                server-only queries (run as the user, so RLS applies)
  actions/             Server Actions (validate with Zod, check role, then write)
  validations/         Zod schemas shared by forms and actions
  constants.ts         enum options, labels, badge colours
  permissions.ts       UI-side mirror of the RLS rules
  datetime.ts          time-zone aware helpers (NEXT_PUBLIC_APP_TIMEZONE)
src/components/        layout, dashboard, cases, people, calendar, tasks, settings, shared, ui
src/app/(auth)         login, forgot/reset password
src/app/(app)          authenticated pages
```

## Design notes

- **Security lives in the database.** Every table has RLS. Roles: Administrator (everything), Case Manager (all records, deletes), Staff (create/edit; edit only cases assigned to or created by them; delete only their own events/tasks/notes/documents), Viewer (read-only). Deactivated users lose all access. The UI hides actions users can't perform, but the database is the source of truth.
- **Audit log and notifications are written by triggers** (`SECURITY DEFINER`), so they can't be skipped or forged by clients. Time-based reminders (hearings within 48h, tasks due/overdue, deadlines within 3 days) come from `generate_my_reminders()`, which is idempotent and runs when the app layout loads. You can also schedule it with `pg_cron`. New notifications are pushed live through Supabase Realtime.
- **Hearings are events** (`events.event_type = 'hearing'`); a case's "next hearing" is derived from them, not stored twice. Roles live on `profiles.role`; there is no separate `user_roles` table.
- **Documents** go straight from the browser to the private `case-documents` bucket (RLS-protected). Metadata is saved by a server action, and viewing or downloading uses 60-second signed URLs.
- **Time zone:** "today", the header clock and the calendar use `NEXT_PUBLIC_APP_TIMEZONE` (default in `.env.example`: `Asia/Manila`).
- **Email notifications** are a stored preference only. Sending email needs an SMTP or email provider to be configured.
- After changing the schema, consider generating typed clients with `npx supabase gen types typescript --local > src/lib/database.types.ts`. Row types currently live in `src/lib/types.ts`.
