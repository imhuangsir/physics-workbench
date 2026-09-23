import { cfEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { requireTeacher } from "@/lib/auth/guards";
import { fail, appError } from "@/lib/http";
import { assignmentCsv } from "@/server/exports/service";

// Node 运行时(nodejs_compat)，勿写 runtime="edge"。
// 前端以带 token 的 fetch 拉取 → blob 下载（避免把 token 放进 URL）。
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const env = cfEnv();
    await requireTeacher(req, env.AUTH_SECRET);
    const assignmentId = Number((await params).id);
    if (!assignmentId) throw appError("validation_error", "无效的作业 id");
    const { filename, content } = await assignmentCsv(getDb(env.DB), assignmentId);
    return new Response(content, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) { return fail(e); }
}
