import { describe, expect, it } from "vitest";
import { addMonths, daysInMonth, monthGrid, parseDate, pickRange, weekdayOf } from "./calendar";

describe("calendar", () => {
  it("달의 날짜 수 (윤년 포함)", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 10)).toBe(31);
  });

  it("요일 (2026-10-01은 목요일)", () => {
    expect(weekdayOf(2026, 10, 1)).toBe(4);
  });

  it("달력 한 장은 7의 배수 칸, 1일은 요일 자리에서 시작", () => {
    const grid = monthGrid(2026, 10);
    expect(grid.length % 7).toBe(0);
    expect(grid.slice(0, 4)).toEqual([null, null, null, null]);
    expect(grid[4]).toBe("2026-10-01");
    expect(grid.filter(Boolean)).toHaveLength(31);
  });

  it("달 넘기기 (연도 경계)", () => {
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });

  it("날짜 문자열 읽기", () => {
    expect(parseDate("2026-10-12")).toEqual({ year: 2026, month: 10, day: 12 });
    expect(parseDate("")).toBeNull();
  });

  it("기간 고르기: 시작 → 끝, 거꾸로 누르면 바꾼다, 다시 누르면 새로 시작", () => {
    let r = pickRange({ start: "", end: "" }, "2026-10-12");
    expect(r).toEqual({ start: "2026-10-12", end: "" });
    r = pickRange(r, "2026-10-23");
    expect(r).toEqual({ start: "2026-10-12", end: "2026-10-23" });
    expect(pickRange({ start: "2026-10-12", end: "" }, "2026-10-05")).toEqual({ start: "2026-10-05", end: "2026-10-12" });
    expect(pickRange(r, "2026-11-01")).toEqual({ start: "2026-11-01", end: "" });
  });
});
