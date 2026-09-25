import "server-only";

const isProd = process.env.NODE_ENV === "production" && !process.env.ALLOW_LOCAL_DB;

/** 운영에서 빠지면 안 되는 값은 없을 때 바로 실패시킨다. 로컬 개발에서는 기본값을 쓴다. */
function required(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (isProd) throw new Error(`${name} is required in production`);
  return devFallback;
}

export const env = {
  get adminPassword() {
    return required("ADMIN_PASSWORD", "scanart");
  },
  get sessionSecret() {
    return required("SESSION_SECRET", "local-development-secret-please-change-0000");
  },
  get storageMode(): "blob" | "local" {
    if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
    if (isProd) throw new Error("BLOB_READ_WRITE_TOKEN is required in production");
    return "local";
  },
  get isUsingDevDefaults() {
    return !process.env.ADMIN_PASSWORD && !isProd;
  },
};
