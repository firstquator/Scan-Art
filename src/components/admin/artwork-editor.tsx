"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { discardUploadsAction, saveArtworkAction } from "@/app/admin/actions";
import { ArtworkView } from "@/components/artwork/artwork-view";
import { TextArea, TextField } from "@/components/ui/field";
import { InkButton } from "@/components/ui/ink-button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { IconArrowLeft, IconCheck, IconEye, IconPencil } from "@/components/ui/icons";
import type { EditableArtwork } from "@/lib/data/artworks";
import { messageFor } from "@/lib/errors";
import type { ArtworkView as ArtworkViewData } from "@/lib/types";
import type { ArtworkInput } from "@/lib/validation";
import { parseYouTubeId, youTubeThumbnail } from "@/lib/youtube";
import { cn } from "@/lib/cn";
import { useAdmin } from "./admin-context";
import { ArtistsInput } from "./artists-input";
import { AudioRecorder } from "./audio-recorder";
import type { EditorAudio, EditorImage } from "./editor-types";
import { ImageUploader } from "./image-uploader";
import { PhoneFrame } from "./phone-preview";
import { QrPanel } from "./qr-panel";
import { useLeaveGuard } from "./use-leave-guard";

type Fields = Omit<ArtworkInput, "images" | "audio">;

function toEditorImages(initial: EditableArtwork): EditorImage[] {
  return initial.images.map((data, i) => ({ key: `saved-${i}-${data.urlSm}`, status: "done", progress: 100, data }));
}

function snapshot(fields: Fields, images: EditorImage[], audio: EditorAudio | null) {
  return JSON.stringify({ fields, images: images.map((i) => i.data ?? i.key), audio });
}

