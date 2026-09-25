import { describe, expect, it } from "vitest";
import {
  FAIL_WINDOW_MS,
  GLOBAL_MAX_FAILS,
  isLocked,
  LOCK_MS,
  MAX_FAILS,
  nextAfterFailure,
  type AttemptState,
} from "./rate-limit";

const now = new Date("2026-10-01T10:00:00Z");

describe("login rate limit", () => {
  it("5번째 실패에서 5분 동안 잠근다", () => {
    let state: AttemptState | undefined;
    for (let i = 1; i < MAX_FAILS; i++) {
      state = nextAfterFailure(state, now);
      expect(isLocked(state, now)).toBe(false);
    }
    state = nextAfterFailure(state, now);
    expect(isLocked(state, now)).toBe(true);
    expect(state.lockedUntil!.getTime() - now.getTime()).toBe(LOCK_MS);
  });

  it("잠금이 풀리면 다시 1회부터 센다", () => {
    const locked: AttemptState = { failCount: 5, lockedUntil: new Date(now.getTime() - 1) };
    expect(isLocked(locked, now)).toBe(false);
    expect(nextAfterFailure(locked, now)).toEqual({ failCount: 1, lockedUntil: null, updatedAt: now });
  });

  it("오래 전 실패는 잊고 다시 센다", () => {
    const old: AttemptState = { failCount: 4, lockedUntil: null, updatedAt: new Date(now.getTime() - FAIL_WINDOW_MS - 1) };
    expect(nextAfterFailure(old, now).failCount).toBe(1);
  });

  it("전체 한도는 접속지 한도보다 크게 따로 적용된다", () => {
    let state: AttemptState | undefined;
    for (let i = 1; i < GLOBAL_MAX_FAILS; i++) state = nextAfterFailure(state, now, GLOBAL_MAX_FAILS);
    expect(isLocked(state, now)).toBe(false);
    state = nextAfterFailure(state, now, GLOBAL_MAX_FAILS);
    expect(isLocked(state, now)).toBe(true);
  });
});
