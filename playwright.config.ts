import { defineConfig, devices } from "@playwright/test";

const PORT = 3418;

/**
 * E2E: 로컬 모드(PGlite + 로컬 저장소)로 개발 서버를 따로 띄워 전체 흐름을 확인한다.
 * 매 실행마다 전용 DB(.data/pglite-e2e)를 비우고 시작한다.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "ko-KR",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `node scripts/reset-e2e-db.mjs && next dev --port ${PORT}`,
    url: `http://localhost:${PORT}/admin/login`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      PGLITE_DIR: ".data/pglite-e2e",
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
      ADMIN_PASSWORD: "e2e-password",
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
});
