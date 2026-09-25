import type { MetadataRoute } from "next";

/**
 * 학생 정보 보호: 검색엔진 수집은 모두 막는다.
 * 단, 링크 공유 미리보기(카카오톡·SNS)를 만드는 봇은 허용한다. 모든 페이지에 noindex가 붙어 있어 검색 결과에는 나오지 않는다.
 */
const PREVIEW_BOTS = [
  "kakaotalk-scrap",
  "Kakao-Agent",
  "facebookexternalhit",
  "Facebot",
  "Twitterbot",
  "Slackbot-LinkExpanding",
  "Discordbot",
  "TelegramBot",
  "LinkedInBot",
  "WhatsApp",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: PREVIEW_BOTS, allow: ["/a/", "/$", "/opengraph-image"], disallow: "/admin" },
      { userAgent: "*", disallow: "/" },
    ],
  };
}
