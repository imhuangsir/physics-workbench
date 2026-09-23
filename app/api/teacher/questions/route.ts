import { cfEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { requireTeacher } from "@/lib/auth/guards";
import { ok, fail, appError } from "@/lib/http";
import { createQuestion, listQuestions } from "@/server/questions/service";
import type { QuestionInput } from "@/server/questions/validate";

// 注意：@opennextjs/cloudflare 在 Workers 上跑 Node 运行时(靠 nodejs_compat)，
// 路由**不要**写 `export const runtime = "edge"`（那是已弃用的 next-on-pages 写法）。默认 Node 运行时即可。

export async function GET(req: Request) {
  try {
    const env = cfEnv();
    await requireTeacher(req, env.AUTH_SECRET);
    const db = getDb(env.DB);
    const sp = new URL(req.url).searchParams;
    const filter = {
      chapter: sp.get("chapter") ?? undefined,
      type: sp.get("type") ?? undefined,
      tag: sp.get("tag") ?? undefined,
    };
    return ok(await listQuestions(db, filter));
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    const env = cfEnv();
    await requireTeacher(req, env.AUTH_SECRET);
    const db = getDb(env.DB);
    const body = await req.json().catch(() => null) as QuestionInput | null;
    if (!body) throw appError("validation_error", "请求体无效");
    return ok(await createQuestion(db, body), 201);
  } catch (e) { return fail(e); }
}
