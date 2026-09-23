import { cfEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { requireStudent } from "@/lib/auth/guards";
import { studentClassId } from "@/lib/auth/student-context";
import { ok, fail, appError } from "@/lib/http";
import { startAssignment } from "@/server/assignments/service";

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
    return ok(await startAssignment(db, assignmentId, studentId, classId));
  } catch (e) { return fail(e); }
}
