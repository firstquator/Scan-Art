import { Gowun_Batang, Nanum_Pen_Script } from "next/font/google";

/**
 * 한글 글리프는 Google Fonts가 unicode-range 조각으로 나눠 제공하고, next/font가 이를 자체 호스팅한다.
 * 브라우저는 화면에 실제로 쓰인 글자가 든 조각만 내려받는다.
 */
export const gowunBatang = Gowun_Batang({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-gowun",
  fallback: ["Nanum Myeongjo", "AppleMyungjo", "serif"],
});

/** 손글씨 포인트: 짧은 문구에만. 미리 불러오지 않는다. */
export const nanumPen = Nanum_Pen_Script({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-pen",
  preload: false,
  adjustFontFallback: false,
});
