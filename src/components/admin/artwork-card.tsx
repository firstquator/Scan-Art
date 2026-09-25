"use client";

import { useDndMonitor } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { animate, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import Link from "next/link";
import { useRef, useState, type MouseEvent } from "react";
import { ArtImage } from "@/components/artwork/art-image";
import { Switch } from "@/components/ui/switch";
import { IconCheck, IconEye, IconFilm, IconGrip, IconImage, IconMic, IconPencil, IconTrash } from "@/components/ui/icons";
import type { AdminArtworkSummary } from "@/lib/types";
import { joinArtists } from "@/lib/format";
import { tap } from "@/lib/haptics";
import { cn } from "@/lib/cn";

interface ArtworkCardProps {
  item: AdminArtworkSummary;
  order: number;
  sortable: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onTogglePublished: (value: boolean) => void;
  onDelete: () => void;
}

const REVEAL = 148;

/**
 * 관리자 작품 카드.
 * - 카드 어디든 잡고 끌어 순서 바꾸기(@dnd-kit). 키보드는 손잡이 버튼에서 스페이스바로.
 * - 휴대폰에서 카드를 왼쪽으로 밀면 공개 전환·삭제 버튼이 나온다
 */
export function ArtworkCard({ item, order, sortable, selected, onToggleSelect, onTogglePublished, onDelete }: ArtworkCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !sortable,
  });
  const x = useMotionValue(0);
  const actionsOpacity = useTransform(x, [-REVEAL, -40, 0], [1, 0.4, 0]);
  const [opened, setOpened] = useState(false);
  // 끌고 난 직후의 클릭(링크 이동·버튼)은 무시한다. 카드를 내려놓았는데 편집 화면이 열리면 안 된다.
  const draggedAt = useRef(0);
  const dragging = useRef(false);
  useDndMonitor({
    onDragStart: () => {
      dragging.current = true;
      animate(x, 0, { duration: 0.15 });
      setOpened(false);
    },
    onDragEnd: () => {
      dragging.current = false;
      draggedAt.current = Date.now();
    },
    onDragCancel: () => {
      dragging.current = false;
      draggedAt.current = Date.now();
    },
  });

  // 카드 전체에는 마우스·터치로 끄는 동작만, 키보드 조작은 손잡이 버튼에만 붙인다(버튼 안에 버튼이 생기지 않게).
  const { onKeyDown: keyboardListener, ...pointerListeners } = (listeners ?? {}) as Record<string, (e: unknown) => void>;

  function swallowClickAfterDrag(e: MouseEvent) {
    if (Date.now() - draggedAt.current < 250) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function settle(open: boolean) {
    setOpened(open);
    animate(x, open ? -REVEAL : 0, { type: "spring", stiffness: 420, damping: 36 });
    if (open) tap(6);
  }

  function onPanEnd(_: unknown, info: PanInfo) {
    settle(info.offset.x < -60 || info.velocity.x < -400 ? true : info.offset.x > 40 ? false : opened);
  }

  return (
    // 위치(transform)는 dnd-kit이 맡는다. motion은 안쪽 요소에만 써서 transform을 두고 다투지 않게 한다.
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) ?? undefined, transition }}
      className={cn("relative animate-float-in transition-opacity", isDragging && "opacity-35")}
    >
      {/* 밀었을 때 드러나는 동작(휴대폰) */}
      <motion.div style={{ opacity: actionsOpacity }} className="absolute inset-y-0 right-0 flex w-[160px] items-stretch gap-2 py-2 pr-1 sm:hidden">
        <button
          type="button"
          onClick={() => {
            onTogglePublished(!item.isPublished);
            settle(false);
          }}
          className="flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl bg-blue-mist text-[12.5px] font-semibold text-blue-deep"
        >
          <IconEye size={20} />
          {item.isPublished ? "비공개로" : "공개하기"}
        </button>
        <button
          type="button"
          onClick={() => {
            settle(false);
            onDelete();
          }}
          className="flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl bg-danger text-[12.5px] font-semibold text-paper-light"
        >
          <IconTrash size={20} />
          삭제
        </button>
      </motion.div>

      <motion.div
        style={{ x }}
        onPanEnd={onPanEnd}
        onPan={(_, info) => {
          if (dragging.current || window.matchMedia("(min-width: 640px)").matches) return;
          if (Math.abs(info.offset.y) > Math.abs(info.offset.x)) return;
          const base = opened ? -REVEAL : 0;
          x.set(Math.max(-REVEAL - 30, Math.min(0, base + info.offset.x)));
        }}
        {...(sortable ? pointerListeners : {})}
        onClickCapture={swallowClickAfterDrag}
        className={cn(
          "deckle group relative touch-pan-y rounded-[22px] p-2.5 transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]",
          sortable && "cursor-grab active:cursor-grabbing",
          selected && "ring-[2.5px] ring-blue ring-offset-2 ring-offset-paper",
        )}
      >
        <div className="relative">
          <Link
            href={`/admin/artworks/${item.id}`}
            onClick={(e) => {
              if (opened) {
                e.preventDefault();
                settle(false);
              }
            }}
            className="block overflow-hidden rounded-[15px]"
            aria-label={`${item.title} 수정하기`}
            draggable={false}
          >
            <span className="relative block aspect-[4/3] bg-paper-deep">
              {item.cover ? (
                <ArtImage
                  image={item.cover}
                  alt=""
                  sizes="(max-width: 520px) 92vw, 300px"
                  className="h-full w-full transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-ink-faint">
                  <IconImage size={34} strokeWidth={1.3} />
                </span>
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 rounded-full bg-paper-light/90 px-3 py-1.5 text-[13px] font-semibold text-ink opacity-0 shadow backdrop-blur-sm transition-all duration-300 group-hover:opacity-100 sm:translate-y-1 sm:group-hover:translate-y-0">
                <IconPencil size={14} />
                수정
              </span>
            </span>
          </Link>

          <button
            type="button"
            onClick={onToggleSelect}
            aria-pressed={selected}
            aria-label={selected ? "인쇄 선택 해제" : "인쇄할 작품으로 선택"}
            className={cn(
              "absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-200",
              selected ? "border-blue bg-blue text-paper-light" : "border-paper-light/90 bg-ink/25 text-transparent backdrop-blur-sm hover:bg-ink/40",
            )}
          >
            <IconCheck size={16} strokeWidth={3} />
          </button>

          <span className="tabular absolute right-2 top-2 rounded-full bg-paper-light/90 px-2 py-0.5 text-[11.5px] font-bold text-ink-soft backdrop-blur-sm">
            {String(order).padStart(2, "0")}
          </span>
        </div>

        <div className="flex items-start gap-2 px-1.5 pb-1 pt-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-serif text-[17px] font-bold text-ink">{item.title}</h3>
            <p className="mt-0.5 truncate text-[13.5px] text-ink-soft">{joinArtists(item.artists) || "작가 미입력"}</p>
            <div className="mt-2.5 flex items-center gap-1.5 text-ink-faint">
              <Badge on={item.imageCount > 0} label={`사진 ${item.imageCount}장`}>
                <IconImage size={14} />
                <span className="tabular">{item.imageCount}</span>
              </Badge>
              <Badge on={item.hasAudio} label={item.hasAudio ? "녹음 있음" : "녹음 없음"}>
                <IconMic size={14} />
              </Badge>
              <Badge on={item.hasVideo} label={item.hasVideo ? "영상 있음" : "영상 없음"}>
                <IconFilm size={14} />
              </Badge>
            </div>
          </div>
          {sortable && (
            <button
              type="button"
              ref={setActivatorNodeRef}
              {...attributes}
              onKeyDown={keyboardListener}
              aria-label={`${item.title} 순서 옮기기`}
              title="카드를 끌어서 순서를 바꿀 수 있습니다"
              className="-mr-1 flex h-10 w-9 shrink-0 cursor-grab items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-paper-deep hover:text-ink active:cursor-grabbing"
            >
              <IconGrip size={20} />
            </button>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-dashed border-paper-edge px-1.5 pt-2.5">
          <Switch size="sm" checked={item.isPublished} onChange={onTogglePublished} label={item.isPublished ? "공개 중" : "준비 중"} />
          <button
            type="button"
            onClick={onDelete}
            aria-label={`${item.title} 삭제`}
            className="hidden h-9 w-9 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-danger-mist hover:text-danger sm:flex"
          >
            <IconTrash size={18} />
          </button>
        </div>
      </motion.div>
    </li>
  );
}

function Badge({ on, label, children }: { on: boolean; label: string; children: React.ReactNode }) {
  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full px-2 text-[12px] font-semibold",
        on ? "bg-blue-mist text-blue-deep" : "bg-paper-deep/70 text-ink-faint/70",
      )}
    >
      {children}
    </span>
  );
}

/** 끌고 있는 동안 손가락을 따라다니는 카드 */
export function ArtworkCardGhost({ item }: { item: AdminArtworkSummary }) {
  return (
    <div className="deckle rotate-[2deg] scale-[1.04] cursor-grabbing rounded-[22px] p-2.5 shadow-[var(--shadow-lift)]">
      <div className="aspect-[4/3] overflow-hidden rounded-[15px] bg-paper-deep">
        {item.cover && <ArtImage image={item.cover} alt="" sizes="300px" className="h-full w-full" />}
      </div>
      <p className="truncate px-1.5 pb-1 pt-3 font-serif text-[17px] font-bold text-ink">{item.title}</p>
    </div>
  );
}
