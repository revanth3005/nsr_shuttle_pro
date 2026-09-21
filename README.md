# 🏸 ShuttlePro — Badminton Tournament Management

A production-style, full-stack Badminton Tournament Management application built with
**Next.js (App Router)**, **JavaScript**, **TailwindCSS**, ShadCN-style UI, **React Query**,
**AG Grid** and **Recharts** — on a **libSQL/SQLite** data store: a hosted **Turso**
database in production, and a plain local **SQLite file** in development (automatic,
no setup).

---

## ✨ Features

- **Auth**: Login, Registration, Forgot/Reset password, Change password, JWT (httpOnly cookie), protected routes, role-based access control.
- **Roles**: Super Admin, Tournament Organizer, Player — each with its own dashboard and permissions.
- **Players**: Full CRUD, profiles, statistics (played, wins, losses, win %, titles, points, ranking).
- **Clubs**: CRUD, club leaderboard and aggregated stats.
- **Tournaments**: CRUD, categories (Singles/Doubles), formats (Knockout / Round Robin / League / League + Knockout), status workflow.
- **Registrations**: Player/team registration, organizer approval, waitlist, rejection.
- **Teams**: Doubles team management.
- **Matches**: Best-of-3 scoring, automatic winner detection, status tracking.
- **Fixture Engine**: Auto-generates Knockout brackets (byes to next power of two), Round Robin (circle method), and League + Knockout.
- **Points Engine**: Fully configurable from the UI, stored in the `Points_Config` sheet.
- **Ranking Engine**: Composite ranking (points + win% + titles), recomputed on every result. Overall / State / Club / Yearly scopes.
- **Leaderboards**: Player and club leaderboards with charts.
- **Dashboards**: Role-specific dashboards with Recharts line/bar/pie charts.
- **Notifications**: In-app notification centre (approvals, fixtures, results, announcements).
- **Global Search**: Across players, clubs, teams and tournaments.
- **Reports**: Tournament / Ranking / Player / Club reports — export to **Excel** and **CSV**; **PDF** via browser print.
- **Audit Log**: Tracks logins, updates, tournament/match/ranking changes.
- **UI**: Modern sports theme, fully responsive (mobile/tablet/desktop), dark & light themes.

---

## 🧱 Architecture

```
Next.js Full-Stack App
├── App Router (src/app)
│   ├── (app)/*            Authenticated pages (shell: sidebar + topbar)
│   ├── login/register/... Public auth pages
│   └── api/*              REST API route handlers (Node runtime)
├── src/lib
│   ├── excel/             Excel storage layer (schema + safe CRUD store)
│   ├── auth/              JWT + session helpers
│   └── services/          Reusable business services + engines
├── src/components         Reusable UI (ShadCN-style), app shell, charts, grid
└── src/hooks              React Query hooks
```

> Demo data (accounts, players, clubs, tournaments) is generated automatically on
> first run — see `src/lib/excel/seed-data.js`.

### Data layer (`src/lib/excel/store.js`)
Reusable primitives: `readSheet`, `writeSheet`, `insertRow(s)`, `updateRow`, `deleteRow`,
`search`, `filter`, `aggregate`, `replaceSheet` — all async, all backed by SQL.

### Database: Turso in prod, a local file in dev
Both are libSQL, so the schema, the SQL and `store.js` are **identical** either way —
only the connection URL differs. Resolution order (`src/config/db.config.js`):

| # | Source | Used when |
|---|--------|-----------|
| 1 | `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` env vars | **Production** |
| 2 | Hardcoded values in `src/config/db.config.js` | If you prefer paste-and-go |
| 3 | Local SQLite file at `data/badminton.db` | **Automatic fallback in dev** |

Tables are created and demo data seeded on the first request, whichever backend is in
use. To start completely fresh locally, delete `data/badminton.db` and restart.

> **The local fallback is disabled when `NODE_ENV=production`** and no Turso URL is set —
> the app fails with a clear error instead of starting. Most hosts (Vercel, Docker, Fly)
> have an ephemeral filesystem, so a silent file fallback would wipe your data on every
> deploy. Set `ALLOW_LOCAL_DB=1` to override on a host with a real persistent disk.

### Workbook: `data/badminton-data.xlsx`
Sheets: `Users`, `Players`, `Clubs`, `Tournaments`, `Teams`, `Registrations`,
`Matches`, `Rankings`, `Points_Config`, `Notifications`, `Audit_Log`.

The workbook is created automatically on first run. Use `npm run seed` for demo data.

---

## 🚀 Getting started

```bash
# 1. Install dependencies
npm install

# 2. (Optional) set a JWT secret
cp .env.example .env    # then edit JWT_SECRET

# 3. Run the dev server. No database setup needed — it falls back to a
#    local SQLite file (data/badminton.db), created and seeded on first run.
npm run dev
# open http://localhost:3000
```

### Demo accounts

| Role       | Email                   | Password       |
|------------|-------------------------|----------------|
| Super Admin| admin@shuttle.pro       | admin123       |
| Organizer  | organizer@shuttle.pro   | organizer123   |
| Player     | player@shuttle.pro      | player123      |

> The database with demo accounts and data is created automatically the first time the
> app runs. To start completely fresh locally, delete `data/badminton.db` and restart —
> it will be re-created. You can also register a new account (the first Player signup
> creates a linked profile).

---

## 🏭 Production build

```bash
npm run build

# Production runs on Turso — set these in your host's environment:
export TURSO_DATABASE_URL="libsql://<db>-<org>.turso.io"
export TURSO_AUTH_TOKEN="<token>"
npm start
```

Get the values from Turso (free tier is plenty):

```bash
turso db create shuttlepro
turso db show shuttlepro --url       # -> TURSO_DATABASE_URL
turso db tokens create shuttlepro    # -> TURSO_AUTH_TOKEN
```

Without `TURSO_DATABASE_URL`, a production build refuses to start rather than silently
falling back to a local file (see the database note above). If you're self-hosting on a
box with persistent storage and genuinely want the file, set `ALLOW_LOCAL_DB=1` and make
sure `data/` is writable — `DATA_DIR` moves it elsewhere.

---

## 🔑 A quick end-to-end flow

1. Sign in as **organizer**.
2. Open **Summer Open 2026** → **Registrations** are pre-approved (8 players).
3. Go to **Fixtures & Results** → **Generate Fixtures** (Knockout bracket).
4. **Enter Result** on a match (e.g. `21-18`, `21-15`) — winner, points and rankings update automatically.
5. Check **Rankings** and **Leaderboards** — recompute reflected instantly.
6. Sign in as **player** to see your dashboard, upcoming matches and match history.

---

## 🧰 Tech stack

Next.js 15 · JavaScript · TailwindCSS · ShadCN-style components · React Query ·
AG Grid · Recharts · jose (JWT) · bcryptjs · SheetJS (`xlsx`) · zod · next-themes.
