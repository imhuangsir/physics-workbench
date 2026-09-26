import { cfEnv } from "@/lib/env";
import { requireTeacher } from "@/lib/auth/guards";
import { ok, fail, appError } from "@/lib/http";
import { matchFigures } from "@/server/questions/ai-split";

// Node 运行时(nodejs_compat)，勿写 runtime="edge"。
// 依据"图片在原文位置 + 题干对图的引用"，用 AI 把每张配图对应到某道题。
export async function POST(req: Request) {
  try {
    const env = cfEnv();
    await requireTeacher(req, env.AUTH_SECRET);
    const body = await req.json().catch(() => null) as { text?: string; questions?: string[] } | null;
    const text = (body?.text ?? "").trim();
    const questions = Array.isArray(body?.questions) ? body!.questions.map((q) => String(q ?? "")) : [];
    if (!text || !questions.length) throw appError("validation_error", "缺少文本或题目");
    return ok({ map: await matchFigures(env, text, questions) });
  } catch (e) { return fail(e); }
}
