import { cfEnv } from "@/lib/env";
import { requireTeacher } from "@/lib/auth/guards";
import { ok, fail, appError } from "@/lib/http";
import { aiSplit } from "@/server/questions/ai-split";
import { splitQuestions } from "@/lib/ocr/split";

// Node 运行时(nodejs_compat)，勿写 runtime="edge"。
// 接收整段文本(来自 Word/PDF 提取或 OCR)，用 AI 智能切题；AI 不可用时退回规则切分。
export async function POST(req: Request) {
  try {
    const env = cfEnv();
    await requireTeacher(req, env.AUTH_SECRET);
    const body = await req.json().catch(() => null) as { text?: string } | null;
    const text = (body?.text ?? "").trim();
    if (!text) throw appError("validation_error", "文本为空");
    if (text.length > 20000) throw appError("payload_too_large", "文本过长（上限约 2 万字），请分批导入");
    try {
      const questions = await aiSplit(env, text);
      if (questions.length) return ok({ questions, by: "ai" });
    } catch (e) {
      console.error("[split] ai failed, fallback to rule", e instanceof Error ? e.message : e);
    }
    const questions = splitQuestions(text).map((q) => ({ ...q, answer: null, analysis: undefined }));
    return ok({ questions, by: "rule" });
  } catch (e) { return fail(e); }
}
