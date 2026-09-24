# ②~⑦ 轮 隔夜实现交接说明

> 面向：项目负责人（你）睡醒后验收。本轮为 **只写代码、未做运行时测试** 的草稿实现（按你的指示）。
> 每轮均通过 `npm run build`（编译 + 类型检查）门禁；功能测试待你逐项验证。

## 分支布局（都未合并、未推送）

| 分支 | 内容 | 状态 |
| --- | --- | --- |
| `feat/foundation-slice-a` | 第①轮地基 + 切片A **+ Bento UI 重设计** | 已测（①轮后端 36 测试），UI 待浏览器验收 |
| `feat/rounds-2-7` | ②~⑥ 轮全部功能（从 UI 分支切出） | **未测**，待填 key + 浏览器验收 |

`feat/rounds-2-7` 基于 `feat/foundation-slice-a`，已包含 UI 重设计。验收顺序建议：先看 UI 分支的视觉，再切到 rounds-2-7 测新功能。

## 睡醒后如何测试

```bash
git checkout feat/rounds-2-7
npm install                 # 若有需要
npm run cf-typegen          # 生成 CF 运行时类型
npm run db:migrate:local    # 应用迁移(含 0001/0002 新表)
npm run build               # 应已通过
npm run dev                 # localhost:3000
```

- **AI 功能（②③）**：`.dev.vars` 已按 CC settings.json 预填 `AI_BASE_URL/AI_MODEL/AI_API_STYLE/AI_API_KEY`，理论上开箱可测。若网关只认 OpenAI 格式，把 `AI_API_STYLE` 改成 `openai`。
- **OCR（⑤）**：`.dev.vars` 里 `OCR_*` 留空 —— 去腾讯云开通 OCR 后填 `OCR_PROVIDER=tencent`、`OCR_SECRET_ID`、`OCR_SECRET_KEY`；未填时导入页会提示"未配置"。
- **R2 拍照（④）**：本地 miniflare 自带 R2 模拟，`npm run dev` 即可测上传；线上需 `wrangler r2 bucket create physics-workbench-uploads`。

## 安全说明

- AI 密钥（你现有的 CC token）仅写入 **`.dev.vars`（已被 .gitignore 忽略）**，未进任何源码 / 提交 / 日志。线上部署用 `wrangler secret put AI_API_KEY` 等。
- 源码一律经 env 读取密钥；`.env.example` 只有键名无值。
<!-- PLACEHOLDER_ROUNDS -->

## 各轮实现明细

### ② AI 简答批改
- **可插拔 AI 网关** `src/lib/ai/provider.ts`（Anthropic Messages 默认 / OpenAI 可切）。
- 迁移 0001：`answers` 增 `ai_feedback / graded_by / graded_at`。
- 服务 `src/server/grading/`：AI 打分（纯函数 `ai.ts`）+ 批量批改·人工覆盖·重算总分状态（`service.ts`）。
- 路由：`GET /api/teacher/assignments/[id]/shorts`、`POST .../grade`、`PATCH /api/teacher/answers/[id]`。
- 页面：老师 `作业 → 批改简答`（AI 批改全部 + 逐条人工覆盖）；学生结果页显示评语。
- **测试点**：建含简答题的作业→学生提交→老师点"AI 批改全部"→看分数/评语→人工改分→学生端看评语与总分。

### ③ AI 学习助手
- 服务 `src/server/assistant/service.ts`（初二物理系统提示：引导思路、不直接给作业答案、只答物理、不记隐私）。
- 路由：`POST /api/student/assistant`（登录学生可用；历史客户端持有）。
- 页面：学生导航 `AI 助手` 聊天页。
- **测试点**：学生登录→AI 助手→提问物理概念→看回答；问"作业最终答案"应被引导而非直给。

### ④ 错题本 + 订正 + R2 拍照
- 迁移 0002：`corrections` 表。R2 上传 `src/server/uploads/`（限 5MB，key 前缀含 studentId 鉴权）。
- 服务 `src/server/corrections/`：错题本（汇总所有判错题）+ 提交订正。
- 路由：`GET/POST /api/student/corrections`、`POST /api/student/uploads`、`GET /api/uploads/[...key]`。
- 页面：学生导航 `错题本`（逐题订正 + 拍照，`AuthImage` 带 token 拉图）。
- **测试点**：先制造一道错题→错题本能列出→写订正+传图→刷新后能看到订正与图片。

