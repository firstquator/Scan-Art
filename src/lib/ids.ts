import { customAlphabet } from "nanoid";

// 헷갈리는 글자(0/O, 1/l/I)를 뺀 소문자+숫자. 주소가 짧아 QR 인식이 잘 된다.
const ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz";
export const ARTWORK_ID_LENGTH = 8;

export const newArtworkId = customAlphabet(ALPHABET, ARTWORK_ID_LENGTH);

const ID_PATTERN = new RegExp(`^[${ALPHABET}]{${ARTWORK_ID_LENGTH}}$`);

export function isArtworkId(value: string): boolean {
  return ID_PATTERN.test(value);
}
