import { eq } from "drizzle-orm";
import type { DB } from "../../db/client";
import { uploads } from "../../db/schema";
import { appError } from "@/lib/http";

// 图片默认存 D1（base64），避免 R2 需要绑卡。依赖前端压缩后再上传以控制体积。
const MAX_BYTES = 1.5 * 1024 * 1024; // 压缩后原图上限 ~1.5MB
const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
const now = () => Math.floor(Date.now() / 1000);

/** 存学生订正图片到 D1。key 前缀含 studentId 以便鉴权。 */
export async function putStudentImage(
  db: DB, studentId: number, mime: string, data: ArrayBuffer,
): Promise<{ key: string }> {
  const m = mime.toLowerCase();
  if (!ALLOWED.has(m)) throw appError("validation_error", "仅支持 JPG/PNG/WebP/GIF 图片");
  if (data.byteLength === 0) throw appError("validation_error", "图片内容为空");
  if (data.byteLength > MAX_BYTES) throw appError("payload_too_large", "图片过大，请压缩后再上传（上限约 1.5MB）");
  const key = `corrections/${studentId}/${crypto.randomUUID()}`;
  const b64 = Buffer.from(new Uint8Array(data)).toString("base64");
  await db.insert(uploads).values({ key, studentId, mime: m, data: b64, createdAt: now() });
  return { key };
}

/** 取图。鉴权：学生仅能取自己前缀(corrections/{id}/)下的对象；老师任意。 */
export async function getImage(
  db: DB, key: string, who: { studentId: number } | { teacher: true },
): Promise<{ mime: string; bytes: Uint8Array }> {
  if (!("teacher" in who)) {
    if (!key.startsWith(`corrections/${who.studentId}/`)) throw appError("forbidden", "无权访问该文件");
  }
  const row = await db.select().from(uploads).where(eq(uploads.key, key)).get();
  if (!row) throw appError("not_found", "文件不存在");
  return { mime: row.mime, bytes: Uint8Array.from(Buffer.from(row.data, "base64")) };
}
