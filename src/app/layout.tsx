import type { Metadata, Viewport } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { Providers } from "@/components/providers";
import { gowunBatang, nanumPen } from "@/lib/fonts";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "작품 이야기", template: "%s" },
  description: "평택특수교육지원센터 학생 작품 전시",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f7f3ea",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${gowunBatang.variable} ${nanumPen.variable}`}>
      <body className="min-h-dvh">
        {/* 찢은 종이 가장자리용 SVG 필터 */}
        <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
          <filter id="deckle-edge" x="-2%" y="-2%" width="104%" height="104%">
            <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" seed="11" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
