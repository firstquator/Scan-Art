"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
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
import { IconPlus, IconPrinter, IconSearch, IconX } from "@/components/ui/icons";
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
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
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
        toast.success(value ? "관람객에게 공개했어요." : "비공개로 바꿨어요. QR을 찍으면 '준비 중' 화면이 보여요.");
      }
    });
  }

  async function remove(item: AdminArtworkSummary) {
    const ok = await confirm({
      title: `‘${item.title}’ 작품을 삭제할까요?`,
      description: "작품 사진과 녹음도 함께 지워지고, 되돌릴 수 없어요. 이미 붙여 둔 QR을 찍으면 '볼 수 없는 작품' 화면이 보여요.",
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
    if (result.ok) toast.success("작품을 삭제했어요.");
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
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-7 sm:px-6 sm:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[1.9rem] font-bold tracking-[-0.02em] text-ink">
            전시 작품 <span className="tabular text-blue">{items.length}</span>
          </h1>
          <p className="mt-1 text-[15px] text-ink-soft">
            공개 {publishedCount} · 준비 중 {items.length - publishedCount}
            {items.length > 1 && <span className="hidden sm:inline"> · 손잡이를 끌어 전시 순서를 바꿀 수 있어요</span>}
          </p>
        </div>
        <Link href="/admin/artworks/new" className={buttonClass("primary", "lg", "gap-2.5 max-sm:hidden")}>
          <IconPlus size={20} strokeWidth={2.4} />
          새 작품 등록
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <IconSearch size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="작품명이나 작가 이름으로 찾기"
            aria-label="작품 찾기"
            className="h-12 w-full rounded-2xl border border-paper-edge bg-paper-light/90 pl-11 pr-11 text-[16px] shadow-[var(--shadow-inset)] placeholder:text-ink-faint/80 focus:border-blue focus:bg-white focus:shadow-[0_0_0_4px_rgb(42_92_170/0.14)] focus:outline-none"
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

      {q && (
        <p className="mt-3 text-sm text-ink-faint">검색 중에는 순서를 바꿀 수 없어요. 검색어를 지우면 다시 끌어서 옮길 수 있어요.</p>
      )}

      {items.length === 0 ? (
        <EmptyState />
      ) : visible.length === 0 ? (
        <p className="mt-16 text-center text-ink-soft">‘{query}’에 맞는 작품이 없어요.</p>
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
              draggable: "스페이스바를 눌러 잡고, 화살표로 옮긴 뒤 다시 스페이스바를 눌러 내려놓으세요. 취소는 ESC.",
            },
            announcements: {
              onDragStart: () => "작품을 잡았어요.",
              onDragOver: ({ over }) => (over ? "여기로 옮길 수 있어요." : "옮길 자리가 아니에요."),
              onDragEnd: ({ over }) => (over ? "작품을 옮겼어요." : "제자리에 두었어요."),
              onDragCancel: () => "옮기기를 취소했어요.",
            },
          }}
        >
          <SortableContext items={visible.map((a) => a.id)} strategy={rectSortingStrategy} disabled={!!q}>
            <ul className="mt-7 grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
        "flex items-center gap-3 rounded-2xl border px-4 py-2.5 sm:w-72",
        warn ? "border-danger/40 bg-danger-mist/60" : "border-paper-edge bg-paper-light/70",
      )}
      title="사진·녹음 파일이 차지하는 저장 공간"
    >
      <div className="min-w-0 flex-1">
        <div className="flex justify-between text-[12.5px]">
          <span className={cn("font-semibold", warn ? "text-danger" : "text-ink-soft")}>{warn ? "저장 공간이 거의 찼어요" : "저장 공간"}</span>
          <span className="tabular text-ink-faint">
            {formatBytes(used)} / {formatBytes(limit)}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-deep">
          <motion.div
            className={cn("h-full rounded-full", warn ? "bg-danger" : "bg-blue")}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(1.5, ratio * 100))}%` }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="deckle mx-auto mt-12 max-w-lg rounded-[28px] px-7 py-12 text-center">
      <p className="font-hand text-[2rem] leading-none text-blue-deep">첫 작품을 등록해 볼까요?</p>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
        작품 사진을 찍고, 이름과 이야기를 적어 주세요.
        <br />
        학생의 목소리로 작품 소개를 녹음할 수도 있어요.
      </p>
      <Link href="/admin/artworks/new" className={buttonClass("primary", "lg", "mt-7")}>
        <IconPlus size={20} strokeWidth={2.4} />
        새 작품 등록
      </Link>
    </div>
  );
}
