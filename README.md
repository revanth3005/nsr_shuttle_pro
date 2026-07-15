# 🏸 ShuttlePro — Badminton Tournament Management

A production-style, full-stack Badminton Tournament Management application built with
**Next.js (App Router)**, **JavaScript**, **TailwindCSS**, ShadCN-style UI, **React Query**,
**AG Grid** and **Recharts** — using a **single Excel workbook as the only data store**
(no database).

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

### Excel data layer (`src/lib/excel/store.js`)
Reusable primitives: `readSheet`, `writeSheet`, `insertRow(s)`, `updateRow`, `deleteRow`,
`search`, `filter`, `aggregate`, `replaceSheet`.

**Safe writes / no corruption**: every mutation runs through an in-process serial
**write queue** (one write at a time) and is persisted **atomically** (write to a temp
file, then rename). Reads never block writes.

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

# 3. Run the dev server — the Excel workbook and demo data are
#    created automatically on first run.
npm run dev
# open http://localhost:3000
```

### Demo accounts

| Role       | Email                   | Password       |
|------------|-------------------------|----------------|
| Super Admin| admin@shuttle.pro       | admin123       |
| Organizer  | organizer@shuttle.pro   | organizer123   |
| Player     | player@shuttle.pro      | player123      |

> The workbook (`data/badminton-data.xlsx`) with demo accounts and data is created
> automatically the first time the app runs. To start completely fresh, delete that
> file and restart — it will be re-created. You can also register a new account
> (the first Player signup creates a linked profile).

---

## 🏭 Production build

```bash
npm run build
npm start
```

Ensure the `data/` directory is writable in your deployment environment (it holds the
Excel workbook). To store data elsewhere, set `DATA_DIR` to an absolute path.

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
