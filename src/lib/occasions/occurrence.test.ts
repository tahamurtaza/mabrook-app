import { describe, expect, it } from "vitest";
import { formatGregorian, formatHijri, gregorianToHijri } from "@/lib/hijri/hijri";
import {
  describeDaysAway,
  nextOccurrence,
  occurrencesBetween,
  type RecurringOccasion,
} from "./occurrence";

/** Build an occasion from a Gregorian date, deriving its Hijri date. */
function occasion(
  gregorian: { year: number; month: number; day: number },
  overrides: Partial<RecurringOccasion> = {},
): RecurringOccasion {
  const hijri = gregorianToHijri(gregorian, {
    afterSunset: false,
  });
  return {
    observedCalendar: "GREGORIAN",
    gregorianYear: gregorian.year,
    gregorianMonth: gregorian.month,
    gregorianDay: gregorian.day,
    hijriYear: hijri.year,
    hijriMonth: hijri.month,
    hijriDay: hijri.day,
    recurring: true,
    ...overrides,
  };
}

// The reference birthday from the brief: 14 Nov 2008 / 17 Zilqadah 1429.
const BIRTHDAY = { year: 2008, month: 11, day: 14 };

describe("Gregorian-observed occasions", () => {
  it("finds the birthday later this year", () => {
    const result = nextOccurrence(occasion(BIRTHDAY), {
      year: 2026,
      month: 8,
      day: 9,
    });
    expect(formatGregorian(result.gregorian)).toBe("14 Nov 2026");
    expect(result.years.gregorian).toBe(18);
    expect(result.daysAway).toBe(97);
  });

  it("rolls to next year once the birthday has passed", () => {
    const result = nextOccurrence(occasion(BIRTHDAY), {
      year: 2026,
      month: 11,
      day: 15,
    });
    expect(formatGregorian(result.gregorian)).toBe("14 Nov 2027");
    expect(result.years.gregorian).toBe(19);
  });

  it("counts the birthday itself as today, not as passed", () => {
    const result = nextOccurrence(occasion(BIRTHDAY), {
      year: 2026,
      month: 11,
      day: 14,
    });
    expect(result.daysAway).toBe(0);
    expect(result.years.gregorian).toBe(18);
    expect(describeDaysAway(result.daysAway)).toBe("Today");
  });

  it("also reports the Hijri day the occasion lands on", () => {
    const result = nextOccurrence(occasion(BIRTHDAY), {
      year: 2026,
      month: 8,
      day: 9,
    });
    // A fixed Gregorian date drifts through the Hijri calendar year to year.
    expect(formatHijri(result.hijri)).toBe("5 Jumada II 1448");
  });

  it("observes 29 February on the 28th in a common year", () => {
    const leapling = occasion({ year: 2004, month: 2, day: 29 });

    const commonYear = nextOccurrence(leapling, {
      year: 2026,
      month: 1,
      day: 1,
    });
    expect(formatGregorian(commonYear.gregorian)).toBe("28 Feb 2026");
    expect(commonYear.adjusted).toBe(true);

    const leapYear = nextOccurrence(leapling, { year: 2028, month: 1, day: 1 });
    expect(formatGregorian(leapYear.gregorian)).toBe("29 Feb 2028");
    expect(leapYear.adjusted).toBe(false);
  });
});

