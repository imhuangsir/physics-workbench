import { cfEnv } from "@/lib/env";
import { teacherLogin } from "@/server/auth/service";
import { ok, fail, appError } from "@/lib/http";

// 注意：@opennextjs/cloudflare 在 Workers 上跑 Node 运行时(靠 nodejs_compat)，
// 路由**不要**写 `export const runtime = "edge"`（那是已弃用的 next-on-pages 写法）。默认 Node 运行时即可。
// 切勿把老师密码写入日志。

export async function POST(req: Request) {
  try {
    const env = cfEnv();
    const body = await req.json().catch(() => null) as { password?: string } | null;
    if (!body?.password) throw appError("validation_error", "请输入密码");
    const r = await teacherLogin(body.password, env.ADMIN_PASSWORD, env.AUTH_SECRET);
    return ok(r);
  } catch (e) { return fail(e); }
}
