import { cfEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { requireTeacher } from "@/lib/auth/guards";
import { ok, fail, appError } from "@/lib/http";
import { createClass, listClassesWithCount } from "@/server/students/service";

// 注意：@opennextjs/cloudflare 在 Workers 上跑 Node 运行时(靠 nodejs_compat)，
// 路由**不要**写 `export const runtime = "edge"`（那是已弃用的 next-on-pages 写法）。默认 Node 运行时即可。

export async function GET(req: Request) {
  try {
    const env = cfEnv();
    await requireTeacher(req, env.AUTH_SECRET);
    const db = getDb(env.DB);
    return ok(await listClassesWithCount(db));
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    const env = cfEnv();
    await requireTeacher(req, env.AUTH_SECRET);
    const db = getDb(env.DB);
    const body = await req.json().catch(() => null) as { name?: string } | null;
    if (!body?.name) throw appError("validation_error", "班级名不能为空");
    return ok(await createClass(db, body.name), 201);
  } catch (e) { return fail(e); }
}
