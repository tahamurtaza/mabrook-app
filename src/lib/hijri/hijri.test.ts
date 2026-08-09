import { describe, expect, it } from "vitest";
import {
  addDays,
  ajdToGregorian,
  dayOfWeek,
  daysBetween,
  daysInHijriMonth,
  formatHijri,
  gregorianToAJD,
  gregorianToHijri,
  hijriFromAJD,
  hijriToAJD,
  hijriToGregorian,
  isKabisa,
  type GregorianDate,
} from "./hijri";

describe("gregorianToHijri", () => {
  it("matches the reference date from the project brief", () => {
    // 14 November 2008 is 17 Zilqadah 1429 in the Bohra calendar.
    const hijri = gregorianToHijri({ year: 2008, month: 11, day: 14 });
    expect(hijri).toEqual({ year: 1429, month: 10, day: 17 });
    expect(formatHijri(hijri)).toBe("17 Zilqadah 1429");
  });

  it("rolls to the next Hijri day when the event was after sunset", () => {
    const before = gregorianToHijri({ year: 2008, month: 11, day: 14 });
    const after = gregorianToHijri(
      { year: 2008, month: 11, day: 14 },
      { afterSunset: true },
    );
    expect(formatHijri(after)).toBe("18 Zilqadah 1429");
    expect(after.day).toBe(before.day + 1);
  });

  it("carries the sunset roll across a Hijri month boundary", () => {
    // Zilqadah is an even-indexed month, so it runs a full 30 days:
    // 27 Nov 2008 is 30 Zilqadah 1429, the last day of the month.
    const lastDay = gregorianToHijri({ year: 2008, month: 11, day: 27 });
    expect(formatHijri(lastDay)).toBe("30 Zilqadah 1429");

    const afterSunset = gregorianToHijri(
      { year: 2008, month: 11, day: 27 },
      { afterSunset: true },
    );
    expect(formatHijri(afterSunset)).toBe("1 Zilhaj 1429");
  });

  it("carries the sunset roll across a Hijri year boundary", () => {
    // 30 Zilhaj 1439 is the last day of a 30-year cycle, the case the
    // upstream library decodes as day 0 of the next year.
    const gregorian = hijriToGregorian({ year: 1439, month: 11, day: 30 });
    expect(formatHijri(gregorianToHijri(gregorian))).toBe("30 Zilhaj 1439");
    expect(formatHijri(gregorianToHijri(gregorian, { afterSunset: true }))).toBe(
      "1 Moharram 1440",
    );
  });
});

describe("hijriToGregorian", () => {
  it("inverts the reference date", () => {
    expect(hijriToGregorian({ year: 1429, month: 10, day: 17 })).toEqual({
      year: 2008,
      month: 11,
      day: 14,
    });
  });
});

describe("round trips", () => {
  it("survives 400 years of consecutive days, Gregorian -> Hijri -> Gregorian", () => {
    const start = gregorianToAJD({ year: 1800, month: 1, day: 1 });
    const end = gregorianToAJD({ year: 2200, month: 1, day: 1 });

    for (let ajd = start; ajd <= end; ajd += 1) {
      const gregorian = ajdToGregorian(ajd);
      const hijri = hijriFromAJD(ajd);
      expect(hijriToGregorian(hijri)).toEqual(gregorian);
      expect(gregorianToHijri(gregorian)).toEqual(hijri);
    }
  });

  it("keeps AJD and Hijri in lockstep across a full 30-year cycle", () => {
    for (let year = 1420; year < 1450; year += 1) {
      for (let month = 0; month < 12; month += 1) {
        const days = daysInHijriMonth(year, month);
        for (let day = 1; day <= days; day += 1) {
          const date = { year, month, day };
          expect(hijriFromAJD(hijriToAJD(date))).toEqual(date);
        }
      }
    }
  });

  it("advances exactly one day per AJD step", () => {
    let previous = hijriToAJD({ year: 1400, month: 0, day: 1 });
    for (let i = 1; i < 20000; i += 1) {
      const hijri = hijriFromAJD(previous + 1);
      const ajd = hijriToAJD(hijri);
      expect(ajd - previous).toBe(1);
      previous = ajd;
    }
  });
});

describe("Kabisa years", () => {
  it("gives Zilhaj 30 days only in a Kabisa year", () => {
    expect(isKabisa(1442)).toBe(true); // 1442 % 30 === 2
    expect(isKabisa(1443)).toBe(false);
    expect(daysInHijriMonth(1442, 11)).toBe(30);
    expect(daysInHijriMonth(1443, 11)).toBe(29);
  });

  it("alternates 30 and 29 days for the first eleven months", () => {
    for (let month = 0; month < 11; month += 1) {
      expect(daysInHijriMonth(1445, month)).toBe(month % 2 === 0 ? 30 : 29);
    }
  });

  it("totals 354 days in a common year and 355 in a Kabisa year", () => {
    const total = (year: number) =>
      Array.from({ length: 12 }, (_, m) => daysInHijriMonth(year, m)).reduce(
        (a, b) => a + b,
        0,
      );
    expect(total(1443)).toBe(354);
    expect(total(1442)).toBe(355);
  });
});

describe("Gregorian helpers", () => {
  it("handles leap days", () => {
    expect(addDays({ year: 2024, month: 2, day: 28 }, 1)).toEqual({
      year: 2024,
      month: 2,
      day: 29,
    });
    expect(addDays({ year: 2023, month: 2, day: 28 }, 1)).toEqual({
      year: 2023,
      month: 3,
      day: 1,
    });
  });

  it("crosses year boundaries", () => {
    expect(addDays({ year: 2025, month: 12, day: 31 }, 1)).toEqual({
      year: 2026,
      month: 1,
      day: 1,
    });
  });

  it("counts days between dates with sign", () => {
    const a: GregorianDate = { year: 2026, month: 1, day: 1 };
    const b: GregorianDate = { year: 2026, month: 3, day: 1 };
    expect(daysBetween(a, b)).toBe(59);
    expect(daysBetween(b, a)).toBe(-59);
  });

  it("gets the day of week", () => {
    // 9 August 2026 is a Sunday; 14 November 2008 was a Friday.
    expect(dayOfWeek({ year: 2026, month: 8, day: 9 })).toBe(0);
    expect(dayOfWeek({ year: 2008, month: 11, day: 14 })).toBe(5);
  });

  it("is unaffected by the host timezone", () => {
    const original = process.env.TZ;
    const results = ["UTC", "Pacific/Kiritimati", "Pacific/Midway"].map((tz) => {
      process.env.TZ = tz;
      return formatHijri(gregorianToHijri({ year: 2008, month: 11, day: 14 }));
    });
    process.env.TZ = original;
    expect(new Set(results).size).toBe(1);
  });
});
