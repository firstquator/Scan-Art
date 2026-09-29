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
  it("빈 줄로 문단을 나누고, Enter 한 번은 줄바꿈으로 남긴다", () => {
    const paragraphs = splitParagraphs("하나. 둘.\n\n셋.\n넷");
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[1].sentences).toEqual([
      { index: 2, text: "셋.", br: true },
      { index: 3, text: "넷" },
    ]);
    expect(allSentences(paragraphs)).toEqual(["하나.", "둘.", "셋.", "넷"]);
  });

  it("문장 중간에서 바꾼 줄은 화면에 남기고, 읽어주기는 이어서 읽는다", () => {
    const paragraphs = splitParagraphs("쓰는 즐거움을\n더했습니다.\n\n끝.");
    expect(paragraphs[0].sentences[0].text).toBe("쓰는 즐거움을\n더했습니다.");
    expect(allSentences(paragraphs)[0]).toBe("쓰는 즐거움을 더했습니다.");
  });

  it("빈 줄이 없는 예전 글은 Enter 한 번을 문단으로 본다", () => {
    const paragraphs = splitParagraphs("첫 문단.\n둘째 문단.");
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].sentences[0]).toEqual({ index: 0, text: "첫 문단." });
  });

  it("빈 글은 빈 목록", () => {
    expect(splitParagraphs("  \n\n ")).toEqual([]);
  });
});
