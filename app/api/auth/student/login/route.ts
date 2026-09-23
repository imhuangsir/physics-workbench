import { cfEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { studentLogin } from "@/server/auth/service";
import { ok, fail, appError } from "@/lib/http";

// 注意：@opennextjs/cloudflare 在 Workers 上跑 Node 运行时(靠 nodejs_compat)，
// 路由**不要**写 `export const runtime = "edge"`（那是已弃用的 next-on-pages 写法）。默认 Node 运行时即可。

export async function POST(req: Request) {
  try {
    const env = cfEnv();
    const body = await req.json().catch(() => null) as { classId?: number; name?: string } | null;
    if (!body?.classId || !body?.name) throw appError("validation_error", "请选择班级并输入姓名");
    const meta = { ip: req.headers.get("CF-Connecting-IP"), ua: req.headers.get("User-Agent") };
    const r = await studentLogin(getDb(env.DB), { classId: body.classId, name: body.name }, env.AUTH_SECRET, meta);
    return ok(r);
  } catch (e) { return fail(e); }
}