describe("Hijri-observed occasions", () => {
  const hijriBirthday = occasion(BIRTHDAY, { observedCalendar: "HIJRI" });

  it("returns on the same Hijri day, not the same Gregorian day", () => {
    const result = nextOccurrence(hijriBirthday, {
      year: 2026,
      month: 8,
      day: 9,
    });
    expect(formatHijri(result.hijri)).toBe("17 Zilqadah 1448");
    expect(result.years.hijri).toBe(19);
    // A Hijri-anchored turn counts only in Hijri years.
    expect(result.years.gregorian).toBeNull();
  });

  it("drifts about eleven days earlier each Gregorian year", () => {
    const first = nextOccurrence(hijriBirthday, { year: 2026, month: 1, day: 1 });
    const second = nextOccurrence(hijriBirthday, {
      year: first.gregorian.year + 1,
      month: 1,
      day: 1,
    });
    // Same Hijri day, one Gregorian year later, ~11 days earlier.
    expect(second.hijri.day).toBe(first.hijri.day);
    expect(second.hijri.month).toBe(first.hijri.month);
    const drift =
      (first.gregorian.month - second.gregorian.month) * 30 +
      (first.gregorian.day - second.gregorian.day);
    expect(drift).toBeGreaterThanOrEqual(10);
    expect(drift).toBeLessThanOrEqual(12);
  });

  it("ages by Hijri years, which outpace Gregorian years", () => {
    const gregorianAge = nextOccurrence(occasion(BIRTHDAY), {
      year: 2026,
      month: 8,
      day: 9,
    }).years.gregorian;
    const hijriAge = nextOccurrence(hijriBirthday, {
      year: 2026,
      month: 8,
      day: 9,
    }).years.hijri;
    expect(hijriAge).toBe((gregorianAge ?? 0) + 1);
  });

  it("can come round twice in one Gregorian year", () => {
    // 1 Moharram drifts earlier each Gregorian year, so it eventually lands
    // twice in one: 1463 AH and 1464 AH both begin during 2041.
    const newYear = occasion(BIRTHDAY, { observedCalendar: "HIJRI" });
    newYear.hijriMonth = 0;
    newYear.hijriDay = 1;

    const all = occurrencesBetween(
      newYear,
      { year: 2041, month: 1, day: 1 },
      { year: 2041, month: 12, day: 31 },
    );
    expect(all.length).toBe(2);
    expect(all[0].gregorian.year).toBe(2041);
    expect(all[1].gregorian.year).toBe(2041);
    expect(all[1].hijri.year).toBe(all[0].hijri.year + 1);
  });

  it("observes 30 Zilhaj on the 29th outside a Kabisa year", () => {
    const zilhaj = occasion(BIRTHDAY, { observedCalendar: "HIJRI" });
    zilhaj.hijriMonth = 11;
    zilhaj.hijriDay = 30;
    zilhaj.hijriYear = 1442; // a Kabisa year, so the 30th existed

    // Search from a point that lands the next occurrence in 1449, not Kabisa.
    const result = nextOccurrence(zilhaj, { year: 2027, month: 8, day: 1 });
    expect(result.hijri.month).toBe(11);
    expect(result.hijri.day).toBe(29);
    expect(result.adjusted).toBe(true);
  });
});

