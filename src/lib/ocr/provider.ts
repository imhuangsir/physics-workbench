import { appError } from "@/lib/http";
import type { AppEnv } from "@/lib/env";
import { tencentOcr } from "./tencent";

/**
 * 图片 OCR：默认沿 OCR_PROVIDER 分发。密钥仅从 env 注入（Secret），绝不硬编码/入日志。
 * 未配置时抛 ocr_unconfigured，前端提示用户去填 key（这是"预备好填 key 的地方"）。
 */
export async function ocrImage(env: AppEnv, data: ArrayBuffer): Promise<string> {
  const provider = (env.OCR_PROVIDER || "").toLowerCase();
  const base64 = Buffer.from(new Uint8Array(data)).toString("base64");
  try {
    if (provider === "tencent") {
      if (!env.OCR_SECRET_ID || !env.OCR_SECRET_KEY) {
        throw appError("ocr_unconfigured", "OCR 未配置密钥，请设置 OCR_SECRET_ID / OCR_SECRET_KEY");
      }
      return await tencentOcr(
        { secretId: env.OCR_SECRET_ID, secretKey: env.OCR_SECRET_KEY, region: env.OCR_REGION || "ap-guangzhou" },
        base64,
      );
    }
    if (provider === "baidu") {
      throw appError("ocr_unconfigured", "百度 OCR 尚未接入，请设 OCR_PROVIDER=tencent，或按 tencent.ts 补充实现");
    }
    throw appError("ocr_unconfigured", "OCR 服务未配置：请设置 OCR_PROVIDER（tencent）与对应密钥后再使用");
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("__ocr_http__")) {
      console.error("[ocr]", e.message); // 仅记摘要
      throw appError("ocr_error", "OCR 服务暂时不可用，请稍后再试");
    }
    throw e;
  }
}
