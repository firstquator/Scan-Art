"use client";

import { useToast } from "@/components/ui/toast";
import { IconShare } from "@/components/ui/icons";
import { messageFor } from "@/lib/errors";
import { tap } from "@/lib/haptics";
import { cn } from "@/lib/cn";

/** 휴대폰 공유 메뉴(카카오톡 등)를 열고, 지원하지 않으면 링크를 복사한다. */
export function ShareButton({ url, title, text, className }: { url: string; title: string; text?: string; className?: string }) {
  const toast = useToast();

  async function share() {
    tap();
    if (navigator.share) {
      try {
        await navigator.share({ url, title, text });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("링크를 복사했습니다. 원하는 곳에 붙여넣어 주세요.");
    } catch {
      toast.error(messageFor("COPY_FAILED"));
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label="공유하기"
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition-[background-color,color,transform] hover:bg-paper-deep hover:text-ink active:scale-90",
        className,
      )}
    >
      <IconShare size={19} />
    </button>
  );
}
