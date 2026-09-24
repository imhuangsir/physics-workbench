import { cfEnv } from "@/lib/env";
import { requireTeacher } from "@/lib/auth/guards";
import { ok, fail, appError } from "@/lib/http";
import { aiFillAnswers } from "@/server/questions/ai-split";

// Node 运行时(nodejs_compat)，勿写 runtime="edge"。
// 接收题目列表 + 参考答案文本，用 AI 把答案对应填入各题（覆盖切题时的答案）。
export async function POST(req: Request) {
  try {
    const env = cfEnv();
    await requireTeacher(req, env.AUTH_SECRET);
    const body = await req.json().catch(() => null) as { questions?: { stem: string; type: string; options: string[] }[]; answerText?: string } | null;
    const questions = body?.questions ?? [];
    const answerText = (body?.answerText ?? "").trim();
    if (!questions.length) throw appError("validation_error", "没有题目");
    if (!answerText) throw appError("validation_error", "答案文本为空");
    const answers = await aiFillAnswers(env, questions, answerText);
    return ok({ answers });
  } catch (e) { return fail(e); }
}
