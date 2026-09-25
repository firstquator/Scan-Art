"use client";

import { closestCenter, DndContext, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "motion/react";
import { nanoid } from "nanoid";
import { useId, useRef, useState, type Dispatch, type DragEvent, type SetStateAction } from "react";
import { useToast } from "@/components/ui/toast";
import { IconAlert, IconCamera, IconGrip, IconImage, IconRefresh, IconTrash, IconUpload } from "@/components/ui/icons";
import { convertImage } from "@/lib/image/process";
import { uploadFile, type StorageMode } from "@/lib/storage/client";
import { AppError, messageFor, toErrorCode } from "@/lib/errors";
import { MAX_IMAGES } from "@/lib/validation";
import { tap } from "@/lib/haptics";
import { cn } from "@/lib/cn";
import type { EditorImage } from "./editor-types";

interface ImageUploaderProps {
  artworkId: string;
  storageMode: StorageMode;
  images: EditorImage[];
  setImages: Dispatch<SetStateAction<EditorImage[]>>;
  /** 이번 편집에서 새로 올린 파일 주소(저장 안 하고 나가면 지우기 위해) */
  onUploaded: (urls: string[]) => void;
  /** 사진을 목록에서 뺐을 때 */
  onRemoved: (image: EditorImage) => void;
  error?: string;
}

/** 여러 장 끌어다 놓기·선택·카메라 촬영 → WebP 자동 변환 → 업로드. 드래그로 순서 변경. */
export function ImageUploader({ artworkId, storageMode, images, setImages, onUploaded, onRemoved, error }: ImageUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const dndId = useId();
  const toast = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  function patch(key: string, value: Partial<EditorImage>) {
    setImages((list) => list.map((img) => (img.key === key ? { ...img, ...value } : img)));
  }

  async function processOne(key: string, file: File) {
    try {
      patch(key, { status: "processing", progress: 0, errorCode: undefined });
      const converted = await convertImage(file);
      patch(key, { status: "uploading", progress: 5 });

      const base = `artworks/${artworkId}/${nanoid(10)}`;
      const progress = { lg: 0, sm: 0 };
      const report = () => patch(key, { progress: 5 + (progress.lg * 0.8 + progress.sm * 0.2) * 0.95 });
      const [urlLg, urlSm] = await Promise.all([
        uploadFile({ mode: storageMode, pathname: `${base}-lg.webp`, file: converted.lg, contentType: "image/webp", onProgress: (p) => ((progress.lg = p), report()) }),
        uploadFile({ mode: storageMode, pathname: `${base}-sm.webp`, file: converted.sm, contentType: "image/webp", onProgress: (p) => ((progress.sm = p), report()) }),
      ]);
      onUploaded([urlLg, urlSm]);
      patch(key, {
        status: "done",
        progress: 100,
        file: undefined,
        data: {
          urlLg,
          urlSm,
          width: converted.width,
          height: converted.height,
          blurData: converted.blurData,
          alt: "",
          bytes: converted.lg.size + converted.sm.size,
        },
      });
    } catch (err) {
      const code = err instanceof AppError ? err.code : toErrorCode(err);
      patch(key, { status: "error", errorCode: code === "UNKNOWN" ? "UPLOAD_FAILED" : code });
    }
  }

  function addFiles(list: FileList | File[]) {
    const files = Array.from(list);
    if (files.length === 0) return;
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      toast.error(messageFor("IMAGE_LIMIT"));
      return;
    }
    if (files.length > room) toast.info(`사진은 ${MAX_IMAGES}장까지예요. 앞의 ${room}장만 올릴게요.`);

    const entries = files.slice(0, room).map((file) => ({
      key: nanoid(8),
      file,
      preview: /image\/(jpe?g|png|webp|gif|avif)/.test(file.type) ? URL.createObjectURL(file) : undefined,
    }));
    setImages((prev) => [
      ...prev,
      ...entries.map((e) => ({ key: e.key, status: "processing" as const, progress: 0, localPreview: e.preview, file: e.file })),
    ]);
    tap();
    // 휴대폰 메모리를 아끼려고 한 장씩 차례로 변환한다.
    for (const e of entries) {
      queue.current = queue.current.then(() => processOne(e.key, e.file));
    }
  }

  function retry(img: EditorImage) {
    if (!img.file) return;
    const file = img.file;
    queue.current = queue.current.then(() => processOne(img.key, file));
  }

  function remove(img: EditorImage) {
    setImages((list) => list.filter((i) => i.key !== img.key));
    if (img.localPreview) URL.revokeObjectURL(img.localPreview);
    onRemoved(img);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }

  function onSortEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setImages((list) => {
      const from = list.findIndex((i) => i.key === active.id);
      const to = list.findIndex((i) => i.key === over.id);
      return arrayMove(list, from, to);
    });
    tap(8);
  }

  const full = images.length >= MAX_IMAGES;

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "relative rounded-[22px] border-2 border-dashed p-3 transition-colors duration-300",
          dragOver ? "border-blue bg-blue-mist/50" : error ? "border-danger/50" : "border-paper-edge",
        )}
      >
        <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onSortEnd}>
          <SortableContext items={images.map((i) => i.key)} strategy={rectSortingStrategy}>
            <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              <AnimatePresence initial={false}>
                {images.map((img, i) => (
                  <ImageTile key={img.key} image={img} isCover={i === 0} onRemove={() => remove(img)} onRetry={() => retry(img)} />
                ))}
              </AnimatePresence>
              {!full && (
                <li className="col-span-1">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="group flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-2xl bg-paper-light/70 text-ink-soft transition-all duration-300 hover:bg-blue-mist/60 hover:text-blue-deep active:scale-[0.97]"
                  >
                    <IconUpload size={24} className="transition-transform duration-300 group-hover:-translate-y-0.5" />
                    <span className="text-[13px] font-semibold">사진 올리기</span>
                  </button>
                </li>
              )}
            </ul>
          </SortableContext>
        </DndContext>

        {images.length === 0 && (
          <p className="pointer-events-none mt-3 text-center text-[13.5px] text-ink-faint">
            사진을 여기로 끌어다 놓거나 눌러서 골라 주세요. 첫 번째 사진이 대표 사진이 돼요.
          </p>
        )}

        <AnimatePresence>
          {dragOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[20px] bg-blue-mist/80 text-lg font-semibold text-blue-deep"
            >
              여기에 놓으면 올라가요
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={full}
          className="flex h-11 items-center gap-2 rounded-2xl bg-blue-mist px-4 text-[14.5px] font-semibold text-blue-deep transition-[background-color,transform] hover:bg-[#cfdcef] active:scale-[0.97] disabled:opacity-40 sm:hidden"
        >
          <IconCamera size={19} /> 카메라로 찍기
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={full}
          className="flex h-11 items-center gap-2 rounded-2xl border border-paper-edge bg-paper-light/80 px-4 text-[14.5px] font-semibold text-ink transition-[background-color,transform] hover:bg-paper-deep/60 active:scale-[0.97] disabled:opacity-40"
        >
          <IconImage size={19} /> 앨범에서 고르기
        </button>
        <span className="tabular ml-auto text-[13px] text-ink-faint">
          {images.length} / {MAX_IMAGES}장 · 자동으로 WebP 변환
        </span>
      </div>
      {error && <p className="mt-2 text-sm font-medium text-danger">{error}</p>}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function ImageTile({ image, isCover, onRemove, onRetry }: { image: EditorImage; isCover: boolean; onRemove: () => void; onRetry: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.key,
    disabled: image.status !== "done",
  });
  const src = image.data?.urlSm ?? image.localPreview;
  const busy = image.status === "processing" || image.status === "uploading";

  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform) ?? undefined, transition }} className={cn("relative", isDragging && "z-10")}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: isDragging ? 1.06 : 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ type: "spring", stiffness: 420, damping: 30 }}
        className={cn(
          "group relative aspect-square overflow-hidden rounded-2xl bg-paper-deep shadow-[var(--shadow-paper)]",
          isDragging && "shadow-[var(--shadow-lift)]",
          image.status === "error" && "ring-2 ring-danger/60",
        )}
      >
        {src ? (
          <img src={src} alt="" className={cn("h-full w-full object-cover transition-[filter,opacity] duration-500", busy && "opacity-70 blur-[1.5px]")} draggable={false} />
        ) : (
          <span className="flex h-full items-center justify-center text-ink-faint">
            <IconImage size={26} strokeWidth={1.4} />
          </span>
        )}

        {image.status === "done" && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="사진 순서 옮기기"
            className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
          />
        )}

        {busy && (
          <span className="absolute inset-x-2 bottom-2 flex flex-col gap-1">
            <span className="rounded-full bg-ink/60 px-2 py-0.5 text-center text-[11px] font-semibold text-paper-light backdrop-blur-sm">
              {image.status === "processing" ? "변환 중" : `올리는 중 ${Math.round(image.progress)}%`}
            </span>
            <span className="h-1 overflow-hidden rounded-full bg-paper-light/60">
              <motion.span
                className="block h-full rounded-full bg-blue"
                animate={{ width: image.status === "processing" ? ["10%", "45%", "10%"] : `${image.progress}%` }}
                transition={image.status === "processing" ? { duration: 1.4, repeat: Infinity } : { duration: 0.3 }}
              />
            </span>
          </span>
        )}

        {image.status === "error" && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-danger-mist/90 p-2 text-center">
            <IconAlert size={20} className="text-danger" />
            <span className="text-[11px] font-semibold leading-tight text-danger">{image.errorCode ? shortError(image.errorCode) : "실패"}</span>
            {image.file && (
              <button type="button" onClick={onRetry} className="mt-0.5 flex items-center gap-1 rounded-full bg-paper-light px-2.5 py-1 text-[11.5px] font-semibold text-ink shadow">
                <IconRefresh size={12} /> 다시
              </button>
            )}
          </span>
        )}

        {isCover && image.status === "done" && (
          <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-blue px-2 py-0.5 text-[10.5px] font-bold text-paper-light shadow">대표</span>
        )}

        {image.status === "done" && (
          <span className="pointer-events-none absolute bottom-1.5 left-1.5 text-paper-light opacity-0 drop-shadow transition-opacity group-hover:opacity-100">
            <IconGrip size={16} />
          </span>
        )}

        <button
          type="button"
          onClick={onRemove}
          aria-label="사진 빼기"
          className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-ink/55 text-paper-light backdrop-blur-sm transition-[background-color,transform] hover:bg-danger active:scale-90"
        >
          <IconTrash size={14} />
        </button>
      </motion.div>
    </li>
  );
}

function shortError(code: string): string {
  switch (code) {
    case "IMAGE_UNSUPPORTED":
      return "읽을 수 없는 사진";
    case "FILE_TOO_LARGE":
      return "파일이 너무 커요";
    case "NETWORK":
      return "연결이 불안정해요";
    case "UNAUTHORIZED":
      return "다시 로그인 필요";
    default:
      return "올리지 못했어요";
  }
}
