"use client";

import { AnimatePresence, motion } from "motion/react";
import { Fragment, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { InkButton } from "@/components/ui/ink-button";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { IconAlert, IconCheck, IconChevronLeft, IconChevronRight, IconExpand, IconImage, IconPrinter } from "@/components/ui/icons";
import { ArtImage } from "@/components/artwork/art-image";
import type { AdminArtworkSummary } from "@/lib/types";
import { messageFor } from "@/lib/errors";
import { joinArtists } from "@/lib/format";
import {
  A4,
  CARD_SIZES,
  cellPosition,
  computeSheetLayout,
  MIN_RECOMMENDED_QR_MM,
  paginate,
  STICKER_CAPTION_HEIGHT,
  STICKER_SIZES,
  templateGeometry,
  type CardSize,
  type StickerSize,
  type TemplateKind,
} from "@/lib/print-layout";
import { cn } from "@/lib/cn";
import { useAdmin } from "./admin-context";
import { FitText } from "./fit-text";
import { QrCode } from "./qr-code";

type Scope = "all" | "published" | "selected";

const noopSubscribe = () => () => {};

/** 미리보기 A4가 화면 높이 안에 들어오도록 하는 최대 너비 */
const SHEET_MAX_WIDTH = "min(100%, calc((100dvh - 280px) * 0.7071))";

export function PrintStudio({ artworks, preselected }: { artworks: AdminArtworkSummary[]; preselected: string[] }) {
  const { siteUrl, exhibitionTitle, organizer } = useAdmin();
  const toast = useToast();
  const [kind, setKind] = useState<TemplateKind>("card");
  const [cardSize, setCardSize] = useState<CardSize>("business");
  const [stickerSize, setStickerSize] = useState<StickerSize>(40);
  const [stickerCaption, setStickerCaption] = useState(true);
  const [hanji, setHanji] = useState(true);
  const [cutMarks, setCutMarks] = useState(true);
  const [scope, setScope] = useState<Scope>(preselected.length ? "selected" : "published");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(preselected));
  const [page, setPage] = useState(0);
  const [printHelp, setPrintHelp] = useState(false);

  const wrongOrigin = useSyncExternalStore(noopSubscribe, () => window.location.origin !== siteUrl, () => false);

  const targets = useMemo(() => {
    if (scope === "all") return artworks;
    if (scope === "published") return artworks.filter((a) => a.isPublished);
    return artworks.filter((a) => selected.has(a.id));
  }, [artworks, scope, selected]);
  const targetIds = useMemo(() => new Set(targets.map((a) => a.id)), [targets]);

  const { item, qr } = templateGeometry(kind, { cardSize, stickerSize, stickerCaption });

  const renderItem = (art: AdminArtworkSummary) =>
    kind === "card" ? (
      <LabelCard
        // 작품이나 내용이 바뀌면 글자 크기 맞춤을 처음부터 다시 한다(앞 작품의 맞춤 상태를 물려받지 않게).
        key={`${cardSize}|${art.id}|${art.title}|${art.artists.join("/")}|${art.material}|${art.size}`}
        art={art}
        url={`${siteUrl}/a/${art.id}`}
        size={cardSize}
        qr={qr}
        hanji={hanji}
        cutMarks={cutMarks}
        exhibitionTitle={exhibitionTitle}
        organizer={organizer}
      />
    ) : (
      <LabelSticker art={art} url={`${siteUrl}/a/${art.id}`} size={stickerSize} caption={stickerCaption} cutMarks={cutMarks} />
    );
  const layout = computeSheetLayout(item, { margin: 8, gap: cutMarks ? 4 : 2 });
  const pages = paginate(targets, layout.perPage);
  // 명제표 하나를 크게 보기
  const [zoomId, setZoomId] = useState<string | null>(null);
  const zoomIndex = zoomId ? targets.findIndex((a) => a.id === zoomId) : -1;
  const zoomArt = zoomIndex >= 0 ? targets[zoomIndex] : null;
  const currentPage = Math.min(page, Math.max(0, pages.length - 1));
  const smallQr = qr < MIN_RECOMMENDED_QR_MM;

  /** 목록에서 하나를 켜고 끄면, 지금 인쇄 대상에서 출발해 '직접 고르기'로 바뀐다. */
  function toggleOne(id: string) {
    const base = scope === "selected" ? selected : targetIds;
    const next = new Set(base);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    setScope("selected");
    setPage(0);
  }

  function changeScope(next: Scope) {
    if (next === "selected" && scope !== "selected") setSelected(new Set(targetIds));
    setScope(next);
    setPage(0);
  }

  function doPrint() {
    if (targets.length === 0) {
      toast.error(messageFor("PRINT_EMPTY"));
      return;
    }
    setPrintHelp(true);
  }

  const selectionPanel = (
    <Panel
      title="인쇄할 작품"
      aside={
        <span className="tabular rounded-full bg-blue-mist px-2.5 py-0.5 text-[12.5px] font-bold text-blue-deep">
          {targets.length} / {artworks.length}
        </span>
      }
    >
      <Segmented
        value={scope}
        onChange={changeScope}
        options={[
          ["published", "공개된 것"],
          ["all", "전체"],
          ["selected", "직접 고르기"],
        ]}
      />
      <ul className="mt-3 max-h-[min(60vh,560px)] space-y-1 overflow-y-auto overflow-x-hidden pr-1">
        {artworks.map((a) => {
          const on = targetIds.has(a.id);
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => toggleOne(a.id)}
                aria-pressed={on}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl p-1.5 pr-2.5 text-left transition-colors",
                  on ? "bg-blue-mist/70" : "opacity-60 hover:bg-paper-deep/60 hover:opacity-100",
                )}
              >
                <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-paper-deep">
                  {a.cover ? (
                    <ArtImage image={a.cover} alt="" sizes="44px" className="h-full w-full" />
                  ) : (
                    <IconImage size={18} className="absolute inset-0 m-auto text-ink-faint" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-semibold text-ink">{a.title}</span>
                  <span className="block truncate text-[12px] text-ink-faint">
                    {joinArtists(a.artists)}
                    {!a.isPublished && " · 준비 중"}
                  </span>
                </span>
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                    on ? "border-blue bg-blue text-paper-light" : "border-paper-edge bg-paper-light",
                  )}
                >
                  {on && <IconCheck size={12} strokeWidth={3.2} />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );

  return (
    <div className="w-full px-4 pb-32 pt-6 sm:px-6 sm:pt-8 lg:px-8 print:m-0 print:p-0">
      <div className="print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-[1.9rem] font-bold tracking-[-0.02em] text-ink">QR 인쇄</h1>
            <p className="mt-1 text-[15px] text-ink-soft">
              A4 한 장에 <b className="tabular text-blue">{layout.perPage}</b>개씩, 모두 <b className="tabular text-blue">{pages.length}</b>장이 인쇄됩니다.
            </p>
          </div>
          <InkButton size="lg" icon={<IconPrinter size={20} />} onClick={doPrint} disabled={targets.length === 0}>
            인쇄하기
          </InkButton>
        </div>

        {wrongOrigin && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger-mist/70 px-4 py-3.5 text-[14.5px] text-danger">
            <IconAlert size={20} className="mt-0.5 shrink-0" />
            <p>
              지금 접속한 주소와 QR 코드에 들어가는 주소(<b className="break-all font-mono">{siteUrl}</b>)가 다릅니다. 최종 사이트 주소가 맞는지 꼭 확인한 뒤 인쇄해 주세요.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)_320px] print:mt-0 print:block">
        {/* 왼쪽: 모양·옵션 (좁은 화면에서는 작품 고르기도 여기에) */}
        <aside className="space-y-5 print:hidden">
          <Panel title="모양">
            <Segmented
              value={kind}
              onChange={(v) => {
                setKind(v);
                setPage(0);
              }}
              options={[
                ["card", "명제표 카드"],
                ["sticker", "QR 스티커"],
              ]}
            />
            <div className="mt-3.5 space-y-2">
              {kind === "card"
                ? (Object.keys(CARD_SIZES) as CardSize[]).map((key) => (
                    <Choice key={key} active={cardSize === key} onClick={() => (setCardSize(key), setPage(0))} shape={CARD_SIZES[key]}>
                      {CARD_SIZES[key].label}
                    </Choice>
                  ))
                : STICKER_SIZES.map((s) => (
                    <Choice key={s} active={stickerSize === s} onClick={() => (setStickerSize(s), setPage(0))} shape={{ width: s, height: s }}>
                      {s}×{s}mm{s === 30 && <span className="ml-1.5 text-[12.5px] font-normal text-danger">QR이 작습니다</span>}
                    </Choice>
                  ))}
            </div>
            <AnimatePresence>
              {smallQr && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 overflow-hidden rounded-xl bg-danger-mist/70 px-3 py-2 text-[13px] text-danger"
                >
                  QR이 {qr}mm로 작아서 멀리서는 잘 찍히지 않을 수 있습니다. {MIN_RECOMMENDED_QR_MM}mm 이상을 권장합니다.
                </motion.p>
              )}
            </AnimatePresence>
          </Panel>

          <Panel title="옵션">
            <div className="space-y-3">
              {kind === "card" && <Switch size="sm" checked={hanji} onChange={setHanji} label="한지 배경 (끄면 잉크 절약)" />}
              {kind === "sticker" && <Switch size="sm" checked={stickerCaption} onChange={(v) => (setStickerCaption(v), setPage(0))} label="QR 아래에 작품명 넣기" />}
              <Switch size="sm" checked={cutMarks} onChange={setCutMarks} label="자르는 선 표시" />
            </div>
          </Panel>

          <div className="2xl:hidden">{selectionPanel}</div>
        </aside>

        {/* 가운데: 작업대 위의 A4 미리보기 */}
        <section aria-label="인쇄 미리보기" className="print:block">
          <div className="rounded-[28px] border border-paper-edge/80 bg-paper-deep/45 px-4 py-5 shadow-[inset_0_2px_10px_rgb(70_52_24/0.07)] sm:px-8 sm:py-6 lg:sticky lg:top-24 print:static print:border-0 print:bg-transparent print:p-0 print:shadow-none">
            {targets.length === 0 ? (
              <div style={{ maxWidth: SHEET_MAX_WIDTH }} className="mx-auto flex aspect-[210/297] w-full items-center justify-center rounded-md bg-white/70 text-center text-[15px] leading-relaxed text-ink-soft print:hidden">
                <p>
                  인쇄할 작품이 없습니다.
                  <br />
                  인쇄할 작품을 골라 주세요.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-center gap-3 print:hidden">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    aria-label="이전 장"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-paper-light/80 shadow-[var(--shadow-paper)] hover:bg-paper-light disabled:opacity-30"
                  >
                    <IconChevronLeft size={18} />
                  </button>
                  <span className="tabular min-w-20 text-center text-[15px] font-semibold text-ink">
                    {currentPage + 1} / {pages.length}장
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(pages.length - 1, p + 1))}
                    disabled={currentPage >= pages.length - 1}
                    aria-label="다음 장"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-paper-light/80 shadow-[var(--shadow-paper)] hover:bg-paper-light disabled:opacity-30"
                  >
                    <IconChevronRight size={18} />
                  </button>
                </div>

                <div className="print-sheets relative">
                  {pages.map((items, pi) => (
                    <Sheet key={pi} visible={pi === currentPage}>
                      {items.map((art, i) => {
                        const pos = cellPosition(layout, item, i);
                        return (
                          <div key={art.id} className="absolute" style={{ left: `${pos.x}mm`, top: `${pos.y}mm`, width: `${item.width}mm`, height: `${item.height}mm` }}>
                            {renderItem(art)}
                            <button
                              type="button"
                              onClick={() => setZoomId(art.id)}
                              aria-label={`${art.title} ${kind === "card" ? "명제표" : "스티커"} 크게 보기`}
                              className="group absolute inset-0 z-10 cursor-zoom-in rounded-[2.5mm] outline-none ring-blue/0 transition-[box-shadow] hover:ring-[0.6mm] hover:ring-blue/55 focus-visible:ring-[0.6mm] focus-visible:ring-blue print:hidden"
                            >
                              <span className="pointer-events-none absolute right-[1.5mm] top-[1.5mm] flex items-center gap-[0.8mm] rounded-full bg-ink/75 px-[2mm] py-[0.9mm] text-[2.6mm] font-semibold text-paper-light opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                                <IconExpand size={10} strokeWidth={2.4} />
                                크게 보기
                              </span>
                            </button>
                          </div>
                        );
                      })}
                    </Sheet>
                  ))}
                </div>
                <p className="mt-4 text-center text-[13px] text-ink-faint print:hidden">
                  실제 크기(mm) 그대로 인쇄됩니다. 인쇄 창에서 ‘배율: 100%(실제 크기)’를 골라 주세요.
                </p>
              </>
            )}
          </div>
        </section>

        {/* 오른쪽: 작품 고르기 (아주 넓은 화면) */}
        <aside className="hidden print:hidden 2xl:sticky 2xl:top-24 2xl:block">{selectionPanel}</aside>
      </div>

      <Modal
        open={printHelp}
        onClose={() => setPrintHelp(false)}
        title="인쇄 전에 확인해 주세요"
        description="곧 인쇄 창이 열립니다. 인쇄 창의 설정을 아래와 같이 맞춰야 실제 크기대로 인쇄됩니다."
        size="md"
        footer={
          <>
            <InkButton variant="ghost" onClick={() => setPrintHelp(false)}>
              취소
            </InkButton>
            <InkButton
              icon={<IconPrinter size={18} />}
              onClick={() => {
                setPrintHelp(false);
                setTimeout(() => window.print(), 250);
              }}
            >
              인쇄 창 열기
            </InkButton>
          </>
        }
      >
        <ul className="divide-y divide-dashed divide-paper-edge overflow-hidden rounded-2xl border border-paper-edge bg-paper-light/80">
          <PrintSetting name="용지 크기" value="A4" />
          <PrintSetting name="배율" value="100% (기본값)" note="‘페이지에 맞춤’을 고르면 크기가 달라집니다." />
          <PrintSetting name="여백" value="없음" note="‘기본값’이어도 괜찮습니다." />
          {kind === "card" && hanji && <PrintSetting name="배경 그래픽" value="체크" note="‘설정 더보기’를 누르면 나옵니다. 체크해야 한지 배경이 인쇄됩니다." />}
        </ul>
      </Modal>

      <ItemZoom
        art={zoomArt}
        index={zoomIndex}
        total={targets.length}
        width={item.width}
        height={item.height}
        onClose={() => setZoomId(null)}
        onMove={(delta) => {
          const next = targets[zoomIndex + delta];
          if (next) setZoomId(next.id);
        }}
      >
        {zoomArt && renderItem(zoomArt)}
      </ItemZoom>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { background: #fff !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-sheets .sheet { display: block !important; box-shadow: none !important; margin: 0 !important; transform: none !important; break-after: page; }
          .print-sheets .sheet { break-inside: avoid; }
          .print-sheets > .sheet-wrap:last-child .sheet { break-after: auto; }
          html, body, body > div { min-height: 0 !important; }
        }
      `}</style>
    </div>
  );
}

/** 명제표·스티커 하나를 크게 본다. 인쇄될 모습 그대로(mm)를 창 너비에 맞게 키운다. ←/→로 넘긴다. */
function ItemZoom({
  art,
  index,
  total,
  width,
  height,
  onClose,
  onMove,
  children,
}: {
  art: AdminArtworkSummary | null;
  index: number;
  total: number;
  width: number;
  height: number;
  onClose: () => void;
  onMove: (delta: number) => void;
  children: ReactNode;
}) {
  const open = art !== null;
  const onMoveRef = useRef(onMove);
  useLayoutEffect(() => {
    onMoveRef.current = onMove;
  });
  useLayoutEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") onMoveRef.current(-1);
      if (e.key === "ArrowRight") onMoveRef.current(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={art?.title ?? ""}
      description={`실제 크기 ${width}×${height}mm · 인쇄되는 모습 그대로입니다`}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <InkButton variant="ghost" icon={<IconChevronLeft size={18} />} disabled={index <= 0} onClick={() => onMove(-1)}>
            이전
          </InkButton>
          <span className="tabular text-[14px] font-semibold text-ink-soft">
            {index + 1} / {total}
          </span>
          <InkButton variant="ghost" disabled={index >= total - 1} onClick={() => onMove(1)}>
            다음 <IconChevronRight size={18} />
          </InkButton>
        </div>
      }
    >
      <div className="rounded-2xl bg-paper-deep/50 p-3 sm:p-5">
        <ScaledMm width={width} height={height}>
          {children}
        </ScaledMm>
      </div>
    </Modal>
  );
}

/** mm로 그린 내용을 부모 너비에 꼭 맞게 키우거나 줄여 보여 준다(글자 크기 맞춤은 실제 mm 기준 그대로). */
function ScaledMm({ width, height, children }: { width: number; height: number; children: ReactNode }) {
  const [scale, setScale] = useState(0);
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const fit = () => inner.offsetWidth > 0 && setScale(outer.clientWidth / inner.offsetWidth);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(outer);
    return () => ro.disconnect();
  }, [width, height]);
  return (
    <div ref={outerRef} className="mx-auto w-full" style={{ maxWidth: 640, aspectRatio: `${width} / ${height}` }}>
      <div
        ref={innerRef}
        className="origin-top-left"
        style={{ width: `${width}mm`, height: `${height}mm`, transform: `scale(${scale})`, visibility: scale ? "visible" : "hidden" }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * A4 한 장. 화면에서는 작업대 높이에 맞게 줄여 보여주고, 인쇄할 때는 실제 크기.
 * 지금 보지 않는 장도 display:none으로 숨기지 않고 보이지 않게만 둔다:
 * 숨기면 크기가 0으로 재어져 글자 크기 맞춤(FitText)이 틀어지고, 그대로 인쇄되어 글이 잘린다.
 */
function Sheet({ visible, children }: { visible: boolean; children: ReactNode }) {
  return (
    <div
      aria-hidden={!visible || undefined}
      className={cn(
        "sheet-wrap",
        !visible &&
          "pointer-events-none invisible absolute inset-x-0 top-0 h-0 overflow-hidden print:visible print:static print:h-auto print:overflow-visible",
      )}
    >
      <div className="mx-auto w-full print:!max-w-none" style={{ maxWidth: SHEET_MAX_WIDTH }}>
        <div className="relative w-full print:!aspect-auto print:w-auto" style={{ aspectRatio: `${A4.width} / ${A4.height}` }}>
          <div
            className="sheet absolute left-0 top-0 origin-top-left overflow-hidden bg-white shadow-[0_2px_4px_rgb(0_0_0/0.06),0_24px_60px_-24px_rgb(60_40_10/0.45)] print:static"
            style={{ width: `${A4.width}mm`, height: `${A4.height}mm`, transform: "scale(var(--sheet-scale, 1))" }}
            ref={(el) => {
              if (!el) return;
              const parent = el.parentElement;
              if (!parent) return;
              const fit = () => {
                const mm = el.offsetWidth; // 210mm의 실제 px
                if (mm > 0) el.style.setProperty("--sheet-scale", String(parent.clientWidth / mm));
              };
              fit();
              const ro = new ResizeObserver(fit);
              ro.observe(parent);
              return () => ro.disconnect();
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function CutFrame({ show }: { show: boolean }) {
  if (!show) return null;
  return <span className="pointer-events-none absolute -inset-[1mm] rounded-[1mm] border-[0.2mm] border-dashed border-[#b9ae98]" aria-hidden />;
}

/** 카드 크기별 글자·여백 설정(mm) */
const CARD_TYPE: Record<
  CardSize,
  { pad: number; label: number; title: number; artist: number; artistLines: number; meta: number; hint: number; gap: number }
> = {
  business: { pad: 4.2, label: 2.6, title: 6.4, artist: 3.3, artistLines: 3, meta: 2.8, hint: 3.3, gap: 3.5 },
  a6: { pad: 7.5, label: 4, title: 12.5, artist: 5.6, artistLines: 3, meta: 4.4, hint: 6, gap: 6.5 },
  square: { pad: 6, label: 3.3, title: 8, artist: 4.2, artistLines: 3, meta: 3.3, hint: 4.2, gap: 3 },
};

function LabelCard({
  art,
  url,
  size,
  qr,
  hanji,
  cutMarks,
  exhibitionTitle,
  organizer,
}: {
  art: AdminArtworkSummary;
  url: string;
  size: CardSize;
  qr: number;
  hanji: boolean;
  cutMarks: boolean;
  exhibitionTitle: string;
  organizer: string;
}) {
  const t = CARD_TYPE[size];
  const vertical = size === "square";
  const mm = (v: number) => `${v}mm`;

  // 명제표 전체가 넘치면(작가가 많거나 재료가 길 때) 작품명만 조금씩 줄인다(절반까지).
  // 그래도 넘치면 전시명을 빼고 다시 맞춘다.
  // 작가와 재료·크기는 서로 영향을 주지 않도록 늘 같은 크기·같은 모양으로 둔다.
  // 자식(FitText)들이 먼저 제 폭에 맞춘 뒤 여기서 높이를 재므로, 모든 글이 한 번에 맞춰진다.
  const [{ shrink, hideLabel }, setFit] = useState({ shrink: 1, hideLabel: false });
  const [fontTick, setFontTick] = useState(0);
  const columnRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = columnRef.current;
    if (!el || el.clientHeight === 0) return;
    if (el.scrollHeight <= el.clientHeight || (shrink <= 0.5 && hideLabel)) return;
    // 1) 작품명을 70%까지 줄인다 → 2) 그래도 넘치면 전시명을 빼고 다시 크게 → 3) 그 뒤로 50%까지 줄인다.
    // 실제로 그려진 높이를 재서 크기를 고친다(화면에 그리기 전에 끝난다).
    setFit((f) =>
      f.shrink > (f.hideLabel ? 0.5 : 0.7)
        ? { ...f, shrink: Math.round((f.shrink - 0.06) * 100) / 100 }
        : // 모든 명제표에 똑같이 적힌 전시명을 이 카드에서만 빼고, 작품명을 다시 크게 맞춘다.
          { shrink: 1, hideLabel: true },
    );
  }, [shrink, hideLabel, fontTick, art.title, art.artists, art.material, art.size]);
  useLayoutEffect(() => {
    let alive = true;
    document.fonts?.ready.then(() => alive && setFontTick((n) => n + 1));
    return () => {
      alive = false;
    };
  }, []);
  const titleMax = t.title * shrink;
  const artistsInLines = art.artists.length <= t.artistLines;

  const qrBox = (
    <div className="shrink-0 self-center rounded-[1.8mm] bg-white shadow-[0_0.4mm_1.2mm_rgb(70_52_24/0.18)]" style={{ padding: mm(1.8) }}>
      <div style={{ width: mm(qr - 3.6), height: mm(qr - 3.6) }}>
        <QrCode value={url} label={`${art.title} QR 코드`} />
      </div>
    </div>
  );

  // 안내 문구는 항상 한 줄: 넘치면 글자를 줄인다.
  // 안내 문구는 항상 한 줄. A6·정사각은 카드 아래 전체 폭 띠로 크게, 명함은 글 칸 안에 짧게.
  const band = size !== "business";
  const hint = (
    <FitText
      max={t.hint}
      min={t.hint * 0.6}
      className={cn("w-full font-bold", band ? "rounded-[1.6mm] bg-[#dde7f4] text-center text-[#1d4382]" : "text-[#2a5caa]")}
      style={band ? { padding: `${t.hint * 0.32}mm ${t.hint * 0.6}mm` } : undefined}
    >
      <svg
        viewBox="0 0 24 24"
        style={{ width: "1.2em", height: "1.2em", verticalAlign: "-0.24em", marginRight: "0.3em", display: "inline-block" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        aria-hidden
      >
        <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
        <path d="M10.5 18.5h3" strokeLinecap="round" />
      </svg>
      {size === "business" ? "휴대폰으로 QR을 찍어 보세요" : "휴대폰으로 QR을 찍으면 작품 이야기를 볼 수 있습니다"}
    </FitText>
  );

  return (
    <div className="relative h-full w-full">
      <CutFrame show={cutMarks} />
      <div
        className="relative flex h-full w-full flex-col overflow-hidden rounded-[2.5mm] text-[#2a2926]"
        style={{
          padding: mm(t.pad),
          gap: mm(t.gap * 0.7),
          backgroundColor: hanji ? "#f6f0e3" : "#fff",
          backgroundImage: hanji ? "var(--hanji)" : undefined,
          backgroundSize: "60mm 60mm",
          border: hanji ? "none" : "0.25mm solid #d9cfbb",
        }}
      >
      <div
        className="flex min-h-0 flex-1"
        style={{
          gap: mm(t.gap),
          flexDirection: vertical ? "column" : "row",
          alignItems: vertical ? "center" : "stretch",
          justifyContent: vertical ? "space-between" : undefined,
        }}
      >
        <div
          ref={columnRef}
          className={cn("flex min-h-0 min-w-0 flex-col justify-between overflow-hidden [&>*]:shrink-0", vertical ? "w-full flex-none items-center text-center" : "flex-1")}
        >
          <div className={cn("w-full min-w-0", vertical && "text-center")}>
            {/* 모든 글은 잘라내지(…) 않고, 칸에 맞게 글자 크기를 줄인다 */}
            {!hideLabel && (
              <FitText max={t.label} min={t.label * 0.6} fallbackLines={2} className="w-full font-bold tracking-[0.02em] text-[#2a5caa]">
                {size === "a6" ? `${organizer} · ${exhibitionTitle}` : exhibitionTitle}
              </FitText>
            )}
            {/* 작품명: 한 줄로 알맞은 크기(약 72%)까지만 줄이고, 그래도 길면 두 줄로 나눠 크게 둔다 */}
            <FitText
              max={titleMax}
              // 작품명은 작가 이름보다 작아지지 않는다(글의 위계를 지킨다).
              min={Math.max(titleMax * 0.5, t.artist * 1.12)}
              lines={1}
              fallbackLines={2}
              wrapBelow={0.72}
              lineHeight={1.16}
              className="w-full font-serif font-bold tracking-[-0.015em]"
              style={{ marginTop: hideLabel ? 0 : mm(t.label * 0.6) }}
            >
              {art.title}
            </FitText>
            {art.artists.length > 0 && (
              // 작가: 쪽빛 세로줄 옆에 한 사람씩 한 줄로. 많으면(4명 이상) ‘ · ’로 이어 쓴다.
              <FitText
                max={t.artist}
                min={t.artist * 0.55}
                lines={artistsInLines ? art.artists.length : 1}
                fallbackLines={artistsInLines ? Math.min(art.artists.length * 2, 4) : t.artistLines}
                wrapBelow={0.8}
                lineHeight={1.28}
                className={cn("w-full font-semibold text-[#3f3b34]", !vertical && "border-l-[0.55mm] border-[#b9cbe6]")}
                style={{ marginTop: mm(t.artist * 0.55), paddingLeft: vertical ? undefined : mm(t.artist * 0.5) }}
              >
                {art.artists.map((name, i) =>
                  artistsInLines ? (
                    // 한 사람씩 한 줄. 이름이 아주 길면(단체명 등) 알맞은 크기에서 한 번 더 줄을 바꾼다.
                    <span key={`${name}-${i}`} className="block">
                      {name}
                    </span>
                  ) : (
                    <Fragment key={`${name}-${i}`}>
                      <span className="whitespace-nowrap">
                        {name}
                        {i < art.artists.length - 1 && <span className="text-[#9db3d6]"> ·</span>}
                      </span>
                      {i < art.artists.length - 1 ? " " : ""}
                    </Fragment>
                  ),
                )}
              </FitText>
            )}
            {(art.material || art.size) && (
              <div style={{ marginTop: mm(t.meta * 0.75) }}>
                {(
                  [
                    ["재료", art.material],
                    ["크기", art.size],
                  ] as const
                )
                  .filter(([, v]) => v)
                  .map(([label, value]) => (
                    // 재료·크기는 늘 같은 크기: 길면 줄이지 않고 다음 줄로 넘긴다.
                    <FitText key={label} max={t.meta} min={t.meta * 0.6} fallbackLines={2} wrapBelow={0.97} lineHeight={1.35} className="w-full text-[#57524a]">
                      <span className="mr-[0.55em] font-bold text-[#2a5caa]">{label}</span>
                      {value}
                    </FitText>
                  ))}
              </div>
            )}
          </div>
          {!band && hint}
        </div>

        {qrBox}
      </div>
      {band && hint}
      </div>
    </div>
  );
}

function LabelSticker({ art, url, size, caption, cutMarks }: { art: AdminArtworkSummary; url: string; size: StickerSize; caption: boolean; cutMarks: boolean }) {
  return (
    <div className="relative flex h-full w-full flex-col items-center bg-white">
      <CutFrame show={cutMarks} />
      <div style={{ width: `${size}mm`, height: `${size}mm`, padding: "1.6mm" }}>
        <QrCode value={url} label={`${art.title} QR 코드`} />
      </div>
      {caption && (
        // 작품명은 한 줄: 길면 말줄임 대신 글자를 줄인다
        <div className="flex w-full items-center px-[1.5mm]" style={{ height: `${STICKER_CAPTION_HEIGHT}mm`, paddingBottom: "1mm" }}>
          <FitText max={Math.min(4.6, size / 8.5)} min={Math.min(4.6, size / 8.5) * 0.4} lineHeight={1.2} className="w-full text-center font-serif font-bold text-[#2a2926]">
            {art.title}
          </FitText>
        </div>
      )}
    </div>
  );
}

function Panel({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="deckle rounded-[22px] px-5 py-5">
      <div className="mb-3.5 flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-bold text-ink">{title}</h2>
        {aside}
      </div>
      {children}
    </div>
  );
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="grid rounded-xl bg-paper-deep/70 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }} role="radiogroup">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          onClick={() => onChange(key)}
          className={cn("relative h-9 rounded-lg text-[13.5px] font-semibold transition-colors", value === key ? "text-blue-deep" : "text-ink-soft hover:text-ink")}
        >
          {value === key && (
            <motion.span
              layoutId={`seg-${options.map((o) => o[0]).join("")}`}
              className="absolute inset-0 rounded-lg bg-paper-light shadow-[var(--shadow-paper)]"
              transition={{ type: "spring", stiffness: 500, damping: 38 }}
            />
          )}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  );
}

/** 크기 선택지: 실제 비율의 작은 도형을 함께 보여준다. */
function Choice({ active, onClick, shape, children }: { active: boolean; onClick: () => void; shape: { width: number; height: number }; children: ReactNode }) {
  const scale = 26 / Math.max(shape.width, shape.height);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-[14.5px] font-semibold transition-all",
        active ? "border-blue bg-blue-mist/60 text-blue-deep" : "border-paper-edge bg-paper-light/60 text-ink hover:border-[#cfc2a6]",
      )}
    >
      <span className="flex h-7 w-8 shrink-0 items-center justify-center">
        <span
          className={cn("block rounded-[3px] border-[1.5px]", active ? "border-blue bg-blue/15" : "border-ink-faint/60 bg-paper-deep")}
          style={{ width: shape.width * scale, height: shape.height * scale }}
        />
      </span>
      <span className="min-w-0 flex-1">{children}</span>
      {active && <IconCheck size={16} strokeWidth={2.6} className="shrink-0 text-blue" />}
    </button>
  );
}

/** 인쇄 창 설정 한 줄: 왼쪽은 항목 이름, 오른쪽은 골라야 할 값 */
function PrintSetting({ name, value, note }: { name: string; value: string; note?: string }) {
  return (
    <li className="flex items-start justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-[15.5px] font-semibold text-ink">{name}</p>
        {note && <p className="mt-0.5 text-[13px] leading-relaxed text-ink-faint">{note}</p>}
      </div>
      <span className="shrink-0 rounded-lg bg-blue-mist px-3 py-1.5 text-[15px] font-bold text-blue-deep">{value}</span>
    </li>
  );
}
