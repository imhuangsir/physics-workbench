import { cfEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { requireStudent } from "@/lib/auth/guards";
import { studentClassId } from "@/lib/auth/student-context";
import { ok, fail, appError } from "@/lib/http";
import { submitAssignment } from "@/server/submissions/service";

// 注意：@opennextjs/cloudflare 在 Workers 上跑 Node 运行时(靠 nodejs_compat)，
// 路由**不要**写 `export const runtime = "edge"`（那是已弃用的 next-on-pages 写法）。默认 Node 运行时即可。

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const env = cfEnv();
    const db = getDb(env.DB);
    const studentId = await requireStudent(req, { db, secret: env.AUTH_SECRET });
    const classId = await studentClassId(db, studentId);
    const assignmentId = Number((await params).id);
    if (!assignmentId) throw appError("validation_error", "无效的作业 id");
    const body = await req.json().catch(() => null) as
      { durationSec?: number; answers?: { questionId: number; content: string | string[] }[] } | null;
    if (!body || !Array.isArray(body.answers)) throw appError("validation_error", "请求体无效");
    const r = await submitAssignment(db, assignmentId, studentId, classId, {
      durationSec: body.durationSec ?? 0,
      answers: body.answers,
    });
    return ok(r);
  } catch (e) { return fail(e); }
}
