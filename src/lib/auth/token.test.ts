import { describe, expect, it } from "vitest";
import { passwordMatches, SESSION_MAX_AGE_SECONDS, signSession, verifySession } from "./token";

const SECRET = "test-secret-test-secret-test-secret-00";

describe("session token", () => {
  it("서명한 토큰은 검증된다", async () => {
    const token = await signSession(SECRET);
    expect(await verifySession(token, SECRET)).toBe(true);
  });

  it("다른 비밀값으로는 검증되지 않는다", async () => {
    const token = await signSession(SECRET);
    expect(await verifySession(token, "another-secret-another-secret-0000")).toBe(false);
  });

  it("만료된 토큰은 거부한다", async () => {
    const past = Date.now() - (SESSION_MAX_AGE_SECONDS + 60) * 1000;
    const token = await signSession(SECRET, past);
    expect(await verifySession(token, SECRET)).toBe(false);
  });

  it("비어 있거나 망가진 토큰은 거부한다", async () => {
    expect(await verifySession(undefined, SECRET)).toBe(false);
    expect(await verifySession("not-a-token", SECRET)).toBe(false);
  });
});

describe("passwordMatches", () => {
  it("같을 때만 참", async () => {
    expect(await passwordMatches("비밀번호123", "비밀번호123")).toBe(true);
    expect(await passwordMatches("비밀번호12", "비밀번호123")).toBe(false);
    expect(await passwordMatches("", "x")).toBe(false);
  });
});
