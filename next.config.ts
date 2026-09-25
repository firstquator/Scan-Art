import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // E2E 테스트 서버가 개발 서버와 빌드 폴더를 나눠 쓸 수 있게 한다.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  serverExternalPackages: ["@electric-sql/pglite", "sharp"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