export function ArtworkEditor({ initial }: { initial: EditableArtwork }) {
  const { storageMode, siteUrl, exhibitionTitle, organizer } = useAdmin();
  const router = useRouter();
  const toast = useToast();

  const [isNew, setIsNew] = useState(initial.isNew);
  const [fields, setFields] = useState<Fields>(() => ({
    id: initial.id,
    title: initial.title,
    artists: initial.artists,
    material: initial.material,
    size: initial.size,
    description: initial.description,
    ttsEnabled: initial.ttsEnabled,
    youtubeUrl: initial.youtubeUrl,
    isPublished: initial.isPublished,
  }));
  const [images, setImages] = useState<EditorImage[]>(() => toEditorImages(initial));
  const [audio, setAudio] = useState<EditorAudio | null>(initial.audio);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [mobileTab, setMobileTab] = useState<"form" | "preview">("form");
  const [baseline, setBaseline] = useState(() => snapshot(fields, images, audio));
  const [savedFlash, setSavedFlash] = useState(false);

  // 이번 편집에서 새로 올렸지만 아직 저장되지 않은 파일
  const sessionUploads = useRef(new Set<string>());

  const current = snapshot(fields, images, audio);
  const dirty = current !== baseline;
  const uploading = images.some((i) => i.status === "processing" || i.status === "uploading");
  const failed = images.some((i) => i.status === "error");

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => {
    setFields((f) => ({ ...f, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const discard = useCallback(() => {
    const urls = Array.from(sessionUploads.current);
    sessionUploads.current.clear();
    if (urls.length) void discardUploadsAction(urls);
  }, []);

  useLeaveGuard(dirty || uploading, discard);

  function removeImage(img: EditorImage) {
    // 이번에 새로 올린(아직 어디에도 저장 안 된) 사진은 바로 지운다. 저장된 사진은 저장할 때 정리된다.
    const urls = [img.data?.urlLg, img.data?.urlSm].filter((u): u is string => !!u && sessionUploads.current.has(u));
    if (urls.length) {
      urls.forEach((u) => sessionUploads.current.delete(u));
      void discardUploadsAction(urls);
    }
  }

  function changeAudio(next: EditorAudio | null) {
    if (audio && audio.url !== next?.url && sessionUploads.current.has(audio.url)) {
      sessionUploads.current.delete(audio.url);
      void discardUploadsAction([audio.url]);
    }
    setAudio(next);
  }

  async function save() {
    if (uploading || audioBusy) {
      toast.info(messageFor("UPLOAD_PENDING"));
      return;
    }
    if (failed) {
      toast.error("올리지 못한 사진이 있습니다. 다시 올리거나 빼 주세요.");
      return;
    }
    setSaving(true);
    const payload: ArtworkInput = {
      ...fields,
      images: images.filter((i) => i.status === "done" && i.data).map((i) => i.data!),
      audio,
    };
    const result = await saveArtworkAction(payload);
    setSaving(false);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.fieldErrors ? firstError(result.fieldErrors) ?? result.message : result.message);
      if (result.fieldErrors) {
        setMobileTab("form");
        requestAnimationFrame(() => document.querySelector("[aria-invalid='true']")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      }
      return;
    }

    sessionUploads.current.clear();
    setBaseline(current);
    setErrors({});
    setSavedFlash(true);
    toast.success(result.data.created ? "작품을 등록했습니다. 이제 QR 코드를 인쇄할 수 있습니다." : "저장했습니다.");
    if (result.data.created) {
      setIsNew(false);
      router.replace(`/admin/artworks/${fields.id}`, { scroll: false });
    }
    router.refresh();
  }

  useEffect(() => {
    if (!savedFlash) return;
    const t = setTimeout(() => setSavedFlash(false), 2200);
    return () => clearTimeout(t);
  }, [savedFlash]);

  // Ctrl/⌘ + S 로 저장
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveRef.current();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const previewData: ArtworkViewData = useMemo(
    () => ({
      id: fields.id,
      title: fields.title,
      artists: fields.artists,
      material: fields.material,
      size: fields.size,
      description: fields.description,
      ttsEnabled: fields.ttsEnabled,
      youtubeUrl: parseYouTubeId(fields.youtubeUrl) ? fields.youtubeUrl : "",
      audio: audio ? { url: audio.url, duration: audio.duration } : null,
      images: images.filter((i) => i.data).map((i) => i.data!),
    }),
    [fields, images, audio],
  );

  const youtubeId = parseYouTubeId(fields.youtubeUrl);
  const doneImages = images.filter((i) => i.status === "done" && i.data);

  return (
    <div className="w-full px-4 pb-32 pt-5 sm:px-6 sm:pt-7 lg:px-8">
      {/* 머리말 */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink"
          aria-label="작품 목록으로"
        >
          <IconArrowLeft />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-blue">{isNew ? "새 작품 등록" : "작품 수정"}</p>
          <h1 className="truncate font-serif text-[1.55rem] font-bold tracking-[-0.02em] text-ink sm:text-[1.8rem]">
            {fields.title || "제목 없는 작품"}
          </h1>
        </div>
        <SaveStatus dirty={dirty} saving={saving} flash={savedFlash} uploading={uploading || audioBusy} />
        <InkButton onClick={save} loading={saving} size="lg" className="max-sm:hidden" icon={<IconCheck size={20} strokeWidth={2.4} />}>
          {isNew ? "등록하기" : "저장"}
        </InkButton>
      </div>

      {/* 휴대폰: 입력/미리보기 전환 */}
      <div className="mt-5 grid grid-cols-2 rounded-2xl bg-paper-deep/70 p-1 lg:hidden" role="tablist">
        {(
          [
            ["form", "입력하기", IconPencil],
            ["preview", "미리보기", IconEye],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mobileTab === key}
            onClick={() => setMobileTab(key)}
            className={cn("relative flex h-11 items-center justify-center gap-2 rounded-xl text-[15px] font-semibold transition-colors", mobileTab === key ? "text-blue-deep" : "text-ink-soft")}
          >
            {mobileTab === key && (
              <motion.span layoutId="editor-tab" className="absolute inset-0 rounded-xl bg-paper-light shadow-[var(--shadow-paper)]" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
            )}
            <Icon size={18} className="relative" />
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px] xl:gap-8">
        {/* 입력 폼: 넓은 화면에서는 2×2, 같은 줄의 카드는 높이를 맞춘다 */}
        <div className={cn("grid content-start gap-6 2xl:grid-cols-2", mobileTab !== "form" && "hidden lg:grid")}>
          <Section title="작품 사진" hint="첫 번째 사진이 대표 사진이 되어 목록·명제표·공유 미리보기에 쓰입니다.">
            <ImageUploader
              artworkId={fields.id}
              storageMode={storageMode}
              images={images}
              setImages={setImages}
              onUploaded={(urls) => urls.forEach((u) => sessionUploads.current.add(u))}
              onRemoved={removeImage}
              error={errors.images}
            />
            {doneImages.length > 0 && (
              <details className="group mt-4 rounded-2xl bg-paper-deep/40 px-4 py-3">
                <summary className="cursor-pointer list-none text-[14px] font-semibold text-ink-soft marker:hidden">
                  <span className="inline-block transition-transform group-open:rotate-90">›</span> 사진 설명 적기{" "}
                  <span className="font-normal text-ink-faint">(화면 읽기 프로그램을 쓰는 관람객을 위해, 선택)</span>
                </summary>
                <ul className="mt-3 space-y-2.5">
                  {doneImages.map((img, i) => (
                    <li key={img.key} className="flex items-center gap-3">
                      <img src={img.data!.urlSm} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                      <input
                        value={img.data!.alt}
                        maxLength={120}
                        onChange={(e) =>
                          setImages((list) => list.map((x) => (x.key === img.key && x.data ? { ...x, data: { ...x.data, alt: e.target.value } } : x)))
                        }
                        placeholder={`${i + 1}번째 사진: 예) 파란 물감으로 칠한 바다 그림`}
                        aria-label={`${i + 1}번째 사진 설명`}
                        className="h-11 min-w-0 flex-1 rounded-xl border border-paper-edge bg-paper-light/90 px-3 text-[15px] focus:border-blue focus:outline-none"
                      />
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Section>

          <Section title="공개와 QR 코드" className="2xl:col-start-2 2xl:row-start-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Switch checked={fields.isPublished} onChange={(v) => set("isPublished", v)} label={fields.isPublished ? "관람객에게 공개 중" : "아직 준비 중 (비공개)"} />
              <p className="text-[13px] text-ink-faint sm:max-w-[55%] sm:text-right">
                비공개일 때 QR을 찍으면 ‘작품 이야기를 준비하고 있습니다’ 화면이 나타납니다. QR을 먼저 인쇄해 붙여도 괜찮습니다.
              </p>
            </div>
            <Divider />
            <QrPanel id={fields.id} title={fields.title} saved={!isNew} />
          </Section>

          <Section title="작품 정보">
            <div className="space-y-5">
                <TextField
                  label="작품명"
                  value={fields.title}
                  onChange={(e) => set("title", e.target.value)}
                  maxLength={80}
                  placeholder="예) 봄날의 정원"
                  error={errors.title}
                  autoFocus={isNew}
                />
                <ArtistsInput value={fields.artists} onChange={(v) => set("artists", v)} error={errors.artists ?? firstMatching(errors, "artists.")} />
                <div className="grid gap-5 sm:grid-cols-2">
                  <TextField label="재료" optional value={fields.material} onChange={(e) => set("material", e.target.value)} maxLength={60} placeholder="예) 종이에 수채" error={errors.material} />
                  <TextField label="크기" optional value={fields.size} onChange={(e) => set("size", e.target.value)} maxLength={60} placeholder="예) 40×30cm" error={errors.size} />
                </div>
            </div>
            <Divider />
            <TextArea
              label="설명"
              optional
              value={fields.description}
              onChange={(e) => set("description", e.target.value)}
              maxLength={3000}
              placeholder="작품을 만든 이야기, 작가의 생각, 재미있는 과정 등을 적어 주세요. 줄을 바꾸면 문단이 나뉩니다."
              error={errors.description}
              hint="짧은 문장으로 나눠 쓰면 휴대폰에서 읽기 편하고, 읽어주기 기능도 더 자연스럽습니다."
            />
            <div className="mt-4 rounded-2xl bg-paper-deep/40 px-4 py-3.5">
              <Switch checked={fields.ttsEnabled} onChange={(v) => set("ttsEnabled", v)} label="녹음이 없을 때 ‘읽어주기’ 버튼 보여주기" />
              <p className="mt-1.5 pl-[60px] text-[13px] leading-relaxed text-ink-faint">휴대폰이 설명을 소리 내어 읽어 줍니다. 목소리 녹음이 있으면 녹음이 먼저 재생됩니다.</p>
            </div>
          </Section>

          <Section title="소리와 영상" hint="모두 선택 사항입니다. 넣으면 관람객 화면에 듣기·영상 영역이 생깁니다.">
            <SubHead title="작가의 목소리" hint="학생이 직접 작품을 소개하는 목소리를 담아 보세요." />
            <AudioRecorder
              artworkId={fields.id}
              storageMode={storageMode}
              audio={audio}
              onChange={changeAudio}
              onUploaded={(u) => sessionUploads.current.add(u)}
              onBusyChange={setAudioBusy}
            />
            <Divider />
            <SubHead title="영상" hint="제작 과정이나 인터뷰 영상이 유튜브에 있다면 주소를 붙여넣어 주세요." />
            <TextField
              label="유튜브 주소"
              optional
              type="url"
              inputMode="url"
              value={fields.youtubeUrl}
              onChange={(e) => set("youtubeUrl", e.target.value)}
              placeholder="https://youtu.be/…"
              error={errors.youtubeUrl ?? (fields.youtubeUrl.trim() && !youtubeId ? messageFor("YOUTUBE_INVALID") : undefined)}
            />
            <AnimatePresence>
              {youtubeId && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="mt-3 flex items-center gap-3 rounded-2xl bg-success-mist/60 p-2.5 pr-4">
                    <img src={youTubeThumbnail(youtubeId)} alt="" className="h-14 w-24 rounded-lg object-cover" />
                    <p className="flex items-center gap-1.5 text-[14px] font-semibold text-success">
                      <IconCheck size={16} strokeWidth={2.6} /> 영상을 찾았습니다
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Section>
        </div>

        {/* 미리보기 */}
        <aside className={cn("lg:block", mobileTab !== "preview" && "hidden")}>
          <div className="lg:sticky lg:top-24">
            <PhoneFrame>
              <ArtworkView
                artwork={previewData}
                prev={null}
                next={null}
                index={-1}
                total={0}
                exhibitionTitle={exhibitionTitle}
                organizer={organizer}
                shareUrl={`${siteUrl}/a/${fields.id}`}
                preview
              />
            </PhoneFrame>
          </div>
        </aside>
      </div>

      {/* 휴대폰: 아래 저장 막대 */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-4 pb-3 sm:hidden">
        <InkButton onClick={save} loading={saving} size="lg" className="w-full shadow-[0_14px_30px_-10px_rgb(42_92_170/0.7)]" icon={<IconCheck size={20} strokeWidth={2.4} />}>
          {isNew ? "등록하기" : dirty ? "저장하기" : "저장됨"}
        </InkButton>
      </div>
    </div>
  );
}

function Section({ title, hint, children, className }: { title: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("deckle rounded-[26px] px-5 py-6 sm:px-7 sm:py-7", className)}>
      <h2 className="flex items-center gap-2.5 font-serif text-[1.2rem] font-bold text-ink">
        <span className="h-4 w-1 rounded-full bg-blue" aria-hidden />
        {title}
      </h2>
      {hint && <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-faint">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SubHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3.5">
      <h3 className="text-[15.5px] font-bold text-ink">{title}</h3>
      {hint && <p className="mt-0.5 text-[13px] leading-relaxed text-ink-faint">{hint}</p>}
    </div>
  );
}

function Divider() {
  return <hr className="my-6 border-0 border-t border-dashed border-paper-edge" />;
}

function SaveStatus({ dirty, saving, flash, uploading }: { dirty: boolean; saving: boolean; flash: boolean; uploading: boolean }) {
  let content: ReactNode = null;
  if (saving) content = <span className="text-ink-faint">저장하는 중…</span>;
  else if (uploading) content = <span className="text-blue">파일 올리는 중…</span>;
  else if (flash)
    content = (
      <span className="flex items-center gap-1 text-success">
        <IconCheck size={15} strokeWidth={2.6} /> 저장됨
      </span>
    );
  else if (dirty)
    content = (
      <span className="flex items-center gap-1.5 text-danger">
        <span className="h-2 w-2 rounded-full bg-danger" /> 저장 안 됨
      </span>
    );
  return (
    <AnimatePresence mode="wait">
      {content && (
        <motion.span
          key={saving ? "s" : uploading ? "u" : flash ? "f" : "d"}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="hidden text-[13.5px] font-semibold min-[420px]:block"
          role="status"
        >
          {content}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

function firstError(errors: Record<string, string>): string | undefined {
  return Object.values(errors)[0];
}

function firstMatching(errors: Record<string, string>, prefix: string): string | undefined {
  const key = Object.keys(errors).find((k) => k.startsWith(prefix));
  return key ? errors[key] : undefined;
}

