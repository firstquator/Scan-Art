export interface Sentence {
  index: number;
  /** 화면에 보일 글. 관리자가 문장 중간에서 줄을 바꿨으면 "\n"이 들어 있다. */
  text: string;
  /** 이 문장 뒤에서 줄을 바꾼다(같은 문단 안에서). */
  br?: boolean;
}

export interface Paragraph {
  sentences: Sentence[];
}

/**
 * 설명글을 문단 → 문장으로 나눈다. 읽어주기에서 문장 단위로 읽고 강조하기 위해 쓴다.
 * 문장 번호(index)는 글 전체에서 이어진다.
 *
 * - 빈 줄은 문단을 나누고, Enter 한 번은 그 자리에서 줄만 바꾼다(휴대폰에서 줄 모양을 맞출 수 있게).
 * - 빈 줄이 하나도 없는 글은 예전처럼 Enter 한 번을 문단으로 본다(이미 저장된 글이 달라지지 않게).
 */
export function splitParagraphs(text: string): Paragraph[] {
  const normalized = text.replace(/\r\n?/g, "\n");
  const blocks = /\n[ \t]*\n/.test(normalized) ? normalized.split(/\n[ \t]*\n+/) : normalized.split("\n");
  let index = 0;
  return blocks
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n"),
    )
    .filter(Boolean)
    .map((p) => ({
      sentences: splitSentenceParts(p).map((s) => ({ index: index++, ...s })),
    }));
}

/** 한 문단을 문장으로 나누며, 문장 뒤의 줄바꿈 여부를 함께 기억한다. */
function splitSentenceParts(paragraph: string): { text: string; br?: boolean }[] {
  const parts = paragraph.match(/[^.!?。！？…]+(?:[.!?。！？…]+["'”’)\]]*|$)\s*/g) ?? [paragraph];
  return parts
    .map((raw) => {
      const text = raw.trim();
      return /\n\s*$/.test(raw) ? { text, br: true } : { text };
    })
    .filter((s) => s.text);
}

export function splitSentences(paragraph: string): string[] {
  return splitSentenceParts(paragraph).map((s) => s.text);
}

/** 읽어주기용: 줄바꿈은 띄어쓰기로 읽는다. */
export function allSentences(paragraphs: Paragraph[]): string[] {
  return paragraphs.flatMap((p) => p.sentences.map((s) => s.text.replace(/\s*\n\s*/g, " ")));
}
