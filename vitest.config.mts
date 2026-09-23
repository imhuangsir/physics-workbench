import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";

// vitest-pool-workers v4 API：用 cloudflareTest() 插件替代旧的 defineWorkersConfig。
// 集成测试直接调用被测函数并注入 env.DB（不经由 SELF / 生产 worker），
// 因此这里不引用 wrangler.jsonc 的 main（.open-next/worker.js 仅生产构建产物），
// 而是自带 compat 设置 + 本地真实 D1。compat 值需与 wrangler.jsonc 保持一致。
const rootDir = path.dirname(fileURLToPath(import.meta.url));
const migrations = await readD1Migrations(path.join(rootDir, "drizzle"));

export default defineConfig({
  test: {
    setupFiles: ["./test/apply-migrations.ts"],
  },
  plugins: [
    cloudflareTest({
      miniflare: {
        compatibilityDate: "2025-03-01",
        compatibilityFlags: ["nodejs_compat"],
        d1Databases: ["DB"],
        bindings: {
          AUTH_SECRET: "test-secret-please-change",
          ADMIN_PASSWORD: "test-admin-pw",
          // 迁移数组作为 JSON binding 传入 worker 侧，供 setup 文件应用
          TEST_MIGRATIONS: migrations,
        },
      },
    }),
  ],
});
