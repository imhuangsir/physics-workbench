import { cfEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { requireTeacher } from "@/lib/auth/guards";
import { fail, appError } from "@/lib/http";
import { classWrongCsv } from "@/server/exports/service";

// Node 运行时(nodejs_compat)，勿写 runtime="edge"。
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const env = cfEnv();
    await requireTeacher(req, env.AUTH_SECRET);
    const classId = Number((await params).id);
    if (!classId) throw appError("validation_error", "无效的班级 id");
    const { filename, content } = await classWrongCsv(getDb(env.DB), classId);
    return new Response(content, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) { return fail(e); }
}
