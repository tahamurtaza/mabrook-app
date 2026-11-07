import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  type EventType,
  type GroupType,
} from "../src/generated/prisma";
import { hashPassword } from "../src/lib/auth/password";
import { gregorianToHijri } from "../src/lib/hijri/hijri";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

interface SeedEvent {
  title: string;
  type: EventType;
  date: [number, number, number];
  afterSunset?: boolean;
  observedCalendar?: "GREGORIAN" | "HIJRI" | "BOTH";
  recurring?: boolean;
  people: string[];
  notes?: string;
}

interface SeedGroup {
  name: string;
  type: GroupType;
  people: string[];
  events: SeedEvent[];
}

const FAMILY_EVENTS: SeedEvent[] = [
  {
    // The worked example from the brief: 17 Zilqadah 1429.
    // Observed by both, so it shows up twice a year — 14 November and
    // 17 Zilqadah — which is what dual observance looks like in the list.
    title: "Taha's birthday",
    type: "BIRTHDAY",
    date: [2008, 11, 14],
    observedCalendar: "BOTH",
    people: ["Taha"],
  },
  {
    title: "Murtaza's birthday",
    type: "BIRTHDAY",
    date: [1996, 3, 22],
    observedCalendar: "HIJRI",
    people: ["Murtaza"],
    notes: "Murtaza counts his birthday by the Hijri date.",
  },
  {
    title: "Fatema's birthday",
    type: "BIRTHDAY",
    date: [2011, 7, 3],
    afterSunset: true,
    people: ["Fatema"],
    notes: "Born just after Maghrib, so the Hijri date is the following day.",
  },
  {
    title: "Zainab & Husain's anniversary",
    type: "ANNIVERSARY",
    date: [2015, 12, 5],
    observedCalendar: "HIJRI",
    people: ["Zainab", "Husain"],
  },
  {
    title: "Husain's new office",
    type: "NEW_OFFICE",
    date: [2024, 2, 19],
    recurring: false,
    people: ["Husain"],
    notes: "Opened the new office in Bhendi Bazaar.",
  },
  {
    title: "Zainab started school",
    type: "SCHOOL_START",
    date: [2021, 6, 14],
    recurring: false,
    people: ["Zainab"],
  },
];

const GROUPS: SeedGroup[] = [
  {
    name: "The Bombaywalas",
    type: "FAMILY",
    people: ["Taha", "Fatema", "Murtaza", "Zainab", "Husain"],
    events: FAMILY_EVENTS,
  },
  {
    // A second group, so the merged view and the group filter have something
    // to actually merge and filter.
    name: "Sunday cricket",
    type: "FRIENDS",
    people: ["Ali", "Juzer", "Taha"],
    events: [
      {
        title: "Ali's birthday",
        type: "BIRTHDAY",
        date: [1994, 9, 30],
        people: ["Ali"],
      },
      {
        title: "Juzer's birthday",
        type: "BIRTHDAY",
        date: [1993, 1, 8],
        observedCalendar: "HIJRI",
        people: ["Juzer"],
      },
      {
        title: "Juzer's new job",
        type: "NEW_JOB",
        date: [2025, 4, 2],
        recurring: false,
        people: ["Juzer"],
      },
    ],
  },
];

async function main() {
  // Idempotent: wipe the seeded rows so `db seed` can be re-run freely.
  // Groups cascade to their people, events and invites.
  await prisma.group.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      name: "Demo Bombaywala",
      firstName: "Demo",
      lastName: "Bombaywala",
      email: "demo@mabrook.local",
      passwordHash: await hashPassword("mabrook123"),
      // The demo login is for looking around, not for being onboarded.
      tourCompletedAt: new Date(),
    },
  });

  let personCount = 0;
  let eventCount = 0;

  for (const seedGroup of GROUPS) {
    const group = await prisma.group.create({
      data: {
        name: seedGroup.name,
        type: seedGroup.type,
        members: { create: { userId: user.id, role: "OWNER" } },
      },
    });

    // Rosters are per-group, so "Taha" in both groups is deliberately two rows.
    const people = new Map<string, string>();
    for (const name of seedGroup.people) {
      const person = await prisma.person.create({
        data: { name, groupId: group.id },
      });
      people.set(name, person.id);
      personCount += 1;
    }

    for (const event of seedGroup.events) {
      const [year, month, day] = event.date;
      const gregorian = { year, month, day };
      const hijri = gregorianToHijri(gregorian, {
        afterSunset: event.afterSunset ?? false,
      });

      await prisma.event.create({
        data: {
          groupId: group.id,
          title: event.title,
          type: event.type,
          notes: event.notes ?? null,
          observedCalendar: event.observedCalendar ?? "GREGORIAN",
          enteredCalendar: "GREGORIAN",
          gregorianYear: year,
          gregorianMonth: month,
          gregorianDay: day,
          hijriYear: hijri.year,
          hijriMonth: hijri.month,
          hijriDay: hijri.day,
          afterSunset: event.afterSunset ?? false,
          recurring: event.recurring ?? true,
          createdById: user.id,
          people: {
            create: event.people.map((name) => ({ personId: people.get(name)! })),
          },
        },
      });
      eventCount += 1;
    }
  }

  console.log(
    `Seeded ${GROUPS.length} groups, ${personCount} people and ${eventCount} occasions.\n` +
      `Sign in with demo@mabrook.local / mabrook123`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
