# Mabrook

A shared family calendar of birthdays, anniversaries and milestones, kept in
both the Gregorian and the Dawoodi Bohra Hijri calendars.

Every occasion stores an absolute date in *both* calendars, and records which
one the family counts the anniversary in. So one person's birthday can come
round every 14 November while their brother's comes round every 17 Zilqadah —
and both appear, correctly ordered, in one upcoming list.

## Getting started

```bash
npm install
cp .env.example .env          # then edit DATABASE_URL if you have your own Postgres

npm run db:local              # optional: a local Postgres, nothing to install
npm run db:deploy             # apply migrations
npm run db:seed               # a demo family to look at
npm run dev
```

The seed creates a login: `demo@mabrook.local` / `mabrook123`.

`npm run db:local` runs [PGlite](https://pglite.dev) — real Postgres compiled to
WASM — behind the Postgres wire protocol on port 5432, with its data in
`.pglite/`. It's a development convenience so there's no database to install;
production uses Railway's Postgres and nothing outside `scripts/` imports it.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Generate the Prisma client and build |
| `npm test` | Unit tests for the calendar maths |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:local` | Local Postgres (PGlite), foreground |
| `npm run db:migrate` | Create a migration from schema changes |
| `npm run db:deploy` | Apply pending migrations |
| `npm run db:seed` | Reset and reseed demo data |
| `npm run db:studio` | Prisma Studio |

## How the calendar works

`src/lib/hijri/hijri.ts` is a TypeScript port of
[mumineen_calendar_js](https://github.com/mygulamali/mumineen_calendar_js), the
library behind mumineencalendar.com. It's the tabular Bohra (Misri) calendar:
arithmetic, fixed in advance, and not the same as a sighting-based or Umm
al-Qura Hijri date — expect a day or two of difference from those.

Two deliberate departures from the original:

1. **No `Date` objects.** The upstream library converts via JavaScript `Date`,
   which shifts a calendar day depending on the host timezone. A birthday is a
   calendar fact, not an instant, so every function takes and returns plain
   `{ year, month, day }` integers.

2. **A bug fix.** `hijriFromAJD` divided a 1-based day count by the 30-year
   cycle length, which pushed the last day of a cycle — 30 Zilhaj of year 29,
   e.g. 1439 — into the next cycle and decoded it as day 0 of the following
   year. There's a regression test for it.

The port is verified by a day-by-day round trip across 400 years (~146,000
days) in `src/lib/hijri/hijri.test.ts`.

### Sunset

The Islamic day begins at Maghrib, so an occasion that happened after sunset
falls on the *next* Hijri day. The add-event form asks, and the answer is
stored on the event as `afterSunset` so the conversion can always be redone:

- 14 Nov 2008, morning → **17 Zilqadah 1429**
- 14 Nov 2008, evening → **18 Zilqadah 1429**

The question is only asked when entering a Gregorian date. A Hijri date already
names the day, so there is nothing to disambiguate.

### Months that don't always exist

Two dates can go missing in a given year, and both are pulled back to the
nearest day rather than spilling into the next month:

- **29 February** is observed on the 28th in a common year.
- **30 Zilhaj** exists only in a Kabisa year — roughly 11 years in 30 — and is
  observed on the 29th otherwise.

Rows adjusted this way say so.

## Layout

```
src/
  lib/
    hijri/hijri.ts        Gregorian ↔ Hijri conversion (pure, tested)
    occasions/
      occurrence.ts       when an occasion next comes round, in either calendar
      derive.ts           filling in whichever date wasn't typed
      queries.ts          loading and projecting the list
      labels.ts           type names, emoji, "Turning 18" wording
    auth/                 scrypt passwords, database-backed sessions
    today.ts              today's date in the family's timezone
  app/
    page.tsx              upcoming list, grouped by month
    events/new/           add an occasion
    people/               family members and what's recorded for them
    actions/              server actions
prisma/schema.prisma      User, Session, Person, Event, EventPerson
```

Recurrence can't be pushed into SQL — a Hijri anniversary's next Gregorian date
depends on the conversion — so the list is loaded and projected in memory.
A family list is a few hundred rows, which is nothing.

## Deploying to Railway

1. Create a project, add a **Postgres** service.
2. Add this repo as a service.
3. Set variables on the app service:
   - `DATABASE_URL` = `${{ Postgres.DATABASE_URL }}`
   - `APP_TIME_ZONE` = the family's timezone, e.g. `Asia/Kolkata` (containers
     run in UTC, so without this an evening birthday shows up a day late)
4. Deploy. `railway.toml` runs `prisma migrate deploy` before the server starts.

Migrations run on boot, which is fine for a single replica. If this ever scales
out, move that to a Railway pre-deploy command so two instances can't migrate
at once.

## Accounts

Anyone with an account sees and edits the one shared family list. Passwords are
hashed with scrypt from Node's standard library — nothing native to compile —
and sessions are rows in the database behind an httpOnly cookie.
