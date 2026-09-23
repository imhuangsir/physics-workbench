import { getCloudflareContext } from "@opennextjs/cloudflare";

export function cfEnv() {
  const { env } = getCloudflareContext();
  return env as {
    DB: D1Database;
    BUCKET: R2Bucket;
    AUTH_SECRET: string;
    ADMIN_PASSWORD: string;
  };
}
