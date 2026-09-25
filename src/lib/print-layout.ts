export const A4 = { width: 210, height: 297 } as const;

export type TemplateKind = "card" | "sticker";

export type CardSize = "business" | "a6" | "square";
export type StickerSize = 30 | 40 | 50;

export const CARD_SIZES: Record<CardSize, { label: string; width: number; height: number }> = {
  business: { label: "명함 (90×50mm)", width: 90, height: 50 },
  a6: { label: "A6 (148×105mm)", width: 148, height: 105 },
  square: { label: "정사각 (100×100mm)", width: 100, height: 100 },
};

export const STICKER_SIZES: StickerSize[] = [30, 40, 50];

/** 스티커 아래 작품명 영역 높이(mm) */
export const STICKER_CAPTION_HEIGHT = 7;

/** 이보다 작은 QR은 인식이 불안정하다(mm). */
export const MIN_RECOMMENDED_QR_MM = 25;

export interface ItemSize {
  width: number;
  height: number;
}

export interface SheetLayout {
  cols: number;
  rows: number;
  perPage: number;
  /** 첫 칸의 왼쪽 위 위치(mm). 배치 전체를 종이 가운데에 둔다. */
  offsetX: number;
  offsetY: number;
  gap: number;
}

export interface LayoutOptions {
  margin?: number;
  gap?: number;
}

/** A4 한 장에 같은 크기의 칸을 몇 개, 어디에 놓을지 계산한다. 모든 값은 mm. */
export function computeSheetLayout(item: ItemSize, options: LayoutOptions = {}): SheetLayout {
  const margin = options.margin ?? 8;
  const gap = options.gap ?? 4;
  const usableW = A4.width - margin * 2;
  const usableH = A4.height - margin * 2;

  const cols = Math.max(0, Math.floor((usableW + gap) / (item.width + gap)));
  const rows = Math.max(0, Math.floor((usableH + gap) / (item.height + gap)));

  const usedW = cols > 0 ? cols * item.width + (cols - 1) * gap : 0;
  const usedH = rows > 0 ? rows * item.height + (rows - 1) * gap : 0;

  return {
    cols,
    rows,
    perPage: cols * rows,
    offsetX: round((A4.width - usedW) / 2),
    offsetY: round((A4.height - usedH) / 2),
    gap,
  };
}

/** 칸 번호(0부터)의 왼쪽 위 위치(mm) */
export function cellPosition(layout: SheetLayout, item: ItemSize, index: number) {
  const col = index % layout.cols;
  const row = Math.floor(index / layout.cols);
  return {
    x: round(layout.offsetX + col * (item.width + layout.gap)),
    y: round(layout.offsetY + row * (item.height + layout.gap)),
  };
}

export function paginate<T>(items: T[], perPage: number): T[][] {
  if (perPage <= 0) return [];
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += perPage) pages.push(items.slice(i, i + perPage));
  return pages;
}

/** 템플릿별 칸 크기와 그 안의 QR 크기(mm) */
export function templateGeometry(
  kind: TemplateKind,
  opts: { cardSize: CardSize; stickerSize: StickerSize; stickerCaption: boolean },
): { item: ItemSize; qr: number } {
  if (kind === "sticker") {
    const s = opts.stickerSize;
    return {
      item: { width: s, height: s + (opts.stickerCaption ? STICKER_CAPTION_HEIGHT : 0) },
      qr: s - 4,
    };
  }
  const card = CARD_SIZES[opts.cardSize];
  const qr = { business: 34, a6: 42, square: 40 }[opts.cardSize];
  return { item: { width: card.width, height: card.height }, qr };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
