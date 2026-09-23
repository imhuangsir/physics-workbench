import { cfEnv } from "@/lib/env";
import { requireTeacher } from "@/lib/auth/guards";
import { ok, fail, appError } from "@/lib/http";
import { ocrImage } from "@/lib/ocr/provider";
import { splitQuestions } from "@/lib/ocr/split";

// Node 运行时(nodejs_compat)，勿写 runtime="edge"。
// 老师上传题目图片(二进制) → OCR → 切分草稿题目，返回供前端复核后逐题创建。
export async function POST(req: Request) {
  try {
    const env = cfEnv();
    await requireTeacher(req, env.AUTH_SECRET);
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) throw appError("validation_error", "请以图片格式上传");
    const data = await req.arrayBuffer();
    if (data.byteLength === 0) throw appError("validation_error", "图片内容为空");
    if (data.byteLength > 8 * 1024 * 1024) throw appError("payload_too_large", "图片过大（上限 8MB）");
    const text = await ocrImage(env, data);
    return ok({ text, questions: splitQuestions(text) });
  } catch (e) { return fail(e); }
}