describe("occasions observed by both calendars", () => {
  const both = occasion(BIRTHDAY, { observedCalendar: "BOTH" });

  it("comes round twice a year", () => {
    const all = occurrencesBetween(
      both,
      { year: 2026, month: 8, day: 9 },
      { year: 2027, month: 8, day: 8 },
    );
    expect(all.length).toBe(2);
  });

  it("keeps the Gregorian date fixed and lets the Hijri one drift", () => {
    const all = occurrencesBetween(
      both,
      { year: 2026, month: 8, day: 9 },
      { year: 2027, month: 8, day: 8 },
    );

    const gregorianTurn = all.find((o) => o.anchor === "GREGORIAN")!;
    const hijriTurn = all.find((o) => o.anchor === "HIJRI")!;

    expect(formatGregorian(gregorianTurn.gregorian)).toBe("14 Nov 2026");
    expect(formatHijri(hijriTurn.hijri)).toBe("17 Zilqadah 1448");
  });

  it("reports the right age for each anchor", () => {
    const all = occurrencesBetween(
      both,
      { year: 2026, month: 8, day: 9 },
      { year: 2027, month: 8, day: 8 },
    );

    const gregorianTurn = all.find((o) => o.anchor === "GREGORIAN")!;
    const hijriTurn = all.find((o) => o.anchor === "HIJRI")!;

    expect(gregorianTurn.years.gregorian).toBe(18);
    expect(hijriTurn.years.hijri).toBe(19);
  });

  it("nextOccurrence returns whichever anniversary is sooner", () => {
    const soonest = nextOccurrence(both, { year: 2026, month: 8, day: 9 });
    const all = occurrencesBetween(
      both,
      { year: 2026, month: 8, day: 9 },
      { year: 2027, month: 8, day: 8 },
    );
    expect(soonest.daysAway).toBe(Math.min(...all.map((o) => o.daysAway)));
  });

  it("sorts the merged list soonest first", () => {
    const all = occurrencesBetween(
      both,
      { year: 2026, month: 1, day: 1 },
      { year: 2029, month: 12, day: 31 },
    );
    const days = all.map((o) => o.daysAway);
    expect(days).toEqual([...days].sort((a, b) => a - b));
  });

  it("shows one row, not two, when the two anniversaries coincide", () => {
    // The Gregorian and Hijri anniversaries realign roughly every 33 years.
    // Find the year they collide and check it reads as a single occurrence.
    const all = occurrencesBetween(
      both,
      { year: 2008, month: 11, day: 14 },
      { year: 2060, month: 12, day: 31 },
    );

    const keys = all.map(
      (o) => `${o.gregorian.year}-${o.gregorian.month}-${o.gregorian.day}`,
    );
    expect(new Set(keys).size).toBe(keys.length);

    const coincidences = all.filter((o) => o.anchor === "BOTH");
    expect(coincidences.length).toBeGreaterThan(0);
    for (const hit of coincidences) {
      expect(hit.years.gregorian).not.toBeNull();
      expect(hit.years.hijri).not.toBeNull();
    }
  });

  it("still yields both anchors when only one is in the window", () => {
    // A two-week window that contains the Gregorian turn but not the Hijri one.
    const all = occurrencesBetween(
      both,
      { year: 2026, month: 11, day: 10 },
      { year: 2026, month: 11, day: 20 },
    );
    expect(all.length).toBe(1);
    expect(all[0].anchor).toBe("GREGORIAN");
  });
});

describe("non-recurring occasions", () => {
  it("returns its single date and no age", () => {
    const moved = occasion({ year: 2024, month: 6, day: 1 }, { recurring: false });
    const result = nextOccurrence(moved, { year: 2026, month: 8, day: 9 });
    expect(formatGregorian(result.gregorian)).toBe("1 Jun 2024");
    expect(result.daysAway).toBeLessThan(0);
    expect(result.years.gregorian).toBeNull();
  });
});

describe("occurrencesBetween", () => {
  it("lists one Gregorian birthday per year in the window", () => {
    const all = occurrencesBetween(
      occasion(BIRTHDAY),
      { year: 2026, month: 1, day: 1 },
      { year: 2028, month: 12, day: 31 },
    );
    expect(all.map((o) => o.gregorian.year)).toEqual([2026, 2027, 2028]);
  });

  it("returns nothing for an inverted window", () => {
    const all = occurrencesBetween(
      occasion(BIRTHDAY),
      { year: 2026, month: 12, day: 31 },
      { year: 2026, month: 1, day: 1 },
    );
    expect(all).toEqual([]);
  });

  it("keeps results inside the window", () => {
    const all = occurrencesBetween(
      occasion(BIRTHDAY),
      { year: 2026, month: 1, day: 1 },
      { year: 2026, month: 6, day: 30 },
    );
    expect(all).toEqual([]);
  });
});

describe("describeDaysAway", () => {
  it("reads naturally", () => {
    expect(describeDaysAway(0)).toBe("Today");
    expect(describeDaysAway(1)).toBe("Tomorrow");
    expect(describeDaysAway(12)).toBe("In 12 days");
    expect(describeDaysAway(-1)).toBe("Yesterday");
    expect(describeDaysAway(-3)).toBe("3 days ago");
  });
});
