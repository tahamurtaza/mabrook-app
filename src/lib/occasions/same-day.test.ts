import { describe, expect, it } from "vitest";
import type { UpcomingOccasion } from "./queries";
import { groupByDay, soonestDay } from "./same-day";

function on(title: string, month: number, day: number) {
  return {
    title,
    occurrence: { gregorian: { year: 2026, month, day } },
  } as UpcomingOccasion;
}

const titles = (list: UpcomingOccasion[]) => list.map((occasion) => occasion.title);

describe("soonestDay", () => {
  it("returns every occasion on the first day, not just the first row", () => {
    const list = [on("Abbas", 11, 14), on("Taha", 11, 14), on("Juzer", 12, 23)];
    expect(titles(soonestDay(list))).toEqual(["Abbas", "Taha"]);
  });

  it("returns one occasion when nothing shares its day", () => {
    expect(titles(soonestDay([on("Taha", 11, 14), on("Juzer", 12, 23)]))).toEqual(["Taha"]);
  });

  it("copes with an empty list", () => {
    expect(soonestDay([])).toEqual([]);
  });

  it("tells the same day of different months apart", () => {
    expect(titles(soonestDay([on("Taha", 11, 14), on("Juzer", 12, 14)]))).toEqual(["Taha"]);
  });
});

describe("groupByDay", () => {
  it("gathers same-day occasions and keeps the order", () => {
    const days = groupByDay([
      on("Abbas", 11, 14),
      on("Taha", 11, 14),
      on("Juzer", 12, 23),
      on("Ali", 12, 30),
      on("Murtaza", 12, 30),
      on("Fatema", 12, 30),
    ]);
    expect(days.map(titles)).toEqual([
      ["Abbas", "Taha"],
      ["Juzer"],
      ["Ali", "Murtaza", "Fatema"],
    ]);
  });
});
