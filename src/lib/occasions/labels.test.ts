import { describe, expect, it } from "vitest";
import { personalDateLabel, personalDateTitle } from "./labels";

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

describe("personalDateLabel", () => {
  it("prefers their own words, and falls back to the type", () => {
    expect(personalDateLabel({ type: "OTHER", label: "Hajj" })).toBe("Hajj");
    expect(personalDateLabel({ type: "NIKAH", label: null })).toBe("Nikah");
  });
});
