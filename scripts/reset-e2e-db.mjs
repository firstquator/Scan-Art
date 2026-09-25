// E2E 테스트 전용 로컬 DB를 비운다.
import { rmSync } from "node:fs";

rmSync(".data/pglite-e2e", { recursive: true, force: true });