### ⑤ 图片 OCR 切题导入
- 可插拔 OCR `src/lib/ocr/`（腾讯 `GeneralBasicOCR` + TC3-HMAC-SHA256 签名，Web Crypto 实现；`split.ts` 切题）。
- 路由：`POST /api/teacher/ocr`。页面：老师导航 `导入`（识别→可编辑文本重切→逐题设答案加入题库）。
- 抽出共享 `src/components/question-form.tsx`，题库页与导入页共用（DRY）。
- **⚠️ 腾讯签名未联调**：填 key 后若报 OCR 错误，优先核对签名细节（本文件与 `tencent.ts` 注释有说明）。
- **测试点**：填 OCR key→导入页传题目图→看切分→设答案→加入题库→题库能查到。

### ⑥ 公告 + CSV 导出
- `announcements` 表（迁移 0002 已建，classId 空=全体）。
- 路由：`GET/POST /api/teacher/announcements`、`DELETE [id]`、`GET /api/student/announcements`、`GET /api/teacher/assignments/[id]/export`（CSV，含 BOM）。
- 页面：老师导航 `公告`；学生首页顶部公告横幅；统计页 `导出 CSV` 按钮（带 token 的 fetch→blob，不入 URL）。
- **测试点**：老师发公告（全体/指定班）→对应学生首页可见；统计页导出 CSV 用 Excel 打开中文正常。

### ⑦ 二阶段增强（已按你 2026-09-24 的选择实现）
选做：作业截止提醒、班级成绩分布/排名、学生学习报告、班级高频错题导出。**未做**：题目难度自适应、通知/微信推送/家长端（按你指示排除）。
- **学生端整体 Bento 化**（你反馈"学生端太简陋"）：首页紫渐变问候 hero + 待完成/已完成数字砖；作业按截止紧迫度着色排序（逾期玫红 / 24h内琥珀）。
- **作业截止提醒**：学生首页 `dueInfo()` 按剩余时间着色，未完成优先排前。
- **班级成绩分布 + 排名**（学生视角，隐私安全：只给聚合+本人）：`src/server/rank/` + `GET /api/student/assignments/[id]/rank`；结果页新增"班级排名·成绩分布"卡（排名 / 超过% / 均分 + 分布直方图，紫色高亮本人分数段）。
- **学生学习报告**：`src/server/report/` + `GET /api/student/report`；新页面 `学习报告`（按章节/知识点正确率进度条 + 薄弱项高亮）。
- **班级高频错题导出**：`exports.classWrongCsv` + `GET /api/teacher/classes/[id]/wrong-export`；名单页选中班级后"导出高频错题"按钮。
- **测试点**：学生做几份作业(含对错)→ 学习报告出章节正确率与薄弱项；结果页看排名/分布(需同班多人提交才有对比)；老师名单页选班导出高频错题 CSV。

## 我代你做的关键决定（可推翻）
- AI/OCR 都做成**可插拔 provider**，默认沿用你现有网关；换供应商只改 env。
- ② 简答批改**加列**复用 answers（不建评分历史表）；简答判对后计入正确率统计（部分分也算"对"，略偏高）。
- ④ 错题本用"图片 key 前缀含 studentId + 带 token 拉图"做鉴权（低安全内部工具够用）。
- ⑤ 腾讯 OCR 全量实现但**未联调**；百度留扩展点未实现。
- 全程遵守：无子代理、依赖装 D 盘、Node 运行时不写 `runtime="edge"`。

## 已知局限
- **未做任何运行时/集成测试**（按你指示）。①轮原有 36 个测试未动，仍应通过。
- 新迁移 0001/0002 需 `db:migrate:local`（本地）/ `db:migrate:remote`（线上）后功能才可用。
- 腾讯 OCR 签名、AI 网关的实际返回结构可能需按真实响应微调。

