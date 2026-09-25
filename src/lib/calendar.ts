/** 달력 계산 (날짜 문자열은 모두 "YYYY-MM-DD", 시간대 영향을 받지 않게 숫자로만 다룬다) */

export interface YearMonth {
  year: number;
  month: number; // 1~12
}

export function parseDate(value: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

export function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function addMonths({ year, month }: YearMonth, delta: number): YearMonth {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 0=일요일 */
export function weekdayOf(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * 달력 한 장(6주 × 7일). 앞뒤 달 날짜는 null로 비워 둔다.
 */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = weekdayOf(year, month, 1);
  const total = daysInMonth(year, month);
  const cells: (string | null)[] = Array(first).fill(null);
  for (let d = 1; d <= total; d++) cells.push(toDateString(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * 기간 고르기: 시작일이 없거나 이미 기간이 다 정해져 있으면 새 시작일로,
 * 시작일만 있으면 종료일로 정한다(시작일보다 앞을 누르면 둘을 바꾼다).
 */
export function pickRange(current: { start: string; end: string }, clicked: string): { start: string; end: string } {
  const { start, end } = current;
  if (!start || (start && end)) return { start: clicked, end: "" };
  if (clicked < start) return { start: clicked, end: start };
  return { start, end: clicked };
}

export function todayString(now = new Date()): string {
  return toDateString(now.getFullYear(), now.getMonth() + 1, now.getDate());
}
