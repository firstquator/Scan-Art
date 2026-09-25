"use client";

import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { discardUploadsAction, saveSettingsAction } from "@/app/admin/actions";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { TextArea, TextField } from "@/components/ui/field";
import { InkButton, Spinner } from "@/components/ui/ink-button";
import { useToast } from "@/components/ui/toast";
import { IconCheck, IconImage, IconTrash, IconUpload } from "@/components/ui/icons";
import { convertImage } from "@/lib/image/process";
import { uploadFile } from "@/lib/storage/client";
import type { SiteSettingsView } from "@/lib/types";
import type { SettingsInput } from "@/lib/validation";
import { cn } from "@/lib/cn";
import { useAdmin } from "./admin-context";
import { useLeaveGuard } from "./use-leave-guard";

export function SettingsForm({ initial }: { initial: SiteSettingsView }) {
  const { storageMode } = useAdmin();
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState<SettingsInput>(() => ({
    title: initial.title,
    subtitle: initial.subtitle,
    startDate: initial.startDate,
    endDate: initial.endDate,
    venue: initial.venue,
    intro: initial.intro,
    organizer: initial.organizer,
    cover: initial.cover,
  }));
  const [baseline, setBaseline] = useState(() => JSON.stringify(form));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const sessionUploads = useRef(new Set<string>());
  const dirty = JSON.stringify(form) !== baseline;

  useLeaveGuard(dirty || coverBusy, () => {
    const urls = Array.from(sessionUploads.current);
    sessionUploads.current.clear();
    if (urls.length) void discardUploadsAction(urls);
  });

  const set = <K extends keyof SettingsInput>(key: K, value: SettingsInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  function dropSessionCover() {
    const c = form.cover;
    if (!c) return;
    const urls = [c.urlLg, c.urlSm].filter((u) => sessionUploads.current.has(u));
    urls.forEach((u) => sessionUploads.current.delete(u));
    if (urls.length) void discardUploadsAction(urls);
  }

  async function onCover(file: File) {
    setCoverBusy(true);
    try {
      const img = await convertImage(file);
      const base = `settings/${nanoid(10)}`;
      const [urlLg, urlSm] = await Promise.all([
        uploadFile({ mode: storageMode, pathname: `${base}-lg.webp`, file: img.lg, contentType: "image/webp" }),
        uploadFile({ mode: storageMode, pathname: `${base}-sm.webp`, file: img.sm, contentType: "image/webp" }),
      ]);
      dropSessionCover();
      sessionUploads.current.add(urlLg);
      sessionUploads.current.add(urlSm);
      set("cover", { urlLg, urlSm, width: img.width, height: img.height, blurData: img.blurData, alt: "", bytes: img.lg.size + img.sm.size });
    } catch (error) {
      toast.fromError(error);
    } finally {
      setCoverBusy(false);
    }
  }

  async function save() {
    if (coverBusy) {
      toast.info("대표 사진을 올리는 중입니다. 잠시만 기다려 주세요.");
      return;
    }
    setSaving(true);
    const result = await saveSettingsAction(form);
    setSaving(false);
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.fieldErrors ? Object.values(result.fieldErrors)[0] : result.message);
      return;
    }
    sessionUploads.current.clear();
    setErrors({});
    setBaseline(JSON.stringify(form));
    toast.success("전시 정보를 저장했습니다.");
    router.refresh();
  }

  return (
    <div className="w-full px-4 pb-32 pt-6 sm:px-6 sm:pt-8 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[1.9rem] font-bold tracking-[-0.02em] text-ink">전시 정보</h1>
          <p className="mt-1 text-[15px] text-ink-soft">전시 표지와 공유 미리보기에 쓰이는 정보입니다.</p>
        </div>
        <InkButton onClick={save} loading={saving} size="lg" className="max-sm:hidden" icon={<IconCheck size={20} strokeWidth={2.4} />}>
          저장
        </InkButton>
      </div>

      <div className="mt-6 grid items-stretch gap-6 lg:grid-cols-2">
        <Card title="전시">
          <div className="space-y-5">
            <TextField label="전시명" value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={80} error={errors.title} />
            <TextField label="부제" optional value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} maxLength={120} placeholder="예) 우리가 그린 계절 이야기" error={errors.subtitle} />
            <DateRangePicker
              label="전시 기간"
              optional
              start={form.startDate}
              end={form.endDate}
              onChange={({ start, end }) => setForm((f) => ({ ...f, startDate: start, endDate: end }))}
              error={errors.startDate ?? errors.endDate}
            />
            <TextField label="장소" optional value={form.venue} onChange={(e) => set("venue", e.target.value)} maxLength={100} placeholder="예) 센터 1층 전시실" error={errors.venue} />
            <TextField label="주최" value={form.organizer} onChange={(e) => set("organizer", e.target.value)} maxLength={60} error={errors.organizer} />
          </div>
        </Card>

        {/* 오른쪽 열: 소개글 칸이 남는 높이를 채워 왼쪽 카드와 끝선을 맞춘다 */}
        <div className="flex flex-col gap-6">
        <Card title="소개글" className="flex-1">
          <TextArea
            label="전시 소개"
            optional
            value={form.intro}
            onChange={(e) => set("intro", e.target.value)}
            maxLength={3000}
            placeholder="전시를 준비한 마음, 관람객에게 전하고 싶은 말을 적어 주세요."
            error={errors.intro}
            wrapperClassName="flex h-full flex-col"
            className="flex-1 [field-sizing:fixed]"
          />
        </Card>

        <Card title="대표 사진" hint="전시 표지와 카카오톡 공유 미리보기에 쓰입니다.">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-paper-deep sm:w-64">
              {form.cover ? (
                <img src={form.cover.urlSm} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center text-ink-faint">
                  <IconImage size={34} strokeWidth={1.3} />
                </span>
              )}
              {coverBusy && (
                <span className="absolute inset-0 flex items-center justify-center gap-2 bg-paper-light/80 text-sm font-semibold text-blue-deep backdrop-blur-sm">
                  <Spinner /> 변환하고 올리는 중
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <InkButton variant="secondary" icon={<IconUpload size={18} />} onClick={() => fileRef.current?.click()} disabled={coverBusy}>
                {form.cover ? "사진 바꾸기" : "사진 올리기"}
              </InkButton>
              {form.cover && (
                <InkButton
                  variant="ghost"
                  icon={<IconTrash size={18} />}
                  onClick={() => {
                    dropSessionCover();
                    set("cover", null);
                  }}
                  className="text-danger hover:bg-danger-mist hover:text-danger"
                >
                  빼기
                </InkButton>
              )}
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.heic,.heif"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void onCover(f);
            }}
          />
        </Card>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-4 pb-3 sm:hidden">
        <InkButton onClick={save} loading={saving} size="lg" className="w-full" icon={<IconCheck size={20} strokeWidth={2.4} />}>
          {dirty ? "저장하기" : "저장됨"}
        </InkButton>
      </div>
    </div>
  );
}

function Card({ title, hint, children, className }: { title: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("deckle flex flex-col rounded-[26px] px-5 py-6 sm:px-7 sm:py-7", className)}>
      <h2 className="flex items-center gap-2.5 font-serif text-[1.2rem] font-bold text-ink">
        <span className="h-4 w-1 rounded-full bg-blue" aria-hidden />
        {title}
      </h2>
      {hint && <p className="mt-1.5 text-[13.5px] text-ink-faint">{hint}</p>}
      <div className="mt-5 flex flex-1 flex-col">{children}</div>
    </section>
  );
}
