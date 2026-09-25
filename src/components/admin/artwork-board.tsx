"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import { deleteArtworkAction, reorderArtworksAction, setPublishedAction } from "@/app/admin/actions";
import { useConfirm } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { buttonClass, InkButton } from "@/components/ui/ink-button";
import { IconExternal, IconEye, IconMove, IconPlus, IconPrinter, IconSearch, IconX } from "@/components/ui/icons";
import type { AdminArtworkSummary } from "@/lib/types";
import { formatBytes } from "@/lib/format";
import { tap } from "@/lib/haptics";
import { cn } from "@/lib/cn";
import { ArtworkCard, ArtworkCardGhost } from "./artwork-card";

interface ArtworkBoardProps {
  initial: AdminArtworkSummary[];
  usage: { used: number; limit: number };
}

export function ArtworkBoard({ initial, usage }: ArtworkBoardProps) {
  const [items, setItems] = useState(initial);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const dndId = useId();

  // 서버에서 새 목록이 오면(저장·삭제 후 새로고침) 반영한다.
  const [lastInitial, setLastInitial] = useState(initial);
  if (initial !== lastInitial) {
    setLastInitial(initial);
    setItems(initial);
  }

  const sensors = useSensors(
    // 카드 어디를 잡아도 끌 수 있다. 마우스는 6px 움직이면, 터치는 0.25초 꾹 누르면 시작한다.
    // (짧게 누르면 클릭·스크롤·옆으로 밀기가 그대로 동작한다)
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      q
        ? items.filter((a) => a.title.toLowerCase().includes(q) || a.artists.some((n) => n.toLowerCase().includes(q)))
        : items,
    [items, q],
  );
  const publishedCount = items.filter((a) => a.isPublished).length;
  const activeItem = items.find((a) => a.id === activeId) ?? null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
    tap(12);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const before = items;
    const from = items.findIndex((a) => a.id === active.id);
    const to = items.findIndex((a) => a.id === over.id);
    const next = arrayMove(items, from, to);
    setItems(next);
    tap(8);
    startTransition(async () => {
      const result = await reorderArtworksAction(next.map((a) => a.id));
      if (!result.ok) {
        setItems(before);
        toast.error(result.message);
      }
    });
  }

  function togglePublished(id: string, value: boolean) {
    setItems((list) => list.map((a) => (a.id === id ? { ...a, isPublished: value } : a)));
    startTransition(async () => {
      const result = await setPublishedAction(id, value);
      if (!result.ok) {
        setItems((list) => list.map((a) => (a.id === id ? { ...a, isPublished: !value } : a)));
        toast.error(result.message);
      } else {
        toast.success(value ? "관람객에게 공개했습니다." : "비공개로 바꿨습니다. QR을 찍으면 '준비 중' 화면이 나타납니다.");
      }
    });
  }

  async function remove(item: AdminArtworkSummary) {
    const ok = await confirm({
      title: `‘${item.title}’ 작품을 삭제하시겠습니까?`,
      description: "작품 사진과 녹음도 함께 지워지며 되돌릴 수 없습니다. 이미 붙여 둔 QR을 찍으면 '볼 수 없는 작품' 화면이 나타납니다.",
      confirmLabel: "삭제하기",
      tone: "danger",
    });
    if (!ok) return;
    const before = items;
    setItems((list) => list.filter((a) => a.id !== item.id));
    setSelected((s) => {
      const n = new Set(s);
      n.delete(item.id);
      return n;
    });
    const result = await deleteArtworkAction(item.id);
    if (result.ok) toast.success("작품을 삭제했습니다.");
    else {
      setItems(before);
      toast.error(result.message);
    }
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const usageRatio = usage.limit > 0 ? usage.used / usage.limit : 0;

  return (
    <main className="w-full px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <h1 className="font-serif text-[1.9rem] font-bold tracking-[-0.02em] text-ink">전시 작품</h1>
          <StatBar total={items.length} published={publishedCount} />
        </div>
        <div className="flex items-center gap-2.5">
          <a href="/exhibition" target="_blank" rel="noopener" className={buttonClass("secondary", "lg", "gap-2")}>
            <IconEye size={19} />
            전시 표지 보기
            <IconExternal size={14} className="opacity-60" />
          </a>
          <Link href="/admin/artworks/new" className={buttonClass("primary", "lg", "gap-2.5 max-sm:hidden")}>
            <IconPlus size={20} strokeWidth={2.4} />
            새 작품 등록
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="relative flex-1">
          <IconSearch size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="작품명이나 작가 이름으로 찾기"
            aria-label="작품 찾기"
            className="h-12 w-full rounded-2xl border border-paper-edge bg-paper-light/90 pl-11 pr-11 text-[16px] shadow-[var(--shadow-inset)] placeholder:text-ink-faint/80 focus:border-blue/60 focus:bg-white focus:shadow-[0_0_0_3px_rgb(42_92_170/0.08)] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="검색어 지우기"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-faint hover:bg-paper-deep"
            >
              <IconX size={16} />
            </button>
          )}
        </div>
        <UsageMeter used={usage.used} limit={usage.limit} ratio={usageRatio} />
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[13.5px] text-ink-faint">
        {q ? (
          "검색 중에는 순서를 바꿀 수 없습니다. 검색어를 지우면 다시 끌어서 옮길 수 있습니다."
        ) : items.length > 1 ? (
          <>
            <IconMove size={15} className="shrink-0" />
            <span>
              카드를 끌어서 전시 순서를 바꿀 수 있습니다.<span className="sm:hidden"> 휴대폰에서는 카드를 꾹 누른 뒤 움직입니다.</span>
            </span>
          </>
        ) : null}
      </p>

      {items.length === 0 ? (
        <EmptyState />
      ) : visible.length === 0 ? (
        <p className="mt-16 text-center text-ink-soft">‘{query}’에 맞는 작품이 없습니다.</p>
      ) : (
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveId(null)}
          accessibility={{
            screenReaderInstructions: {
              draggable: "스페이스바를 눌러 잡고, 화살표로 옮긴 뒤 다시 스페이스바를 눌러 내려놓습니다. 취소는 ESC 키입니다.",
            },
            announcements: {
              onDragStart: () => "작품을 잡았습니다.",
              onDragOver: ({ over }) => (over ? "여기로 옮길 수 있습니다." : "옮길 수 없는 자리입니다."),
              onDragEnd: ({ over }) => (over ? "작품을 옮겼습니다." : "제자리에 두었습니다."),
              onDragCancel: () => "옮기기를 취소했습니다.",
            },
          }}
        >
          <SortableContext items={visible.map((a) => a.id)} strategy={rectSortingStrategy} disabled={!!q}>
            <ul className="mt-5 grid grid-cols-1 gap-4 min-[520px]:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] lg:gap-5">
                {visible.map((item) => (
                  <ArtworkCard
                    key={item.id}
                    item={item}
                    order={items.indexOf(item) + 1}
                    sortable={!q}
                    selected={selected.has(item.id)}
                    onToggleSelect={() => toggleSelect(item.id)}
                    onTogglePublished={(v) => togglePublished(item.id, v)}
                    onDelete={() => remove(item)}
                  />
                ))}
            </ul>
          </SortableContext>
          <DragOverlay dropAnimation={{ duration: 260, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
            {activeItem ? <ArtworkCardGhost item={activeItem} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* 휴대폰: 떠 있는 새 작품 버튼 */}
      <Link
        href="/admin/artworks/new"
        aria-label="새 작품 등록"
        className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue text-paper-light shadow-[0_10px_24px_-8px_rgb(42_92_170/0.8)] transition-transform active:scale-90 sm:hidden"
      >
        <IconPlus size={26} strokeWidth={2.4} />
      </Link>

      {/* 선택한 작품 인쇄 */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 sm:bottom-6"
          >
            <div className="deckle flex items-center gap-2 rounded-full py-2 pl-5 pr-2">
              <span className="text-[15px] font-semibold text-ink">
                <span className="tabular text-blue">{selected.size}</span>개 선택
              </span>
              <button type="button" onClick={() => setSelected(new Set())} className="rounded-full px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-paper-deep">
                선택 해제
              </button>
              <InkButton
                size="sm"
                icon={<IconPrinter size={17} />}
                onClick={() => router.push(`/admin/print?ids=${Array.from(selected).join(",")}`)}
                className="rounded-full"
              >
                QR 인쇄
              </InkButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function UsageMeter({ used, limit, ratio }: { used: number; limit: number; ratio: number }) {
  const warn = ratio >= 0.8;
  return (
    <div
      className={cn(
        "flex h-12 items-center gap-3 rounded-2xl border px-4 sm:w-80",
        warn ? "border-danger/40 bg-danger-mist/60" : "border-paper-edge bg-paper-light/80",
      )}
      title="사진·녹음 파일이 차지하는 저장 공간입니다"
    >
      <span className={cn("shrink-0 text-[13px] font-semibold", warn ? "text-danger" : "text-ink-soft")}>{warn ? "공간 부족" : "저장 공간"}</span>
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-paper-deep">
        <motion.div
          className={cn("h-full rounded-full", warn ? "bg-danger" : "bg-blue")}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(1.5, ratio * 100))}%` }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <span className="tabular shrink-0 text-[12.5px] text-ink-faint">
        {formatBytes(used)} / {formatBytes(limit)}
      </span>
    </div>
  );
}

/** 공개·준비 중 개수: 색 점과 큰 숫자로 한눈에 */
function StatBar({ total, published }: { total: number; published: number }) {
  const draft = total - published;
  const stats = [
    { label: "전체", value: total, dot: "bg-ink-soft", tone: "text-ink" },
    { label: "공개", value: published, dot: "bg-success", tone: "text-success" },
    { label: "준비 중", value: draft, dot: "bg-[#c99a2e]", tone: draft > 0 ? "text-[#9a7414]" : "text-ink-faint" },
  ];
  return (
    <dl className="flex items-center rounded-2xl border border-paper-edge bg-paper-light/85 p-1 shadow-[var(--shadow-inset)]">
      {stats.map((s, i) => (
        <div key={s.label} className={cn("flex items-center gap-2 px-3.5 py-1.5", i > 0 && "border-l border-dashed border-paper-edge")}>
          <span className={cn("h-2 w-2 rounded-full", s.dot)} aria-hidden />
          <dt className="text-[13.5px] font-semibold text-ink-soft">{s.label}</dt>
          <dd className={cn("tabular font-serif text-[1.35rem] font-bold leading-none", s.tone)}>{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function EmptyState() {
  return (
    <div className="deckle mx-auto mt-12 max-w-lg rounded-[28px] px-7 py-12 text-center">
      <p className="font-hand text-[2rem] leading-none text-blue-deep">첫 작품을 등록해 보세요</p>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
        작품 사진을 찍고, 이름과 이야기를 적어 주세요.
        <br />
        학생의 목소리로 작품 소개를 녹음할 수도 있습니다.
      </p>
      <Link href="/admin/artworks/new" className={buttonClass("primary", "lg", "mt-7")}>
        <IconPlus size={20} strokeWidth={2.4} />
        새 작품 등록
      </Link>
    </div>
  );
}
