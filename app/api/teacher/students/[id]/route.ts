import { cfEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { requireTeacher } from "@/lib/auth/guards";
import { ok, fail, appError } from "@/lib/http";
import { updateStudent } from "@/server/students/service";

// 注意：@opennextjs/cloudflare 在 Workers 上跑 Node 运行时(靠 nodejs_compat)，
// 路由**不要**写 `export const runtime = "edge"`（那是已弃用的 next-on-pages 写法）。默认 Node 运行时即可。

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const env = cfEnv();
    await requireTeacher(req, env.AUTH_SECRET);
    const db = getDb(env.DB);
    const id = Number((await params).id);
    if (!id) throw appError("validation_error", "无效的学生 id");
    const body = await req.json().catch(() => null) as
      { name?: string; dedupLabel?: string; status?: "active" | "disabled" } | null;
    if (!body) throw appError("validation_error", "请求体无效");
    return ok(await updateStudent(db, id, body));
  } catch (e) { return fail(e); }
}
