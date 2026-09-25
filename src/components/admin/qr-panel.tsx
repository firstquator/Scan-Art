"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useToast } from "@/components/ui/toast";
import { IconDownload, IconEye, IconLink, IconPrinter } from "@/components/ui/icons";
import { messageFor } from "@/lib/errors";
import { cn } from "@/lib/cn";
import { useAdmin } from "./admin-context";
import { QrCode, qrPngDataUrl, qrSvg } from "./qr-code";

const noopSubscribe = () => () => {};

function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function safeName(title: string) {
  return (title.trim() || "작품").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 40);
}

/** 작품별 QR: 미리보기, PNG·SVG 내려받기, 주소 복사 */
export function QrPanel({ id, title, saved }: { id: string; title: string; saved: boolean }) {
  const { siteUrl } = useAdmin();
  const toast = useToast();
  const url = `${siteUrl}/a/${id}`;
  const wrongOrigin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin !== siteUrl,
    () => false,
  );

  async function downloadPng() {
    download(await qrPngDataUrl(url), `QR_${safeName(title)}.png`);
  }

  async function downloadSvg() {
    const svg = await qrSvg(url);
    const blobUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    download(blobUrl, `QR_${safeName(title)}.svg`);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("작품 주소를 복사했어요.");
    } catch {
      toast.error(messageFor("COPY_FAILED"));
    }
  }

  const btn =
    "flex h-10 items-center justify-center gap-1.5 rounded-xl border border-paper-edge bg-paper-light/80 px-3 text-[13.5px] font-semibold text-ink transition-colors hover:border-blue/40 hover:bg-blue-mist/60 hover:text-blue-deep";

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="mx-auto w-40 shrink-0 rounded-2xl bg-white p-3.5 shadow-[var(--shadow-paper)] sm:mx-0">
        <QrCode value={url} label={`${title || "작품"} QR 코드`} />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <p className="break-all rounded-xl bg-paper-deep/60 px-3 py-2 font-mono text-[13px] text-ink-soft">{url}</p>
        {!saved && <p className="text-[13.5px] text-ink-faint">저장하면 이 QR 코드가 바로 작동해요. 주소는 앞으로도 바뀌지 않아요.</p>}
        {wrongOrigin && (
          <p className="rounded-xl bg-danger-mist/70 px-3 py-2 text-[13px] text-danger">
            지금 접속한 주소와 QR에 들어가는 주소가 달라요. 최종 사이트 주소가 맞는지 확인한 뒤 인쇄해 주세요.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button type="button" onClick={downloadPng} className={btn}>
            <IconDownload size={16} /> PNG
          </button>
          <button type="button" onClick={downloadSvg} className={btn}>
            <IconDownload size={16} /> SVG
          </button>
          <button type="button" onClick={copy} className={btn}>
            <IconLink size={16} /> 주소 복사
          </button>
          {saved ? (
            <a href={`/a/${id}`} target="_blank" rel="noopener" className={btn}>
              <IconEye size={16} /> 열어 보기
            </a>
          ) : (
            <span className={cn(btn, "pointer-events-none opacity-40")}>
              <IconEye size={16} /> 열어 보기
            </span>
          )}
        </div>
        {saved && (
          <Link href={`/admin/print?ids=${id}`} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-blue brush-underline">
            <IconPrinter size={16} /> 명제표·스티커로 인쇄하기
          </Link>
        )}
      </div>
    </div>
  );
}
