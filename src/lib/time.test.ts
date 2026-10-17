import { describe, expect, it } from "vitest";
import { formatClock, formatSpokenDuration, getGreetingPeriod } from "./time";

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

describe("formatClock", () => {
  it("formats seconds under a minute", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(9)).toBe("0:09");
  });

  it("formats minutes and seconds", () => {
    expect(formatClock(75)).toBe("1:15");
    expect(formatClock(754)).toBe("12:34");
  });

  it("formats hours once the video passes an hour", () => {
    expect(formatClock(3661)).toBe("1:01:01");
  });

  it("never goes negative", () => {
    expect(formatClock(-5)).toBe("0:00");
  });
});
