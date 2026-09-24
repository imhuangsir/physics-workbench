import { cfEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { requireStudent } from "@/lib/auth/guards";
import { ok, fail } from "@/lib/http";
import { studentReport } from "@/server/report/service";

// Node 运行时(nodejs_compat)，勿写 runtime="edge"。
export async function GET(req: Request) {
  try {
    const env = cfEnv();
    const db = getDb(env.DB);
    const studentId = await requireStudent(req, { db, secret: env.AUTH_SECRET });
    return ok(await studentReport(db, studentId));
  } catch (e) { return fail(e); }
}
