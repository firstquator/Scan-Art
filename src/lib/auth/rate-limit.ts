/** 같은 접속지에서 연속 실패 허용 횟수 */
export const MAX_FAILS = 5;
/**
 * 접속지와 상관없는 전체 실패 허용 횟수.
 * 접속지 주소를 속여 가며 계속 시도하는 경우를 막는다(주소를 바꿔도 이 횟수는 함께 쌓인다).
 */
export const GLOBAL_MAX_FAILS = 30;
export const LOCK_MS = 5 * 60 * 1000;
/** 마지막 실패 뒤 이만큼 지나면 횟수를 처음부터 다시 센다. */
export const FAIL_WINDOW_MS = 15 * 60 * 1000;

export const GLOBAL_KEY = "__global__";

export interface AttemptState {
  failCount: number;
  lockedUntil: Date | null;
  updatedAt?: Date;
}

export function isLocked(state: AttemptState | undefined, now: Date): boolean {
  return !!state?.lockedUntil && state.lockedUntil.getTime() > now.getTime();
}

/** 실패 한 번을 반영한 다음 상태. 잠금이 풀렸거나 오래 전 실패라면 1회부터 다시 센다. */
export function nextAfterFailure(state: AttemptState | undefined, now: Date, maxFails = MAX_FAILS): AttemptState {
  const lockExpired = !!state?.lockedUntil && state.lockedUntil.getTime() <= now.getTime();
  const stale = !!state?.updatedAt && now.getTime() - state.updatedAt.getTime() > FAIL_WINDOW_MS;
  const failCount = (!state || lockExpired || stale ? 0 : state.failCount) + 1;
  return {
    failCount,
    lockedUntil: failCount >= maxFails ? new Date(now.getTime() + LOCK_MS) : null,
    updatedAt: now,
  };
}
