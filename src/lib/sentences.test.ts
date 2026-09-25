import { describe, expect, it } from "vitest";
import { allSentences, splitParagraphs, splitSentences } from "./sentences";

describe("splitSentences", () => {
  it("마침표·물음표·느낌표로 나눈다", () => {
    expect(splitSentences("봄이 왔어요. 꽃이 피었나요? 정말 예뻐요!")).toEqual([
      "봄이 왔어요.",
      "꽃이 피었나요?",
      "정말 예뻐요!",
    ]);
  });

  it("끝에 문장부호가 없어도 남긴다", () => {
    expect(splitSentences("첫 문장. 두 번째 문장")).toEqual(["첫 문장.", "두 번째 문장"]);
  });

  it("말줄임표와 닫는 따옴표를 문장에 붙인다", () => {
    expect(splitSentences("“안녕!” 하고 웃었어요… 그리고")).toEqual(["“안녕!”", "하고 웃었어요…", "그리고"]);
  });
});

describe("splitParagraphs", () => {
  it("줄바꿈으로 문단을 나누고 문장 번호를 이어서 매긴다", () => {
    const paragraphs = splitParagraphs("하나. 둘.\n\n셋.\n넷");
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[1].sentences[0]).toEqual({ index: 2, text: "셋." });
    expect(allSentences(paragraphs)).toEqual(["하나.", "둘.", "셋.", "넷"]);
  });

  it("빈 글은 빈 목록", () => {
    expect(splitParagraphs("  \n\n ")).toEqual([]);
  });
});
