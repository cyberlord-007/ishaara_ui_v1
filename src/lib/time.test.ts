import { describe, expect, it } from "vitest";
import { formatSpokenDuration, getGreetingPeriod } from "./time";

describe("getGreetingPeriod", () => {
  it.each([
    [5, "morning"],
    [11, "morning"],
    [12, "afternoon"],
    [16, "afternoon"],
    [17, "evening"],
    [20, "evening"],
    [21, "default"],
    [4, "default"],
    [0, "default"],
  ] as const)("hour %i is %s", (hour, expected) => {
    expect(getGreetingPeriod(hour)).toBe(expected);
  });
});

describe("formatSpokenDuration", () => {
  it("rounds to the nearest whole minute", () => {
    expect(formatSpokenDuration(2520)).toBe("42 minutes");
    expect(formatSpokenDuration(2534)).toBe("42 minutes");
  });

  it("uses the singular for exactly one minute", () => {
    expect(formatSpokenDuration(60)).toBe("1 minute");
  });

  it("never rounds down to zero minutes", () => {
    expect(formatSpokenDuration(10)).toBe("1 minute");
  });
});
