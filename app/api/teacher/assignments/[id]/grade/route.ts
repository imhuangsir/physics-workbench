import { cfEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { requireTeacher } from "@/lib/auth/guards";
import { ok, fail, appError } from "@/lib/http";
import { gradeAssignmentShorts } from "@/server/grading/service";

// Node 运行时(nodejs_compat)，勿写 runtime="edge"。
// AI 批改可能较慢，逐份逐题串行调用网关。
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const env = cfEnv();
    await requireTeacher(req, env.AUTH_SECRET);
    const db = getDb(env.DB);
    const assignmentId = Number((await params).id);
    if (!assignmentId) throw appError("validation_error", "无效的作业 id");
    return ok(await gradeAssignmentShorts(db, env, assignmentId));
  } catch (e) { return fail(e); }
}
