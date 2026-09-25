import { InkMark, StatusPage } from "@/components/status-page";

export default function NotFound() {
  return (
    <StatusPage
      mark={
        <InkMark tone="ink">
          <span className="font-serif text-3xl font-bold">?</span>
        </InkMark>
      }
      title="지금은 볼 수 없는 작품입니다"
    >
      <p>작품이 전시에서 빠졌거나 주소가 바뀌었을 수 있습니다.</p>
      <p>다른 친구들의 작품을 둘러봐 주세요.</p>
    </StatusPage>
  );
}
