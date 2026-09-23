import { cfEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { requireStudent } from "@/lib/auth/guards";
import { ok, fail, appError } from "@/lib/http";
import { putStudentImage } from "@/server/uploads/service";

// Node 运行时(nodejs_compat)，勿写 runtime="edge"。
// 客户端以 fetch(body=File, headers: Content-Type=image/*, Authorization) 直传二进制。
export async function POST(req: Request) {
  try {
    const env = cfEnv();
    const db = getDb(env.DB);
    const studentId = await requireStudent(req, { db, secret: env.AUTH_SECRET });
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) throw appError("validation_error", "请以图片格式上传");
    const data = await req.arrayBuffer();
    return ok(await putStudentImage(env.BUCKET, studentId, contentType, data), 201);
  } catch (e) { return fail(e); }
}
