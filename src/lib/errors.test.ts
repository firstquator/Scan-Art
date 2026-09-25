import { describe, expect, it } from "vitest";
import { AppError, ERROR_MESSAGES, fail, toErrorCode, toUserMessage } from "./errors";

// 허용되는 영문: 파일 형식 이름뿐. 그 밖의 영어가 섞이면 실패한다.
const ALLOWED_LATIN = /\b(JPG|PNG|HEIC|m4a|mp3|webm)\b/g;

describe("ERROR_MESSAGES", () => {
  it.each(Object.entries(ERROR_MESSAGES))("%s 문구는 자연스러운 한국어다", (_code, message) => {
    expect(message).toMatch(/[가-힣]/);
    expect(message.replace(ALLOWED_LATIN, "")).not.toMatch(/[A-Za-z]/);
    expect(message.trim().endsWith(".")).toBe(true);
  });
});

describe("toErrorCode", () => {
  it("AppError의 코드를 그대로 쓴다", () => {
    expect(toErrorCode(new AppError("SAVE_FAILED"))).toBe("SAVE_FAILED");
  });

  it("마이크 권한 거부를 한국어 안내로 바꾼다", () => {
    const err = new DOMException("Permission denied", "NotAllowedError");
    expect(toErrorCode(err)).toBe("MIC_DENIED");
  });

  it("네트워크 오류를 구분한다", () => {
    expect(toErrorCode(new TypeError("Failed to fetch"))).toBe("NETWORK");
  });

  it("알 수 없는 오류는 영어 원문 대신 일반 문구를 준다", () => {
    const message = toUserMessage(new Error("Cannot read properties of undefined"));
    expect(message).toBe(ERROR_MESSAGES.UNKNOWN);
  });

  it("code 속성을 가진 직렬화된 결과도 읽는다", () => {
    expect(toErrorCode({ code: "NOT_FOUND" })).toBe("NOT_FOUND");
    expect(toErrorCode({ code: "SOMETHING_ELSE" })).toBe("UNKNOWN");
  });
});

describe("fail", () => {
  it("코드와 한국어 문구를 함께 돌려준다", () => {
    expect(fail("VALIDATION", { title: "작품명을 입력해 주세요." })).toEqual({
      ok: false,
      code: "VALIDATION",
      message: ERROR_MESSAGES.VALIDATION,
      fieldErrors: { title: "작품명을 입력해 주세요." },
    });
  });
});
