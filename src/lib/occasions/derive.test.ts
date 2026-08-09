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

  it("ignores a sunset answer when the Hijri date is the one entered", () => {
    const result = deriveDates({
      enteredCalendar: "HIJRI",
      hijri: { year: 1429, month: 10, day: 17 },
      afterSunset: true,
    });
    expect(result.afterSunset).toBe(false);
    expect(formatGregorian(result.gregorian)).toBe("14 Nov 2008");
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
