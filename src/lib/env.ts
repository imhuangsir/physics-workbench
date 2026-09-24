import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface AppEnv {
  DB: D1Database;
  BUCKET?: R2Bucket; // 可选：默认图片存 D1；如启用 R2 再绑定
  AUTH_SECRET: string;
  ADMIN_PASSWORD: string;
  // ② ③ 轮 AI 网关（Anthropic Messages 兼容，来自 CC settings.json）。密钥仅经 .dev.vars/Secret 注入。
  AI_BASE_URL?: string;
  AI_API_KEY?: string;
  AI_MODEL?: string;
  AI_API_STYLE?: string; // "anthropic" | "openai"
  // ⑤ 轮 OCR（腾讯/百度，占位）。密钥仅经 Secret 注入。
  OCR_PROVIDER?: string; // "tencent" | "baidu" | "stub"
  OCR_SECRET_ID?: string;
  OCR_SECRET_KEY?: string;
  OCR_REGION?: string;
}

export function cfEnv(): AppEnv {
  const { env } = getCloudflareContext();
  return env as unknown as AppEnv;
}
