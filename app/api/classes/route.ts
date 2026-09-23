import { cfEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { classes } from "@/db/schema";
import { ok, fail } from "@/lib/http";

// 注意：@opennextjs/cloudflare 在 Workers 上跑 Node 运行时(靠 nodejs_compat)，
// 路由**不要**写 `export const runtime = "edge"`（那是已弃用的 next-on-pages 写法）。默认 Node 运行时即可。

export async function GET() {
  try {
    const db = getDb(cfEnv().DB);
    const rows = await db.select({ id: classes.id, name: classes.name }).from(classes);
    return ok(rows);
  } catch (e) { return fail(e); }
}
