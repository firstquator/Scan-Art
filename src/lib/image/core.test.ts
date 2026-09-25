import { describe, expect, it } from "vitest";
import { fitWithin, LARGE_EDGE, SMALL_EDGE } from "./core";

describe("fitWithin", () => {
  it("긴 변을 기준으로 비율을 지키며 줄인다", () => {
    expect(fitWithin(4032, 3024, LARGE_EDGE)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3024, 4032, SMALL_EDGE)).toEqual({ width: 600, height: 800 });
  });

  it("작은 사진은 키우지 않는다", () => {
    expect(fitWithin(640, 480, LARGE_EDGE)).toEqual({ width: 640, height: 480 });
  });

  it("아주 가늘고 긴 사진도 1px 이상", () => {
    expect(fitWithin(10000, 3, 32)).toEqual({ width: 32, height: 1 });
  });
});
