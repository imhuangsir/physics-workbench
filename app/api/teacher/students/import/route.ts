import { cfEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { requireTeacher } from "@/lib/auth/guards";
import { ok, fail, appError } from "@/lib/http";
import { importStudents } from "@/server/students/service";

// 注意：@opennextjs/cloudflare 在 Workers 上跑 Node 运行时(靠 nodejs_compat)，
// 路由**不要**写 `export const runtime = "edge"`（那是已弃用的 next-on-pages 写法）。默认 Node 运行时即可。

export async function POST(req: Request) {
  try {
    const env = cfEnv();
    await requireTeacher(req, env.AUTH_SECRET);
    const db = getDb(env.DB);
    const body = await req.json().catch(() => null) as { classId?: number; names?: string[] } | null;
    if (!body?.classId || !Array.isArray(body.names)) throw appError("validation_error", "请提供班级与名单");
    return ok(await importStudents(db, body.classId, body.names));
  } catch (e) { return fail(e); }
}
