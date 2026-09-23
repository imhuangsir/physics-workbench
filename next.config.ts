import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {};

// 仅本地 next dev 时注入 Cloudflare 绑定（D1/R2），使 getCloudflareContext() 可用；
// 生产构建（NODE_ENV=production）跳过，避免构建期触发本地代理。
if (process.env.NODE_ENV !== "production") {
  initOpenNextCloudflareForDev();
}

export default nextConfig;
