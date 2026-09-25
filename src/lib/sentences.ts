export interface Paragraph {
  sentences: { index: number; text: string }[];
}

/**
 * 설명글을 문단 → 문장으로 나눈다. 읽어주기에서 문장 단위로 읽고 강조하기 위해 쓴다.
 * 문장 번호(index)는 글 전체에서 이어진다.
 */
export function splitParagraphs(text: string): Paragraph[] {
  let index = 0;
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => ({
      sentences: splitSentences(p).map((s) => ({ index: index++, text: s })),
    }));
}

export function splitSentences(paragraph: string): string[] {
  const parts = paragraph.match(/[^.!?。！？…]+(?:[.!?。！？…]+["'”’)\]]*|$)\s*/g) ?? [paragraph];
  return parts.map((s) => s.trim()).filter(Boolean);
}

export function allSentences(paragraphs: Paragraph[]): string[] {
  return paragraphs.flatMap((p) => p.sentences.map((s) => s.text));
}
