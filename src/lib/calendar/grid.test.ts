import { describe, expect, it } from "vitest";
import { gregorianToHijri, hijriToGregorian } from "@/lib/hijri/hijri";
import { monthContaining, monthGrid, shiftMonth, yearBounds } from "./grid";

describe("monthGrid", () => {
  it("frames a Gregorian month as whole weeks starting on Sunday", () => {
    // 1 November 2026 is a Sunday, so there are no leading days.
    const grid = monthGrid({ mode: "gregorian", year: 2026, month: 11 });
    expect(grid.cells.length % 7).toBe(0);
    expect(grid.cells[0].iso).toBe("2026-11-01");
    expect(grid.cells.filter((cell) => cell.inMonth)).toHaveLength(30);
  });

  it("pads the first week with the previous month", () => {
    // 1 December 2026 is a Tuesday.
    const grid = monthGrid({ mode: "gregorian", year: 2026, month: 12 });
    expect(grid.cells[0].iso).toBe("2026-11-29");
    expect(grid.cells[0].inMonth).toBe(false);
    expect(grid.cells[2].iso).toBe("2026-12-01");
    expect(grid.cells[2].weekday).toBe(2);
  });

  it("frames a Hijri month from its own first day", () => {
    const grid = monthGrid({ mode: "hijri", year: 1429, month: 10 });
    const inMonth = grid.cells.filter((cell) => cell.inMonth);
    expect(inMonth[0].hijri).toEqual({ year: 1429, month: 10, day: 1 });
    expect(inMonth).toHaveLength(30);
    // The worked example: 14 Nov 2008 is 17 Zilqadah 1429.
    expect(inMonth[16].iso).toBe("2008-11-14");
  });

  it("gives every cell the same Hijri date as the shared conversion", () => {
    const grid = monthGrid({ mode: "gregorian", year: 2027, month: 3 });
    for (const cell of grid.cells) {
      expect(cell.hijri).toEqual(gregorianToHijri(cell.gregorian));
    }
  });

  it("counts the other calendar's month changes across the grid", () => {
    const grid = monthGrid({ mode: "gregorian", year: 2026, month: 11 });
    const turn = grid.cells.findIndex((cell) => cell.otherMonthIndex === 1);
    expect(turn).toBeGreaterThan(0);
    expect(grid.cells[turn].hijri.day).toBe(1);
  });

  it("captions the Hijri months a Gregorian month spans", () => {
    expect(monthGrid({ mode: "gregorian", year: 2026, month: 11 }).span).toBe(
      "Jumada I – Jumada II 1448",
    );
  });
});

describe("navigation helpers", () => {
  it("wraps across year ends in both calendars", () => {
    expect(shiftMonth({ mode: "gregorian", year: 2026, month: 12 }, 1)).toEqual({
      mode: "gregorian",
      year: 2027,
      month: 1,
    });
    expect(shiftMonth({ mode: "hijri", year: 1448, month: 0 }, -1)).toEqual({
      mode: "hijri",
      year: 1447,
      month: 11,
    });
  });

  it("finds the Hijri month containing a Gregorian day", () => {
    expect(monthContaining("hijri", { year: 2008, month: 11, day: 14 })).toEqual({
      mode: "hijri",
      year: 1429,
      month: 10,
    });
  });

  it("bounds a Hijri year by its first and last day", () => {
    const { first, last } = yearBounds("hijri", 1448);
    expect(first).toEqual(hijriToGregorian({ year: 1448, month: 0, day: 1 }));
    expect(gregorianToHijri(last)).toMatchObject({ year: 1448, month: 11 });
  });
});
