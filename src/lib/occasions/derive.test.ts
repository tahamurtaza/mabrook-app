import { describe, expect, it } from "vitest";
import { formatGregorian, formatHijri } from "@/lib/hijri/hijri";
import { deriveDates } from "./derive";

describe("deriveDates", () => {
  it("derives the Hijri date from a Gregorian one entered before sunset", () => {
    const result = deriveDates({
      enteredCalendar: "GREGORIAN",
      gregorianDate: "2008-11-14",
      afterSunset: false,
    });
    expect(formatHijri(result.hijri)).toBe("17 Zilqadah 1429");
    expect(result.afterSunset).toBe(false);
  });

  it("rolls the Hijri date forward when entered as after sunset", () => {
    const result = deriveDates({
      enteredCalendar: "GREGORIAN",
      gregorianDate: "2008-11-14",
      afterSunset: true,
    });
    expect(formatHijri(result.hijri)).toBe("18 Zilqadah 1429");
    expect(formatGregorian(result.gregorian)).toBe("14 Nov 2008");
    expect(result.afterSunset).toBe(true);
  });

  it("treats a missing sunset answer as before sunset", () => {
    const result = deriveDates({
      enteredCalendar: "GREGORIAN",
      gregorianDate: "2008-11-14",
    });
    expect(formatHijri(result.hijri)).toBe("17 Zilqadah 1429");
  });

  it("keeps the Gregorian date unchanged by the sunset answer", () => {
    // Only the Hijri side moves — the occasion still happened on 14 November.
    const before = deriveDates({
      enteredCalendar: "GREGORIAN",
      gregorianDate: "2008-11-14",
      afterSunset: false,
    });
    const after = deriveDates({
      enteredCalendar: "GREGORIAN",
      gregorianDate: "2008-11-14",
      afterSunset: true,
    });
    expect(after.gregorian).toEqual(before.gregorian);
    expect(after.hijri.day).toBe(before.hijri.day + 1);
  });

  it("derives the Gregorian date from a Hijri one", () => {
    const result = deriveDates({
      enteredCalendar: "HIJRI",
      hijri: { year: 1429, month: 10, day: 17 },
    });
    expect(formatGregorian(result.gregorian)).toBe("14 Nov 2008");
    expect(result.afterSunset).toBe(false);
  });

  it("moves the Gregorian date back for the evening part of a Hijri day", () => {
    // 17 Zilqadah 1429 began at Maghrib on 13 Nov 2008. Something at 21:00 that
    // night is still 17 Zilqadah, but its Gregorian date is the 13th.
    const result = deriveDates({
      enteredCalendar: "HIJRI",
      hijri: { year: 1429, month: 10, day: 17 },
      afterSunset: true,
    });
    expect(formatGregorian(result.gregorian)).toBe("13 Nov 2008");
    expect(formatHijri(result.hijri)).toBe("17 Zilqadah 1429");
    expect(result.afterSunset).toBe(true);
  });

  it("agrees with the Gregorian entry of the same evening", () => {
    // Entered either way round, 21:00 on 13 Nov 2008 is the same occasion.
    const fromHijri = deriveDates({
      enteredCalendar: "HIJRI",
      hijri: { year: 1429, month: 10, day: 17 },
      afterSunset: true,
    });
    const fromGregorian = deriveDates({
      enteredCalendar: "GREGORIAN",
      gregorianDate: "2008-11-13",
      afterSunset: true,
    });
    expect(fromHijri).toEqual(fromGregorian);
  });

  it("handles the evening of the first day of a Hijri year", () => {
    // The night of 1 Moharram 1446 fell on the Gregorian evening of 6 Jul 2024.
    const day = deriveDates({
      enteredCalendar: "HIJRI",
      hijri: { year: 1446, month: 0, day: 1 },
    });
    const night = deriveDates({
      enteredCalendar: "HIJRI",
      hijri: { year: 1446, month: 0, day: 1 },
      afterSunset: true,
    });
    expect(night.hijri).toEqual(day.hijri);
    expect(night.gregorian.day).not.toBe(day.gregorian.day);
    expect(formatGregorian(night.gregorian)).toBe(
      formatGregorian({ ...day.gregorian, day: day.gregorian.day - 1 }),
    );
  });

  it("round-trips a Gregorian entry back through a Hijri entry", () => {
    const first = deriveDates({
      enteredCalendar: "GREGORIAN",
      gregorianDate: "2015-12-05",
    });
    const second = deriveDates({
      enteredCalendar: "HIJRI",
      hijri: first.hijri,
    });
    expect(second.gregorian).toEqual(first.gregorian);
  });

  it("rejects an entry with no date", () => {
    expect(() => deriveDates({ enteredCalendar: "GREGORIAN" })).toThrow();
    expect(() => deriveDates({ enteredCalendar: "HIJRI" })).toThrow();
  });
});
