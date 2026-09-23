import { cfEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { requireStudent } from "@/lib/auth/guards";
import { ok, fail, appError } from "@/lib/http";
import { assistantReply } from "@/server/assistant/service";
import type { ChatMessage } from "@/lib/ai/provider";

// Node 运行时(nodejs_compat)，勿写 runtime="edge"。
export async function POST(req: Request) {
  try {
    const env = cfEnv();
    const db = getDb(env.DB);
    await requireStudent(req, { db, secret: env.AUTH_SECRET }); // 仅登录学生可用
    const body = await req.json().catch(() => null) as { messages?: ChatMessage[] } | null;
    if (!body || !Array.isArray(body.messages)) throw appError("validation_error", "请求体无效");
    return ok(await assistantReply(env, { messages: body.messages }));
  } catch (e) { return fail(e); }
}
