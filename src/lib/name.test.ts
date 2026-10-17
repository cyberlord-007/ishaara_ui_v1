import { describe, expect, it } from "vitest";
import { getFirstName } from "./name";

describe("getFirstName", () => {
  it("returns the first word of a full name", () => {
    expect(getFirstName("Asha Verma")).toBe("Asha");
  });

  it("trims leading whitespace and collapses repeated spaces", () => {
    expect(getFirstName("  Asha   Verma")).toBe("Asha");
  });

  it("returns the whole string when there is only one word", () => {
    expect(getFirstName("Asha")).toBe("Asha");
  });

  it.each([null, undefined, "", "   "])("returns '' for %s", (value) => {
    expect(getFirstName(value)).toBe("");
  });
});
