import { describe, expect, it } from "vitest";
import { parseDuration } from "./motion.js";

describe("parseDuration", () => {
  it("reads milliseconds and seconds", () => {
    expect(parseDuration("120ms")).toBe(120);
    expect(parseDuration(" 0.3s ")).toBe(300);
  });

  it("is 0 for anything that is not a positive time", () => {
    expect(parseDuration("")).toBe(0);
    expect(parseDuration("fast")).toBe(0);
    expect(parseDuration("-5ms")).toBe(0);
    expect(parseDuration("120")).toBe(0);
  });
});
