import { cfEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { requireStudent } from "@/lib/auth/guards";
import { studentClassId } from "@/lib/auth/student-context";
import { ok, fail } from "@/lib/http";
import { listStudentAnnouncements } from "@/server/announcements/service";

// Node 运行时(nodejs_compat)，勿写 runtime="edge"。
export async function GET(req: Request) {
  try {
    const env = cfEnv();
    const db = getDb(env.DB);
    const studentId = await requireStudent(req, { db, secret: env.AUTH_SECRET });
    const classId = await studentClassId(db, studentId);
    return ok(await listStudentAnnouncements(db, classId));
  } catch (e) { return fail(e); }
}
