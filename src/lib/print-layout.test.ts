import { describe, expect, it } from "vitest";
import {
  A4,
  CARD_SIZES,
  cellPosition,
  computeSheetLayout,
  MIN_RECOMMENDED_QR_MM,
  paginate,
  templateGeometry,
} from "./print-layout";

describe("computeSheetLayout", () => {
  it("명함 카드는 A4 한 장에 2열 5행 = 10장", () => {
    const layout = computeSheetLayout(CARD_SIZES.business);
    expect(layout).toMatchObject({ cols: 2, rows: 5, perPage: 10 });
  });

  it("A6 카드는 한 장에 2장", () => {
    expect(computeSheetLayout(CARD_SIZES.a6).perPage).toBe(2);
  });

  it("정사각 카드는 한 장에 1열 2행", () => {
    const layout = computeSheetLayout(CARD_SIZES.square);
    expect(layout.cols).toBe(1);
    expect(layout.rows).toBe(2);
  });

  it("30mm 스티커는 한 장에 많이 들어간다", () => {
    const layout = computeSheetLayout({ width: 30, height: 30 });
    expect(layout.cols).toBe(5);
    expect(layout.rows).toBe(8);
  });

  it("배치가 종이 가운데에 오고, 모든 칸이 종이 안에 있다", () => {
    const item = CARD_SIZES.business;
    const layout = computeSheetLayout(item);
    const last = cellPosition(layout, item, layout.perPage - 1);
    expect(layout.offsetX).toBeGreaterThanOrEqual(8);
    expect(last.x + item.width).toBeLessThanOrEqual(A4.width - 8 + 0.01);
    expect(last.y + item.height).toBeLessThanOrEqual(A4.height - 8 + 0.01);
    // 좌우 여백이 같다
    expect(A4.width - (last.x + item.width)).toBeCloseTo(layout.offsetX, 2);
  });

  it("종이보다 큰 칸은 0개", () => {
    expect(computeSheetLayout({ width: 300, height: 50 }).perPage).toBe(0);
  });
});

describe("paginate", () => {
  it("쪽마다 나눈다", () => {
    expect(paginate([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it("빈 목록과 0칸은 빈 결과", () => {
    expect(paginate([], 4)).toEqual([]);
    expect(paginate([1], 0)).toEqual([]);
  });
});

describe("templateGeometry", () => {
  it("모든 카드 템플릿의 QR은 권장 최소 크기 이상이다", () => {
    for (const cardSize of ["business", "a6", "square"] as const) {
      const { qr, item } = templateGeometry("card", { cardSize, stickerSize: 30, stickerCaption: false });
      expect(qr).toBeGreaterThanOrEqual(MIN_RECOMMENDED_QR_MM);
      expect(qr).toBeLessThan(item.height);
    }
  });

  it("스티커 작품명을 켜면 높이가 늘어난다", () => {
    const withCaption = templateGeometry("sticker", { cardSize: "business", stickerSize: 40, stickerCaption: true });
    const without = templateGeometry("sticker", { cardSize: "business", stickerSize: 40, stickerCaption: false });
    expect(withCaption.item.height).toBeGreaterThan(without.item.height);
  });
});
