"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { InkButton } from "@/components/ui/ink-button";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { IconAlert, IconCheck, IconChevronLeft, IconChevronRight, IconPrinter } from "@/components/ui/icons";
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
import { QrCode } from "./qr-code";

type Scope = "all" | "published" | "selected";

const noopSubscribe = () => () => {};

export function PrintStudio({ artworks, preselected }: { artworks: AdminArtworkSummary[]; preselected: string[] }) {
  const { siteUrl } = useAdmin();
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

  const { item, qr } = templateGeometry(kind, { cardSize, stickerSize, stickerCaption });
  const layout = computeSheetLayout(item, { margin: 8, gap: cutMarks ? 4 : 2 });
  const pages = paginate(targets, layout.perPage);
  const currentPage = Math.min(page, Math.max(0, pages.length - 1));
  const smallQr = qr < MIN_RECOMMENDED_QR_MM;

  function doPrint() {
    if (targets.length === 0) {
      toast.error(messageFor("PRINT_EMPTY"));
      return;
    }
    if (hanji) setPrintHelp(true);
    else window.print();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-32 pt-7 sm:px-6 sm:pt-10 print:m-0 print:max-w-none print:p-0">
      <div className="print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-[1.9rem] font-bold tracking-[-0.02em] text-ink">QR 인쇄</h1>
            <p className="mt-1 text-[15px] text-ink-soft">
              A4 한 장에 <b className="tabular text-blue">{layout.perPage}</b>개씩, 모두 <b className="tabular text-blue">{pages.length}</b>장이 나와요.
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
              지금 접속한 주소와 QR 코드에 들어가는 주소(<b className="break-all font-mono">{siteUrl}</b>)가 달라요. 최종 사이트 주소가 맞는지 꼭 확인한 뒤 인쇄해 주세요.
            </p>
          </div>
        )}
      </div>

      <div className="mt-7 grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)] print:mt-0 print:block">
        {/* 설정 */}
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
            <div className="mt-4 space-y-2">
              {kind === "card"
                ? (Object.keys(CARD_SIZES) as CardSize[]).map((key) => (
                    <Choice key={key} active={cardSize === key} onClick={() => (setCardSize(key), setPage(0))}>
                      {CARD_SIZES[key].label}
                    </Choice>
                  ))
                : STICKER_SIZES.map((s) => (
                    <Choice key={s} active={stickerSize === s} onClick={() => (setStickerSize(s), setPage(0))}>
                      {s}×{s}mm{s === 30 && <span className="ml-1.5 text-[12.5px] font-normal text-danger">QR이 작아요</span>}
                    </Choice>
                  ))}
            </div>
            {kind === "sticker" && (
              <div className="mt-4">
                <Switch size="sm" checked={stickerCaption} onChange={(v) => (setStickerCaption(v), setPage(0))} label="QR 아래에 작품명 넣기" />
              </div>
            )}
            <AnimatePresence>
              {smallQr && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 overflow-hidden rounded-xl bg-danger-mist/70 px-3 py-2 text-[13px] text-danger"
                >
                  QR이 {qr}mm로 작아서 멀리서는 잘 안 찍힐 수 있어요. {MIN_RECOMMENDED_QR_MM}mm 이상을 권장해요.
                </motion.p>
              )}
            </AnimatePresence>
          </Panel>

          <Panel title="옵션">
            <div className="space-y-3">
              {kind === "card" && <Switch size="sm" checked={hanji} onChange={setHanji} label="한지 배경 (끄면 잉크 절약)" />}
              <Switch size="sm" checked={cutMarks} onChange={setCutMarks} label="자르는 선 표시" />
            </div>
          </Panel>

          <Panel title="인쇄할 작품">
            <Segmented
              value={scope}
              onChange={(v) => (setScope(v), setPage(0))}
              options={[
                ["published", `공개 ${artworks.filter((a) => a.isPublished).length}`],
                ["all", `전체 ${artworks.length}`],
                ["selected", `선택 ${selected.size}`],
              ]}
            />
            <AnimatePresence initial={false}>
              {scope === "selected" && (
                <motion.ul
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 max-h-80 space-y-1 overflow-y-auto overflow-x-hidden pr-1"
                >
                  {artworks.map((a) => {
                    const on = selected.has(a.id);
                    return (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelected((s) => {
                              const n = new Set(s);
                              if (on) n.delete(a.id);
                              else n.add(a.id);
                              return n;
                            });
                            setPage(0);
                          }}
                          aria-pressed={on}
                          className={cn("flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors", on ? "bg-blue-mist/70" : "hover:bg-paper-deep/60")}
                        >
                          <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors", on ? "border-blue bg-blue text-paper-light" : "border-paper-edge")}>
                            {on && <IconCheck size={12} strokeWidth={3.2} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14.5px] font-semibold text-ink">{a.title}</span>
                            <span className="block truncate text-[12px] text-ink-faint">{joinArtists(a.artists)}</span>
                          </span>
                          {!a.isPublished && <span className="shrink-0 rounded-full bg-paper-deep px-2 py-0.5 text-[11px] text-ink-faint">준비 중</span>}
                        </button>
                      </li>
                    );
                  })}
                </motion.ul>
              )}
            </AnimatePresence>
          </Panel>
        </aside>

        {/* 미리보기 + 실제 인쇄 영역 */}
        <section aria-label="인쇄 미리보기">
          {targets.length === 0 ? (
            <div className="deckle flex aspect-[210/297] max-w-xl items-center justify-center rounded-lg text-center text-ink-soft print:hidden">
              <p>
                인쇄할 작품이 없어요.
                <br />
                왼쪽에서 작품을 골라 주세요.
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
                  className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-paper-deep disabled:opacity-30"
                >
                  <IconChevronLeft />
                </button>
                <span className="tabular min-w-20 text-center text-[15px] font-semibold text-ink">
                  {currentPage + 1} / {pages.length}장
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pages.length - 1, p + 1))}
                  disabled={currentPage >= pages.length - 1}
                  aria-label="다음 장"
                  className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-paper-deep disabled:opacity-30"
                >
                  <IconChevronRight />
                </button>
              </div>

              <div className="print-sheets">
                {pages.map((items, pi) => (
                  <Sheet key={pi} visible={pi === currentPage} cutMarks={cutMarks}>
                    {items.map((art, i) => {
                      const pos = cellPosition(layout, item, i);
                      return (
                        <div key={art.id} className="absolute" style={{ left: `${pos.x}mm`, top: `${pos.y}mm`, width: `${item.width}mm`, height: `${item.height}mm` }}>
                          {kind === "card" ? (
                            <LabelCard art={art} url={`${siteUrl}/a/${art.id}`} size={cardSize} qr={qr} hanji={hanji} cutMarks={cutMarks} />
                          ) : (
                            <LabelSticker art={art} url={`${siteUrl}/a/${art.id}`} size={stickerSize} caption={stickerCaption} cutMarks={cutMarks} />
                          )}
                        </div>
                      );
                    })}
                  </Sheet>
                ))}
              </div>
              <p className="mt-4 text-center text-[13px] text-ink-faint print:hidden">실제 크기(mm) 그대로 인쇄돼요. 인쇄 창에서 ‘배율: 100%(실제 크기)’를 골라 주세요.</p>
            </>
          )}
        </section>
      </div>

      <Modal
        open={printHelp}
        onClose={() => setPrintHelp(false)}
        title="인쇄 전에 확인해 주세요"
        description="한지 배경이 나오려면 인쇄 창에서 두 가지를 설정해야 해요."
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
              확인했어요, 인쇄하기
            </InkButton>
          </>
        }
      >
        <ol className="space-y-2.5 text-[15px] leading-relaxed text-ink">
          <li className="flex gap-3">
            <Num>1</Num> 설정 더보기에서 <b>‘배경 그래픽’</b>에 체크해요.
          </li>
          <li className="flex gap-3">
            <Num>2</Num> 배율은 <b>‘100%’</b> 또는 <b>‘실제 크기’</b>로 해요.
          </li>
          <li className="flex gap-3">
            <Num>3</Num> 종이는 <b>A4</b>, 여백은 <b>‘없음’</b> 또는 <b>‘기본값’</b>이면 돼요.
          </li>
        </ol>
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

