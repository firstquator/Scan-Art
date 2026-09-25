import { describe, expect, it } from "vitest";
import { formatBytes, formatDate, formatDuration, formatPeriod } from "./format";

describe("format", () => {
  it("formatDuration", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65.4)).toBe("1:05");
    expect(formatDuration(Number.NaN)).toBe("0:00");
  });

  it("formatBytes", () => {
    expect(formatBytes(512)).toBe("512B");
    expect(formatBytes(300 * 1024)).toBe("300KB");
    expect(formatBytes(12.34 * 1024 * 1024)).toBe("12.3MB");
  });

  it("formatDate / formatPeriod", () => {
    expect(formatDate("2026-10-01")).toBe("2026. 10. 1.");
    expect(formatDate("")).toBe("");
    expect(formatPeriod("2026-10-01", "2026-10-10")).toBe("2026. 10. 1. – 2026. 10. 10.");
    expect(formatPeriod("", "2026-10-10")).toBe("2026. 10. 10.");
    expect(formatPeriod("", "")).toBe("");
  });
});
