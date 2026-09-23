import { cfEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { requireTeacher } from "@/lib/auth/guards";
import { ok, fail, appError } from "@/lib/http";
import { manualGradeAnswer } from "@/server/grading/service";

// Node 运行时(nodejs_compat)，勿写 runtime="edge"。
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const env = cfEnv();
    await requireTeacher(req, env.AUTH_SECRET);
    const db = getDb(env.DB);
    const answerId = Number((await params).id);
    if (!answerId) throw appError("validation_error", "无效的作答 id");
    const body = await req.json().catch(() => null) as { score?: number; feedback?: string } | null;
    if (!body || typeof body.score !== "number") throw appError("validation_error", "请提供分数");
    await manualGradeAnswer(db, answerId, body.score, body.feedback ?? null);
    return ok({ ok: true });
  } catch (e) { return fail(e); }
}
