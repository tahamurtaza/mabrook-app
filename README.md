# Mabrook

A shared calendar of birthdays, anniversaries and milestones, kept in both the
Gregorian and the Dawoodi Bohra Hijri calendars.

Every occasion stores an absolute date in *both* calendars, and records which
one the group counts the anniversary in. So one person's birthday can come
round every 14 November while their brother's comes round every 17 Zilqadah —
and both appear, correctly ordered, in one upcoming list.

An occasion can also be observed by **both**, in which case it comes round twice
a year — once on each calendar.

Occasions live in **groups** — a family, a circle of friends, a school year.
You join a group through an invite link, and see a merged calendar across every
group you're in, each row labelled with where it came from.

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
production uses Neon's Postgres and nothing outside `scripts/` imports it.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Generate the Prisma client and build |
| `npm test` | Unit tests for the calendar maths |
| `npm run test:smoke` | End-to-end checks, including the group boundary (needs a running server) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:local` | Local Postgres (PGlite), foreground |
| `npm run db:migrate` | Create a migration from schema changes |
| `npm run db:deploy` | Apply pending migrations |
| `npm run db:seed` | Reset and reseed demo data |
| `npm run db:studio` | Prisma Studio |

## Groups, invites and who can see what

A group owns its calendar and its own roster of people. Rosters are
deliberately **per-group**: the same human in your family group and in a
friends group is two rows, so no group can ever enumerate another's members.

Joining is by **shareable link**. The `createInvite` action mints a token from
`randomBytes(32)` — the token *is* the secret in the URL, so it's generated
from a CSPRNG rather than a guessable cuid. Links are multi-use on purpose (one
link in a family chat lets everyone join) and stop working after 7 days or when
revoked. Roles are `OWNER`, `ADMIN` and `MEMBER`; only the first two can invite,
remove members or revoke links.

Every read and write of an occasion or a person goes through
[`src/lib/groups/access.ts`](src/lib/groups/access.ts). Nothing else builds a
`groupId` filter by hand — if a query can't name the group it's allowed to
touch, it doesn't run. Concretely:

- `?group=` on the calendar is *checked*, not trusted, so a guessed id gets you
  nothing.
- A group page you aren't in returns 404, not 403 — "no such group" and "not
  your group" are deliberately indistinguishable.
- An occasion can be shared with several groups at once. It is saved as one
  copy per group, after checking membership of every group named, and people
  are matched by name against each group's own roster (or added to it) — no
  person row is ever attached across a group boundary. The merged views fold
  the copies back into one row labelled with all its groups.
- Deleting an occasion looks the row up and checks membership first; the id
  alone says nothing about who may delete it.
- `?next=` after login only accepts same-site paths, so an invite-shaped link
  can't bounce someone off-site.

`npm run test:smoke` asserts all of the above against a running server.

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

The same question is asked, the other way round, when entering a Hijri date.
A Hijri day runs from Maghrib to Maghrib, so it covers the evening of one
Gregorian date and the daylight of the next. Something on the night of a Hijri
date, before midnight, has the *earlier* Gregorian date — and is stored as that
date with `afterSunset` set, which converts straight back to the Hijri date
entered:

- 17 Zilqadah 1429, daytime or after midnight → **14 Nov 2008**
- 17 Zilqadah 1429, the night before, until midnight → **13 Nov 2008**, evening

### Your own dates

A person's own dates (`PersonalDate`) belong to their account, not to a group.
They're asked for at signup, on `/welcome`, and managed on `/settings`. A date is
private until its owner shares it: on the invite page when joining, where
nothing is ticked by default, or per group in Settings. Sharing puts a copy on that
group's calendar as an `Event` linked back through `personalDateId`, so
un-sharing, deleting the date or leaving the group all remove the copy, and
editing the date updates every copy.

### Someone already on the list

A person can be added to a group's list by name before they ever join, which
would otherwise leave them on it twice. So after joining, anyone who might
already be there is asked "Is one of these you?" (`/groups/[id]/claim`), matched
by a similar name or a shared birthday in
[`src/lib/people/matching.ts`](src/lib/people/matching.ts). Nothing merges without
that answer. Saying yes links their account to the existing entry and takes
effect at once; the entry's old name is kept in `claimedName`, and occasions
joined to one of their own dates are marked `adopted`, so an owner, an admin or
they themselves can undo it exactly. Owners and admins can also merge two
entries by hand.

### Occasions on the same day

Two occasions landing on one day are never reduced to a single row. Anything
answering "what's next?" uses `soonestDay` in
[`src/lib/occasions/same-day.ts`](src/lib/occasions/same-day.ts), which returns
the whole day, and lists, calendar cells and the day panel mark the clash in
plum, a colour kept for this alone.

### Observing both calendars

`observedCalendar` can be `GREGORIAN`, `HIJRI` or `BOTH`. With `BOTH` the
occasion has two anchors and appears twice a year. Taha's birthday, in the seed:

| Falls on | Hijri | Anchor | Age |
| --- | --- | --- | --- |
| 14 Nov 2026 | 5 Jumada II 1448 | Gregorian | Turning 18 |
| 22 Apr 2027 | 17 Zilqadah 1448 | Hijri | Turning 19 |

The two ages differ on purpose: a Hijri year is ~11 days shorter, so the Hijri
count runs ahead. Each row says which anniversary it is and colours that
calendar's date.

The two anchors realign roughly every 33 years and land on the same day. When
that happens `mergeSameDay` folds them into one row — anchor `BOTH`, both ages
shown — because otherwise the list would print the same birthday twice on the
same date and read as a bug. There's a test covering it.

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
    groups/access.ts      membership checks — every scoped query goes through here
    occasions/
      occurrence.ts       when an occasion next comes round, in either calendar
      derive.ts           filling in whichever date wasn't typed
      queries.ts          loading and projecting the list
      labels.ts           type names, emoji, "Turning 18" wording
    auth/                 scrypt passwords, database-backed sessions
    today.ts              today's date in the family's timezone
  app/
    page.tsx              merged upcoming list, grouped by month, filterable
    groups/               your groups; members and invite links
    invite/[token]/       redeeming a join link
    events/new/           add an occasion
    people/               rosters, per group
    actions/              server actions
prisma/schema.prisma      User, Session, Group, GroupMember, Invite,
                          Person, Event, EventPerson
```

