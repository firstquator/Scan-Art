import "server-only";

const isProd = process.env.NODE_ENV === "production" && !process.env.ALLOW_LOCAL_DB;

/** 운영에서 빠지면 안 되는 값은 없을 때 바로 실패시킨다. 로컬 개발에서는 기본값을 쓴다. */
function required(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (isProd) throw new Error(`${name} is required in production`);
  return devFallback;
}

/** 관리자 비밀번호 기본값(.env의 ADMIN_PASSWORD가 없을 때) */
export const DEFAULT_ADMIN_PASSWORD = "0000";

export const env = {
  /** .env(로컬) 또는 Vercel 환경변수의 ADMIN_PASSWORD. 없으면 0000. */
  get adminPassword() {
    return process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
  },
  get sessionSecret() {
    return required("SESSION_SECRET", "local-development-secret-please-change-0000");
  },
  get storageMode(): "blob" | "local" {
    if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
    if (isProd) throw new Error("BLOB_READ_WRITE_TOKEN is required in production");
    return "local";
  },
};
