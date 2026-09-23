import { desc, eq } from "drizzle-orm";
import { cfEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { requireTeacher } from "@/lib/auth/guards";
import { ok, fail, appError } from "@/lib/http";
import { loginLogs } from "@/db/schema";

// 注意：@opennextjs/cloudflare 在 Workers 上跑 Node 运行时(靠 nodejs_compat)，
// 路由**不要**写 `export const runtime = "edge"`（那是已弃用的 next-on-pages 写法）。默认 Node 运行时即可。

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const env = cfEnv();
    await requireTeacher(req, env.AUTH_SECRET);
    const db = getDb(env.DB);
    const id = Number((await params).id);
    if (!id) throw appError("validation_error", "无效的学生 id");
    const rows = await db.select({ id: loginLogs.id, ip: loginLogs.ip, ua: loginLogs.ua, createdAt: loginLogs.createdAt })
      .from(loginLogs).where(eq(loginLogs.studentId, id)).orderBy(desc(loginLogs.createdAt));
    return ok(rows);
  } catch (e) { return fail(e); }
}
