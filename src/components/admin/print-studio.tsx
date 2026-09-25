"use client";

import { AnimatePresence, motion } from "motion/react";
import { Fragment, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { InkButton } from "@/components/ui/ink-button";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { IconAlert, IconCheck, IconChevronLeft, IconChevronRight, IconImage, IconPrinter } from "@/components/ui/icons";
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
  const layout = computeSheetLayout(item, { margin: 8, gap: cutMarks ? 4 : 2 });
  const pages = paginate(targets, layout.perPage);
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

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)_320px] print:mt-0 print:block">
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

                <div className="print-sheets">
                  {pages.map((items, pi) => (
                    <Sheet key={pi} visible={pi === currentPage}>
                      {items.map((art, i) => {
                        const pos = cellPosition(layout, item, i);
                        return (
                          <div key={art.id} className="absolute" style={{ left: `${pos.x}mm`, top: `${pos.y}mm`, width: `${item.width}mm`, height: `${item.height}mm` }}>
                            {kind === "card" ? (
                              <LabelCard
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
                            )}
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

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { background: #fff !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-sheets .sheet { display: block !important; box-shadow: none !important; margin: 0 !important; transform: none !important; break-after: page; }
          .print-sheets .sheet-wrap:not(.hidden) .sheet, .print-sheets .sheet { break-inside: avoid; }
          .print-sheets > .sheet-wrap:last-child .sheet { break-after: auto; }
          html, body, body > div { min-height: 0 !important; }
        }
      `}</style>
    </div>
  );
}

/** A4 한 장. 화면에서는 작업대 높이에 맞게 줄여 보여주고, 인쇄할 때는 실제 크기. */
function Sheet({ visible, children }: { visible: boolean; children: ReactNode }) {
  return (
    <div className={cn("sheet-wrap", !visible && "hidden print:block")}>
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
  { pad: number; label: number; title: number; titleLines: number; artist: number; artistLines: number; meta: number; hint: number; gap: number }
> = {
  business: { pad: 4.2, label: 2.7, title: 6.4, titleLines: 2, artist: 3.5, artistLines: 2, meta: 2.7, hint: 2.8, gap: 3.5 },
  a6: { pad: 8.5, label: 4, title: 12.5, titleLines: 2, artist: 6, artistLines: 3, meta: 4.4, hint: 4.2, gap: 7 },
  square: { pad: 6.5, label: 3.3, title: 8.4, titleLines: 2, artist: 4.5, artistLines: 2, meta: 3.4, hint: 3.4, gap: 3 },
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
  const meta = [art.material, art.size].filter(Boolean).join(" · ");
  const vertical = size === "square";
  const mm = (v: number) => `${v}mm`;

  const qrBox = (
    <div className="shrink-0 self-center rounded-[1.8mm] bg-white shadow-[0_0.4mm_1.2mm_rgb(70_52_24/0.18)]" style={{ padding: mm(1.8) }}>
      <div style={{ width: mm(qr - 3.6), height: mm(qr - 3.6) }}>
        <QrCode value={url} label={`${art.title} QR 코드`} />
      </div>
    </div>
  );

  // 안내 문구는 항상 한 줄: 넘치면 글자를 줄인다.
  const hint = (
    <FitText max={t.hint} min={t.hint * 0.55} className={cn("w-full font-bold text-[#2a5caa]", vertical && "text-center")}>
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
        className="relative flex h-full w-full overflow-hidden rounded-[2.5mm] text-[#2a2926]"
        style={{
          padding: mm(t.pad),
          gap: mm(t.gap),
          flexDirection: vertical ? "column" : "row",
          alignItems: vertical ? "center" : "stretch",
          justifyContent: vertical ? "space-between" : undefined,
          backgroundColor: hanji ? "#f6f0e3" : "#fff",
          backgroundImage: hanji ? "var(--hanji)" : undefined,
          backgroundSize: "60mm 60mm",
          border: hanji ? "none" : "0.25mm solid #d9cfbb",
        }}
      >
        <div className={cn("flex min-w-0 flex-col justify-between", vertical ? "w-full flex-none items-center text-center" : "flex-1")}>
          <div className={cn("w-full min-w-0", vertical && "text-center")}>
            {/* 모든 글은 잘라내지(…) 않고, 칸에 맞게 글자 크기를 줄인다 */}
            <FitText max={t.label} min={t.label * 0.6} fallbackLines={2} className="w-full font-bold tracking-[0.02em] text-[#2a5caa]">
              {size === "a6" ? `${organizer} · ${exhibitionTitle}` : exhibitionTitle}
            </FitText>
            <FitText
              max={t.title}
              min={t.title * 0.55}
              fallbackLines={t.titleLines}
              wrapBelow={0.78}
              lineHeight={1.18}
              className="w-full font-serif font-bold tracking-[-0.01em]"
              style={{ marginTop: mm(t.label * 0.55) }}
            >
              {art.title}
            </FitText>
            {art.artists.length > 0 && (
              <FitText
                max={t.artist}
                min={t.artist * 0.5}
                lines={1}
                fallbackLines={t.artistLines}
                wrapBelow={0.8}
                lineHeight={1.3}
                className="w-full font-semibold text-[#4b473f]"
                style={{ marginTop: mm(t.artist * 0.4) }}
              >
                {/* 이름 하나(예: "3반 친구들")는 절대 중간에서 나뉘지 않고, 이름과 이름 사이에서만 줄이 바뀐다 */}
                {art.artists.map((name, i) => (
                  <Fragment key={`${name}-${i}`}>
                    <span className="whitespace-nowrap">
                      {name}
                      {i < art.artists.length - 1 ? "," : ""}
                    </span>
                    {i < art.artists.length - 1 ? " " : ""}
                  </Fragment>
                ))}
              </FitText>
            )}
            {meta && (
              <FitText max={t.meta} min={t.meta * 0.6} className="w-full text-[#7d776b]" style={{ marginTop: mm(t.meta * 0.45) }}>
                {meta}
              </FitText>
            )}
          </div>
          {!vertical && hint}
        </div>

        {qrBox}
        {vertical && hint}
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
        <p
          className="w-full truncate px-[1.5mm] text-center font-serif font-bold text-[#2a2926]"
          style={{ fontSize: `${Math.min(4.6, size / 8.5)}mm`, height: `${STICKER_CAPTION_HEIGHT}mm`, lineHeight: `${STICKER_CAPTION_HEIGHT - 2.5}mm` }}
        >
          {art.title}
        </p>
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
