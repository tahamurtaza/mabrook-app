import { describe, expect, it } from "vitest";
import { personalDateLabel, personalDateTitle } from "./labels";

describe("personalDateTitle", () => {
  it("names the person on a birthday or anniversary", () => {
    expect(personalDateTitle("Fatema", { type: "BIRTHDAY", label: null })).toBe("Fatema's birthday");
    expect(personalDateTitle("Fatema", { type: "ANNIVERSARY", label: null })).toBe(
      "Fatema's anniversary",
    );
  });

  it("reads naturally for a type that isn't a noun", () => {
    expect(personalDateTitle("Taha", { type: "SCHOOL_START", label: null })).toBe(
      "Taha started school",
    );
  });

  it("keeps someone's own words for a custom date", () => {
    expect(personalDateTitle("Taha", { type: "OTHER", label: "Hajj" })).toBe("Taha: Hajj");
    expect(personalDateTitle("Taha", { type: "OTHER", label: null })).toBe("Taha's occasion");
  });
});

describe("personalDateLabel", () => {
  it("prefers their own words, and falls back to the type", () => {
    expect(personalDateLabel({ type: "OTHER", label: "Hajj" })).toBe("Hajj");
    expect(personalDateLabel({ type: "NIKAH", label: null })).toBe("Nikah");
  });
});