Recurrence can't be pushed into SQL — a Hijri anniversary's next Gregorian date
depends on the conversion — so the list is loaded and projected in memory.
A family list is a few hundred rows, which is nothing.

## Deploying to Vercel

The site runs on Vercel and the database on Neon, added from inside Vercel.

1. Push to GitHub.
2. On vercel.com: **Add New → Project**, import this repo. The defaults are
   right; there is nothing to change on the build screen.
3. In the project, open **Storage → Create Database → Neon**. Choose the
   Singapore region (`aws-ap-southeast-1`) to sit next to the site, and connect
   it to the Production and Preview environments with **a database branch for
   each preview** turned on. That sets `DATABASE_URL` (pooled, used by the app)
   and `DATABASE_URL_UNPOOLED` (direct, used by migrations).
4. Under **Settings → Environment Variables**, add `APP_TIME_ZONE`, e.g.
   `Asia/Kolkata`. Optional but wanted: servers run in UTC, so without it an
   evening occasion shows up a day late.
5. **Deployments → Redeploy**, so the build picks up the new variables.

Vercel runs the `vercel-build` script rather than `build`. It applies pending
migrations with `prisma migrate deploy` before `next build`, so the schema is
in place before the new version goes live. That is why previews need their own
database branch: without one, a preview of a branch with a new migration would
apply it to the production database.

`vercel.json` pins the site's functions to Singapore (`sin1`), the same region
as the database. Every page queries it, so a site in the US talking to a
database in Asia would be slow on every click.

There is no session secret to set — sessions are database rows keyed by a
random token, so there is no signed payload to protect.

> **Never run `npm run db:seed` against production.** It is written to be
> re-runnable locally, which means it *deletes every group, person, occasion and
> user* before inserting the demo data. There is nothing to seed in production:
> sign up through the app, create a group, and share an invite link.

`npm run build` does not need a database — the client connects on first query,
not on import — so CI can typecheck and build without one.

## Accounts

Passwords are hashed with scrypt from Node's standard library — nothing native
to compile — and sessions are rows in the database behind an httpOnly cookie.
A new account starts with no groups: you either create one or open an invite
link someone sent you.
