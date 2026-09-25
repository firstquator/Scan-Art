"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useConfirm } from "@/components/ui/modal";

/**
 * 저장하지 않은 변경이 있을 때 페이지를 떠나려 하면 확인한다.
 * - 새로고침·창 닫기: 브라우저 기본 경고(beforeunload, 문구는 브라우저가 정한다)
 * - 화면 안 링크 이동: 디자인된 확인 모달
 */
export function useLeaveGuard(dirty: boolean, onDiscard: () => void) {
  const router = useRouter();
  const confirm = useConfirm();
  const dirtyRef = useRef(dirty);
  const discardRef = useRef(onDiscard);

  useEffect(() => {
    dirtyRef.current = dirty;
    discardRef.current = onDiscard;
  });

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    }

    async function onClick(e: MouseEvent) {
      if (!dirtyRef.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;

      e.preventDefault();
      e.stopPropagation();
      const leave = await confirm({
        title: "저장하지 않고 나갈까요?",
        description: "지금까지 고친 내용이 사라져요. 나가기 전에 ‘저장’을 누르면 안전하게 남길 수 있어요.",
        confirmLabel: "저장하지 않고 나가기",
        cancelLabel: "계속 편집",
        tone: "danger",
      });
      if (leave) {
        dirtyRef.current = false;
        discardRef.current();
        router.push(url.pathname + url.search);
      }
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [confirm, router]);
}
