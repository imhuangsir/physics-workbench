import { cfEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { requireStudent } from "@/lib/auth/guards";
import { ok, fail, appError } from "@/lib/http";
import { studentRank } from "@/server/rank/service";

// Node 运行时(nodejs_compat)，勿写 runtime="edge"。
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const env = cfEnv();
    const db = getDb(env.DB);
    const studentId = await requireStudent(req, { db, secret: env.AUTH_SECRET });
    const assignmentId = Number((await params).id);
    if (!assignmentId) throw appError("validation_error", "无效的作业 id");
    return ok(await studentRank(db, assignmentId, studentId));
  } catch (e) { return fail(e); }
}
