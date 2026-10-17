import { describe, expect, it } from "vitest";
import { getGreetingPeriod } from "./time";

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
