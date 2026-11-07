import { describe, expect, it } from "vitest";
import { findMatches, namesAlike, sameOccasion, type DatedOccasion } from "./matching";

function date(type: DatedOccasion["type"], month: number, day: number, hijriMonth = 0, hijriDay = 1) {
  return { type, gregorianMonth: month, gregorianDay: day, hijriMonth, hijriDay };
}

describe("namesAlike", () => {
  it("treats spellings of one name as alike", () => {
    expect(namesAlike("Hussain", "Husain")).toBe(true);
    expect(namesAlike("Hossein", "Hussain")).toBe(true);
    expect(namesAlike("Fatema", "fatima")).toBe(true);
  });

  it("matches a full name against a first name on its own", () => {
    expect(namesAlike("Hussain Bombaywala", "Husain")).toBe(true);
    expect(namesAlike("Husain", "Hussain Bombaywala")).toBe(true);
  });

  it("compares last names when both have one", () => {
    expect(namesAlike("Hussain Bombaywala", "Husain Bombaywalla")).toBe(true);
    expect(namesAlike("John Smith", "John Doe")).toBe(false);
  });

  it("doesn't suggest a relative for sharing a surname", () => {
    expect(namesAlike("Fatema Bombaywala", "Hussain Bombaywala")).toBe(false);
  });

  it("goes by the last word when there are middle names", () => {
    expect(namesAlike("Mohammed Ali Khan", "Mohammed Khan")).toBe(true);
  });

  it("tells different names apart", () => {
    expect(namesAlike("Hussain", "Zainab")).toBe(false);
    expect(namesAlike("Taha", "Ali")).toBe(false);
  });

  it("won't match on a word with too little left to compare", () => {
    expect(namesAlike("Ali", "Ela")).toBe(false);
  });
});

describe("sameOccasion", () => {
  it("needs the same kind of occasion", () => {
    expect(sameOccasion(date("BIRTHDAY", 11, 14), date("ANNIVERSARY", 11, 14))).toBe(false);
  });

  it("matches on either calendar, whatever the year", () => {
    expect(sameOccasion(date("BIRTHDAY", 11, 14, 3, 3), date("BIRTHDAY", 11, 14, 9, 9))).toBe(true);
    expect(sameOccasion(date("BIRTHDAY", 1, 2, 10, 17), date("BIRTHDAY", 5, 6, 10, 17))).toBe(true);
  });
});

describe("findMatches", () => {
  const me = { name: "Hussain", dates: [date("BIRTHDAY", 11, 14), date("ANNIVERSARY", 7, 28, 1, 24)] };
  const entry = (name: string, ...occasions: DatedOccasion[]) => ({ name, occasions });

  it("puts a name and date match first", () => {
    const found = findMatches(me, [
      entry("Husain"),
      entry("Hossein", date("BIRTHDAY", 11, 14)),
    ]);
    expect(found.map((match) => match.entry.name)).toEqual(["Hossein", "Husain"]);
    expect(found.map((match) => match.reason)).toEqual(["date", "name"]);
  });

  it("suggests a differently spelt name on a shared birthday", () => {
    const found = findMatches(me, [entry("Hsn Sahib", date("BIRTHDAY", 11, 14))]);
    expect(found).toHaveLength(1);
  });

  it("doesn't suggest a wife for sharing an anniversary", () => {
    expect(findMatches(me, [entry("Zainab", date("ANNIVERSARY", 7, 28, 1, 24))])).toEqual([]);
  });

  it("ignores everyone else", () => {
    expect(findMatches(me, [entry("Murtaza", date("BIRTHDAY", 3, 22, 5, 5))])).toEqual([]);
  });
});
