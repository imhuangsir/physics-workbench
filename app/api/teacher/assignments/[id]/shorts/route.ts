import { cfEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { requireTeacher } from "@/lib/auth/guards";
import { ok, fail, appError } from "@/lib/http";
import { listAssignmentShorts } from "@/server/grading/service";

// Node 运行时(nodejs_compat)，勿写 runtime="edge"。
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const env = cfEnv();
    await requireTeacher(req, env.AUTH_SECRET);
    const db = getDb(env.DB);
    const assignmentId = Number((await params).id);
    if (!assignmentId) throw appError("validation_error", "无效的作业 id");
    return ok(await listAssignmentShorts(db, assignmentId));
  } catch (e) { return fail(e); }
}
