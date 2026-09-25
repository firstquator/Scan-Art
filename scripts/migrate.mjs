// 배포 빌드 전에 Neon DB에 마이그레이션(drizzle/)을 적용한다.
// DATABASE_URL이 없으면(로컬 PGlite) 아무것도 하지 않는다. PGlite는 앱이 처음 연결할 때 스스로 적용한다.
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const url = process.env.DATABASE_URL;

if (!url) {
  console.log("[migrate] DATABASE_URL이 없어 건너뜁니다 (로컬 PGlite 사용).");
  process.exit(0);
}

try {
  await migrate(drizzle({ client: neon(url) }), { migrationsFolder: "drizzle" });
  console.log("[migrate] 데이터베이스 준비 완료");
} catch (error) {
  console.error("[migrate] 마이그레이션 실패", error);
  process.exit(1);
}
