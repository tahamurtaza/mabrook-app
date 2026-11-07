import { describe, expect, it } from "vitest";
import { personalDateLabel, personalDateTitle, titleForTurn } from "./labels";

describe("personalDateTitle", () => {
  it("names the person on a birthday or anniversary", () => {
    expect(personalDateTitle("Fatema", { type: "BIRTHDAY", label: null, observedCalendar: "GREGORIAN" })).toBe("Fatema's birthday");
    expect(personalDateTitle("Fatema", { type: "ANNIVERSARY", label: null, observedCalendar: "GREGORIAN" })).toBe(
      "Fatema's anniversary",
    );
  });

  it("reads naturally for a type that isn't a noun", () => {
    expect(personalDateTitle("Taha", { type: "SCHOOL_START", label: null, observedCalendar: "GREGORIAN" })).toBe(
      "Taha started school",
    );
  });

  it("keeps someone's own words for a custom date", () => {
    expect(personalDateTitle("Taha", { type: "OTHER", label: "Hajj", observedCalendar: "GREGORIAN" })).toBe("Taha: Hajj");
    expect(personalDateTitle("Taha", { type: "OTHER", label: null, observedCalendar: "GREGORIAN" })).toBe("Taha's occasion");
  });
});

describe("birthday wording", () => {
  it("is a Waras when the Hijri calendar keeps it", () => {
    expect(personalDateTitle("Taha", { type: "BIRTHDAY", label: null, observedCalendar: "HIJRI" })).toBe("Taha's Waras");
  });

  it("is a birthday when the Gregorian calendar keeps it, or both do", () => {
    expect(personalDateTitle("Taha", { type: "BIRTHDAY", label: null, observedCalendar: "GREGORIAN" })).toBe("Taha's birthday");
    expect(personalDateTitle("Taha", { type: "BIRTHDAY", label: null, observedCalendar: "BOTH" })).toBe("Taha's birthday");
  });

  it("keeps the wording when the name changes", () => {
    expect(personalDateTitle("Taha Bombaywala", { type: "BIRTHDAY", label: null, observedCalendar: "HIJRI" })).toBe("Taha Bombaywala's Waras");
  });
});

describe("titleForTurn", () => {
  it("calls the Hijri turn of a birthday kept by both calendars a Waras", () => {
    expect(titleForTurn("Taha's birthday", "BIRTHDAY", "HIJRI")).toBe("Taha's Waras");
    expect(titleForTurn("Taha's birthday", "BIRTHDAY", "GREGORIAN")).toBe("Taha's birthday");
  });

  it("works on titles people typed, whatever the capitals", () => {
    expect(titleForTurn("Abbas Birthday", "BIRTHDAY", "HIJRI")).toBe("Abbas Waras");
    expect(titleForTurn("Abbas Waras", "BIRTHDAY", "GREGORIAN")).toBe("Abbas birthday");
    expect(titleForTurn("Waras of Taha", "BIRTHDAY", "GREGORIAN")).toBe("Birthday of Taha");
  });

  it("names both when the two calendars land on the same day", () => {
    expect(titleForTurn("Taha's birthday", "BIRTHDAY", "BOTH")).toBe("Taha's birthday and Waras");
  });

  it("leaves other occasions, and titles without either word, alone", () => {
    expect(titleForTurn("Taha's birthday party", "ANNIVERSARY", "HIJRI")).toBe("Taha's birthday party");
    expect(titleForTurn("Taha turns 18", "BIRTHDAY", "HIJRI")).toBe("Taha turns 18");
    expect(titleForTurn("Birthdays at school", "BIRTHDAY", "HIJRI")).toBe("Birthdays at school");
  });
});

describe("personalDateLabel", () => {
  it("prefers their own words, and falls back to the type", () => {
    expect(personalDateLabel({ type: "OTHER", label: "Hajj" })).toBe("Hajj");
    expect(personalDateLabel({ type: "NIKAH", label: null })).toBe("Nikah");
  });
});
