// 腾讯云 OCR (GeneralBasicOCR) 调用 + TC3-HMAC-SHA256 签名。
// 用 Web Crypto(subtle) 实现签名，可在 Workers 运行。密钥仅从 env 注入，绝不硬编码/入日志。
// 注意：本文件未经真实密钥联调（用户睡醒后填 OCR_SECRET_ID/OCR_SECRET_KEY 再验证）。

const HOST = "ocr.tencentcloudapi.com";
const SERVICE = "ocr";
const ACTION = "GeneralBasicOCR";
const VERSION = "2018-11-19";
const enc = new TextEncoder();

function hex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function sha256Hex(data: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(data));
  return hex(new Uint8Array(digest));
}
async function hmac(key: Uint8Array, msg: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", key as unknown as ArrayBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(msg)));
}

export async function tencentOcr(
  cfg: { secretId: string; secretKey: string; region: string },
  imageBase64: string,
): Promise<string> {
  const payload = JSON.stringify({ ImageBase64: imageBase64 });
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10); // UTC yyyy-mm-dd

  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${HOST}\n`;
  const signedHeaders = "content-type;host";
  const hashedPayload = await sha256Hex(payload);
  const canonicalRequest = ["POST", "/", "", canonicalHeaders, signedHeaders, hashedPayload].join("\n");

  const credentialScope = `${date}/${SERVICE}/tc3_request`;
  const stringToSign = ["TC3-HMAC-SHA256", String(timestamp), credentialScope, await sha256Hex(canonicalRequest)].join("\n");

  const secretDate = await hmac(enc.encode(`TC3${cfg.secretKey}`), date);
  const secretService = await hmac(secretDate, SERVICE);
  const secretSigning = await hmac(secretService, "tc3_request");
  const signature = hex(await hmac(secretSigning, stringToSign));

  const authorization = `TC3-HMAC-SHA256 Credential=${cfg.secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${HOST}`, {
    method: "POST",
    headers: {
      "Authorization": authorization,
      "Content-Type": "application/json; charset=utf-8",
      "Host": HOST,
      "X-TC-Action": ACTION,
      "X-TC-Timestamp": String(timestamp),
      "X-TC-Version": VERSION,
      "X-TC-Region": cfg.region,
    },
    body: payload,
  });
  if (!res.ok) throw new Error(`__ocr_http__ tencent ${res.status}`);
  const data = (await res.json()) as { Response?: { TextDetections?: { DetectedText?: string }[]; Error?: { Message?: string } } };
  if (data.Response?.Error) throw new Error(`__ocr_http__ tencent ${data.Response.Error.Message ?? "error"}`);
  return (data.Response?.TextDetections ?? []).map((t) => t.DetectedText ?? "").join("\n");
}
