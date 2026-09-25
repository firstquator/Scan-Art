import { describe, expect, it } from "vitest";
import { isArtworkId, newArtworkId } from "./ids";

describe("newArtworkId", () => {
  it("8자, 헷갈리는 글자 없이 만든다", () => {
    for (let i = 0; i < 200; i++) {
      const id = newArtworkId();
      expect(id).toHaveLength(8);
      expect(id).not.toMatch(/[01lIO]/);
      expect(isArtworkId(id)).toBe(true);
    }
  });

  it("형식이 다른 값은 거부한다", () => {
    expect(isArtworkId("abc")).toBe(false);
    expect(isArtworkId("ABCDEFGH")).toBe(false);
    expect(isArtworkId("abcd/../x")).toBe(false);
  });
});
