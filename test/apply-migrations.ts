import { applyD1Migrations, env } from "cloudflare:test";
import type { D1Migration } from "@cloudflare/vitest-pool-workers";

// 每个测试文件加载前，把 drizzle 迁移应用到隔离的本地 D1（miniflare）。
// 迁移数组通过 vitest.config.mts 的 miniflare bindings（TEST_MIGRATIONS）注入。
const migrations = (env as unknown as { TEST_MIGRATIONS: D1Migration[] }).TEST_MIGRATIONS;
await applyD1Migrations(env.DB, migrations);
