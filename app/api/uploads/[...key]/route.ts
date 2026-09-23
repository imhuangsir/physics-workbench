import { cfEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { requireStudent, requireTeacher } from "@/lib/auth/guards";
import { fail, appError } from "@/lib/http";
import { getImage } from "@/server/uploads/service";

// Node 运行时(nodejs_compat)，勿写 runtime="edge"。
// 鉴权后从 R2 取图返回（学生仅能取自己前缀，老师可取任意）。前端以带 token 的 fetch→blob 展示。
export async function GET(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  try {
    const env = cfEnv();
    const db = getDb(env.DB);
    const parts = (await params).key;
    const key = Array.isArray(parts) ? parts.join("/") : String(parts);
    if (!key) throw appError("validation_error", "无效的文件");

    let who: { studentId: number } | { teacher: true };
    try {
      await requireTeacher(req, env.AUTH_SECRET);
      who = { teacher: true };
    } catch {
      who = { studentId: await requireStudent(req, { db, secret: env.AUTH_SECRET }) };
    }

    const obj = await getImage(env.BUCKET, key, who);
    return new Response(obj.body, {
      headers: {
        "content-type": obj.httpMetadata?.contentType ?? "application/octet-stream",
        "cache-control": "private, max-age=3600",
      },
    });
  } catch (e) { return fail(e); }
}
