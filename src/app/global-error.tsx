"use client";

/** 최상위 레이아웃까지 실패했을 때의 최소 화면. 외부 스타일에 기대지 않는다. */
export default function GlobalError() {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#f7f3ea",
          color: "#2a2926",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 12 }}>잠시 문제가 생겼어요</h1>
          <p style={{ color: "#6b665c", lineHeight: 1.7 }}>잠시 후 다시 시도해 주세요.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 24,
              height: 48,
              padding: "0 24px",
              borderRadius: 16,
              border: 0,
              background: "#2a5caa",
              color: "#fbf8f2",
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            다시 불러오기
          </button>
        </div>
      </body>
    </html>
  );
}