/** A4 한 장. 화면에서는 너비에 맞게 줄여 보여주고, 인쇄할 때는 실제 크기. */
function Sheet({ visible, cutMarks, children }: { visible: boolean; cutMarks: boolean; children: ReactNode }) {
  return (
    <div className={cn("sheet-wrap", !visible && "hidden print:block")} data-cut={cutMarks || undefined}>
      <div className="mx-auto w-full max-w-[640px] print:max-w-none">
        <div className="relative w-full print:!aspect-auto print:w-auto" style={{ aspectRatio: `${A4.width} / ${A4.height}` }}>
          <div
            className="sheet absolute left-0 top-0 origin-top-left overflow-hidden bg-white shadow-[0_2px_4px_rgb(0_0_0/0.06),0_20px_50px_-20px_rgb(60_40_10/0.35)] print:static"
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

function LabelCard({ art, url, size, qr, hanji, cutMarks }: { art: AdminArtworkSummary; url: string; size: CardSize; qr: number; hanji: boolean; cutMarks: boolean }) {
  const artists = joinArtists(art.artists);
  const titleMm = { business: 5.2, a6: 8, square: 6.6 }[size];
  const pad = { business: 4.5, a6: 8, square: 6.5 }[size];
  const vertical = size === "square";

  return (
    <div className="relative h-full w-full">
      <CutFrame show={cutMarks} />
      <div
        className="relative flex h-full w-full overflow-hidden rounded-[2.5mm] text-[#2a2926]"
        style={{
          padding: `${pad}mm`,
          gap: `${pad * 0.8}mm`,
          flexDirection: vertical ? "column" : "row",
          backgroundColor: hanji ? "#f7f3ea" : "#fff",
          backgroundImage: hanji ? "var(--hanji-noise), var(--hanji-fiber)" : undefined,
          backgroundSize: "220px 220px, 600px 600px",
          border: hanji ? "none" : "0.25mm solid #d9cfbb",
        }}
      >
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <p className="font-bold text-[#2a5caa]" style={{ fontSize: `${titleMm * 0.42}mm`, letterSpacing: "0.02em" }}>
              작품 이야기
            </p>
            <p className="mt-[1mm] font-serif font-bold leading-[1.2]" style={{ fontSize: `${titleMm}mm`, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {art.title}
            </p>
            {artists && (
              <p className="mt-[1.2mm] leading-snug text-[#4b473f]" style={{ fontSize: `${titleMm * 0.55}mm`, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {artists}
              </p>
            )}
            {(art.material || art.size) && size !== "business" && (
              <p className="mt-[1mm] text-[#8f897c]" style={{ fontSize: `${titleMm * 0.45}mm` }}>
                {[art.material, art.size].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <p className="flex items-center gap-[1mm] font-semibold text-[#2a5caa]" style={{ fontSize: `${titleMm * 0.46}mm` }}>
            <svg viewBox="0 0 24 24" style={{ width: `${titleMm * 0.6}mm`, height: `${titleMm * 0.6}mm` }} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
              <path d="M10.5 18.5h3" strokeLinecap="round" />
            </svg>
            휴대폰 카메라로 찍어 보세요
          </p>
        </div>
        <div className={cn("flex shrink-0 flex-col items-center justify-center", vertical && "self-center")}>
          <div className="rounded-[1.5mm] bg-white" style={{ padding: "1.6mm" }}>
            <div style={{ width: `${qr - 3.2}mm`, height: `${qr - 3.2}mm` }}>
              <QrCode value={url} label={`${art.title} QR 코드`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LabelSticker({ art, url, size, caption, cutMarks }: { art: AdminArtworkSummary; url: string; size: StickerSize; caption: boolean; cutMarks: boolean }) {
  return (
    <div className="relative flex h-full w-full flex-col items-center bg-white">
      <CutFrame show={cutMarks} />
      <div style={{ width: `${size}mm`, height: `${size}mm`, padding: "2mm" }}>
        <QrCode value={url} label={`${art.title} QR 코드`} />
      </div>
      {caption && (
        <p className="w-full truncate px-[1.5mm] text-center font-serif font-bold leading-none text-[#2a2926]" style={{ fontSize: `${Math.min(3.6, size / 11)}mm`, height: `${STICKER_CAPTION_HEIGHT}mm`, lineHeight: `${STICKER_CAPTION_HEIGHT - 2}mm` }}>
          {art.title}
        </p>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="deckle rounded-[22px] px-5 py-5">
      <h2 className="mb-3.5 text-[15px] font-bold text-ink">{title}</h2>
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
          {value === key && <motion.span layoutId={`seg-${options.map((o) => o[0]).join("")}`} className="absolute inset-0 rounded-lg bg-paper-light shadow-[var(--shadow-paper)]" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  );
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-[14.5px] font-semibold transition-all",
        active ? "border-blue bg-blue-mist/60 text-blue-deep" : "border-paper-edge bg-paper-light/60 text-ink hover:border-[#cfc2a6]",
      )}
    >
      <span className={cn("flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border-2", active ? "border-blue" : "border-paper-edge")}>
        {active && <span className="h-2 w-2 rounded-full bg-blue" />}
      </span>
      {children}
    </button>
  );
}

function Num({ children }: { children: ReactNode }) {
  return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue text-[13px] font-bold text-paper-light">{children}</span>;
}
