import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";

// vitest-pool-workers v4 API：用 cloudflareTest() 插件替代旧的 defineWorkersConfig。
// 通过本地真实 D1（miniflare）跑集成测试，自动应用 wrangler.jsonc 里 migrations_dir 下的迁移。
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        d1Databases: ["DB"],
        bindings: {
          AUTH_SECRET: "test-secret-please-change",
          ADMIN_PASSWORD: "test-admin-pw",
        },
      },
    }),
  ],
});
