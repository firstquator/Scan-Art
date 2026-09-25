import "server-only";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

const globalForDb = globalThis as unknown as { __scanArtDb?: Promise<Database> };

/**
 * DATABASE_URL이 있으면 Neon(HTTP), 없으면 로컬 개발용 PGlite(.data/pglite)를 쓴다.
 * PGlite는 처음 연결할 때 마이그레이션을 자동으로 적용한다.
 */
export function getDb(): Promise<Database> {
  globalForDb.__scanArtDb ??= createDb().catch((error) => {
    globalForDb.__scanArtDb = undefined;
    throw error;
  });
  return globalForDb.__scanArtDb;
}

async function createDb(): Promise<Database> {
  const url = process.env.DATABASE_URL;

  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    return drizzle({ client: neon(url), schema }) as unknown as Database;
  }

  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_LOCAL_DB) {
    throw new Error("DATABASE_URL is required in production");
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dataDir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  const { mkdir } = await import("node:fs/promises");
  await mkdir(path.dirname(dataDir), { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db as unknown as Database;
}
