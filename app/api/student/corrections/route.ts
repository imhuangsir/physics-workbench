import { cfEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { requireStudent } from "@/lib/auth/guards";
import { ok, fail, appError } from "@/lib/http";
import { listWrongQuestions, addCorrection } from "@/server/corrections/service";

// Node 运行时(nodejs_compat)，勿写 runtime="edge"。
export async function GET(req: Request) {
  try {
    const env = cfEnv();
    const db = getDb(env.DB);
    const studentId = await requireStudent(req, { db, secret: env.AUTH_SECRET });
    return ok(await listWrongQuestions(db, studentId));
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    const env = cfEnv();
    const db = getDb(env.DB);
    const studentId = await requireStudent(req, { db, secret: env.AUTH_SECRET });
    const body = await req.json().catch(() => null) as
      { questionId?: number; assignmentId?: number | null; text?: string; imageKey?: string | null } | null;
    if (!body || typeof body.questionId !== "number") throw appError("validation_error", "请求体无效");
    return ok(await addCorrection(db, studentId, {
      questionId: body.questionId, assignmentId: body.assignmentId ?? null,
      text: body.text ?? "", imageKey: body.imageKey ?? null,
    }), 201);
  } catch (e) { return fail(e); }
}
