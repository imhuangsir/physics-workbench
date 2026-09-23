import { appError } from "@/lib/http";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
};

/** 上传学生订正图片到 R2，key 前缀含 studentId 以便鉴权。仅存 key，返回给前端。 */
export async function putStudentImage(
  bucket: R2Bucket, studentId: number, contentType: string, data: ArrayBuffer,
): Promise<{ key: string }> {
  const ext = EXT[contentType.toLowerCase()];
  if (!ext) throw appError("validation_error", "仅支持 JPG/PNG/WebP/GIF 图片");
  if (data.byteLength === 0) throw appError("validation_error", "图片内容为空");
  if (data.byteLength > MAX_BYTES) throw appError("payload_too_large", "图片过大（上限 5MB）");
  const key = `corrections/${studentId}/${crypto.randomUUID()}.${ext}`;
  await bucket.put(key, data, { httpMetadata: { contentType } });
  return { key };
}

/**
 * 读取图片。鉴权：学生只能读自己前缀(corrections/{id}/)下的对象；老师可读任意。
 * caller 传 { studentId } 或 { teacher:true }。
 */
export async function getImage(
  bucket: R2Bucket, key: string, who: { studentId: number } | { teacher: true },
): Promise<R2ObjectBody> {
  if (!("teacher" in who)) {
    if (!key.startsWith(`corrections/${who.studentId}/`)) throw appError("forbidden", "无权访问该文件");
  }
  const obj = await bucket.get(key);
  if (!obj) throw appError("not_found", "文件不存在");
  return obj;
}
