"use client";

import { useEffect } from "react";
import { InkMark, StatusPage } from "@/components/status-page";
import { InkButton } from "@/components/ui/ink-button";
import { IconRefresh } from "@/components/ui/icons";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      mark={
        <InkMark tone="ink">
          <span className="font-serif text-3xl font-bold">!</span>
        </InkMark>
      }
      title="잠시 문제가 생겼습니다"
      action={
        <InkButton icon={<IconRefresh size={18} />} onClick={() => retry()}>
          다시 불러오기
        </InkButton>
      }
    >
      <p>인터넷 연결을 확인한 뒤 다시 불러와 주세요.</p>
      <p>계속 안 되면 조금 뒤에 다시 찾아와 주세요.</p>
    </StatusPage>
  );
}
