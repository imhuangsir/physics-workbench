# 八年级物理 AI 教学练习工作台 —— 规格：地基 + 切片A

- 日期：2026-09-23
- 轮次：① 地基 + 切片A（核心闭环，无外部依赖）
- 状态：待用户审查

## 1. 背景与目标

面向八年级物理教学的响应式 Web 应用，统一入口、按登录角色显示不同界面，同时适配手机与电脑浏览器。规模：3 个班、约 150 名学生。

老师通过网页后台布置作业、批改、看数据；学生通过网页在线做题、提问、看资源。本规格**只覆盖第一轮**：把"登录 → 老师建题建作业 → 学生答题提交 → 客观题自动判分 → 基础统计"这条端到端闭环打通，**不引入任何外部 AI / OCR 依赖**。

## 2. 整体路线图（上下文，非本轮范围）

本项目按子项目拆分，每轮各自走一遍 规格 → 计划 → 实现：

| 轮次 | 范围 | 外部依赖 |
|---|---|---|
| **① 地基 + 切片A（本规格）** | 脚手架 / 数据模型 / 登录 / 名单导入 + 题目手录 / 作业 / 答题计时 / 客观自动判分 / 基础统计 | 无 |
| ② AI 批改 | 主观题 Gemini 批改 + 老师复核 | Gemini |
| ③ AI 学习助手 | 苏格拉底式引导问答 + 缓存限流 | Gemini |
| ④ 错题本 + 订正任务 + 拍照上传 | | R2 |
| ⑤ PDF 切题 | 文字版解析 + 扫描版 OCR | 腾讯/百度 OCR |
| ⑥ 班级公告 / 数据导出 CSV | | |
| ⑦ 二阶段增强 | 学习资源 / 分层作业 / 知识图谱热力图 / 学情报告 / 智能出题 / 难点分析 | 视功能 |

后续轮次的表结构与代码在各自轮次通过新迁移增量加入，本轮不预建。

## 3. 本轮范围

### 3.1 纳入（In scope）
- 项目脚手架：Next.js 15 App Router + TypeScript + Tailwind + shadcn/ui + Framer Motion + next-themes
- `@opennextjs/cloudflare` 部署到 Cloudflare Workers；D1 + Drizzle ORM + drizzle-kit 迁移；R2 绑定预留
- 认证：`jose` HS256 JWT，学生 token 含学生 ID，老师 token 含角色标识；localStorage 持久登录
- 老师：导入/管理班级与学生名单（含批量导入、同名区分标记）、查看/清除学生登录记录
- 老师：题目手动录入（单选/多选/填空/简答，含知识点标签、章节、难度、标准答案、解析）
- 老师：创建作业（选题、分配班级、设置截止时间，类型仅"普通"）
- 老师：作业统计（提交进度、平均用时、平均分、客观题正确率、每题正确率）
- 学生：作业列表、在线答题（计时）、提交、客观题即时判分与解析
- 完整深色模式 + 响应式（手机 / 桌面）

### 3.2 不纳入（Out of scope，留待后续轮次）
- 主观题 AI 批改、AI 学习助手、PDF 切题、拍照上传、错题本、订正任务
- 班级公告、学习资源、分层作业、知识图谱、学情报告、智能出题、数据导出
- 真正的多老师账号体系（本轮为单一管理员密码）

## 4. 技术栈（本轮定稿）

- 前端：Next.js 15（App Router）+ TypeScript + Tailwind CSS + shadcn/ui + Framer Motion + next-themes
- 后端：Next.js Route Handlers（`app/api/**/route.ts`），运行在 Cloudflare Workers
- 部署适配器：`@opennextjs/cloudflare`（Cloudflare 当前推荐路径，替代已进入维护模式的 next-on-pages）
- 数据库：Cloudflare D1，ORM 用 Drizzle，迁移用 drizzle-kit
- 文件存储：Cloudflare R2（本轮仅在 wrangler 配置里预留绑定，不写入）
- 认证：`jose` 签发/校验 HS256 JWT（Workers 兼容），密钥走环境变量
- 测试：Vitest + `@cloudflare/vitest-pool-workers`（在本地真实跑 D1，集成测试用）

**项目落地位置**：`D:\physics-workbench`（已创建并 git init）。

## 5. 数据模型（本轮建表）

字段用简写表达；实际以 Drizzle schema 为准。所有表带 `id`（主键）与 `created_at`。

```
classes(id, name)

students(id, class_id → classes.id, name, dedup_label DEFAULT '',
         status['active'|'disabled'] DEFAULT 'active', login_version INT DEFAULT 0)
  -- 判重键：UNIQUE(class_id, name, dedup_label)
  -- 同名同班处理：dedup_label 由老师填（如 "1"、"2"），展示为 "张三(1)"

questions(id, type['single'|'multi'|'fill'|'short'], stem TEXT,
          options_json TEXT NULL,      -- 选择题选项数组 [{key,text}]，非选择题为 NULL
          answer_json TEXT NULL,       -- 标准答案：single=key；multi=key[]；fill=可接受答案[]；short=NULL
          analysis TEXT NULL,          -- 解析
          knowledge_tags_json TEXT,    -- 知识点标签 string[]
          chapter TEXT,                -- 所属章节
          difficulty INT)              -- 难度 1..5

assignments(id, title, type['normal'] DEFAULT 'normal', due_at INT NULL)

assignment_classes(assignment_id → assignments.id, class_id → classes.id)
  -- 复合主键(assignment_id, class_id)；作业分配到哪些班级

assignment_questions(assignment_id → assignments.id, question_id → questions.id,
                     order_no INT, score REAL)
  -- 复合主键(assignment_id, question_id)；题目在作业中的顺序与分值

submissions(id, assignment_id → assignments.id, student_id → students.id,
            status['not_started'|'submitted'|'graded'],
            started_at INT NULL, submitted_at INT NULL, duration_sec INT NULL,
            objective_score REAL NULL, total_score REAL NULL)
  -- 判重键：UNIQUE(assignment_id, student_id)

answers(id, submission_id → submissions.id, question_id → questions.id,
        content_json TEXT,   -- 学生作答：single=key；multi=key[]；fill=文本；short=文本
        is_correct INT NULL, -- 客观题判分结果（0/1/NULL）；简答本轮恒为 NULL
        score REAL NULL, duration_sec INT NULL)

login_logs(id, student_id → students.id, ip TEXT NULL, ua TEXT NULL)
```

老师不入库（仅密码走环境变量）。后续轮次的表（grading / ai_* / wrong_book / correction / announcement / resource / knowledge_point 等）在各自轮次以新迁移加入。

## 6. 认证与权限

### 6.1 学生登录流
1. `GET /api/classes` → 返回班级列表，学生选班。
2. 学生输入姓名 → `POST /api/auth/student/login { classId, name }`。
3. 服务端在该班按 `name` 匹配（忽略 `dedup_label` 前先按 name 精确匹配，再看命中数）：
   - 0 命中 → 返回 404 `student_not_found`，提示"未找到该同学，请核对姓名或联系老师"。
   - **>1 命中** → 返回 409 `duplicate_name`，提示"该班级有多个同名同学，请联系老师处理"。
   - 1 命中且 `status='active'` → 写 `login_logs`，签发 token，返回。
   - 命中但 `status='disabled'` → 返回 403，提示"登录已被老师暂停"。
4. token 载荷：`{ sub: studentId, role:'student', classId, lv: login_version }`。客户端存 localStorage，后续请求带 `Authorization: Bearer <token>`；下次访问自动进入。

### 6.2 老师登录流
- `POST /api/auth/teacher/login { password }` → 与环境变量 `ADMIN_PASSWORD` 比对（常量时间比较）→ 签发 token `{ role:'teacher' }`。同样存 localStorage。

### 6.3 会话失效（清除某学生登录态）
- JWT 无状态，"清除登录"通过版本号实现：老师后台点"清除" → `students.login_version += 1`。
- 校验时若 token 的 `lv` ≠ 库中 `login_version` → 401 `session_revoked`，前端清 localStorage 并回到登录页。

### 6.4 权限守卫
- `requireStudent(req)` → 校验签名 + `lv` + `status`，返回 `studentId`。
- `requireTeacher(req)` → 校验签名 + `role='teacher'`。
- 学生只能读写 `student_id = 自己` 的 submission/answer；越权访问返回 403。

### 6.5 安全声明（写入 README）
- 这是**刻意的低安全方案**，仅限班级内部小规模使用。
- **单一管理员密码**下，"老师"角色实际可见全部 3 个班；"每位老师只看自己班"需要真正的老师账号体系（留作后续轮次）。
- `ADMIN_PASSWORD`、`AUTH_SECRET` 均走环境变量 / Cloudflare Secret，**绝不硬编码**。
- 学生姓名等属隐私数据：接口按角色最小暴露，学生端只返回本人数据。

## 7. 模块结构（面向隔离与可测试）

```
src/db/           schema.ts（Drizzle 表定义）, client.ts（从 env 取 D1 绑定构造 db）
src/lib/auth/     token.ts（签发/校验，纯逻辑，可单测）, guards.ts（requireStudent/Teacher）
src/lib/grading/  objective.ts（客观判分纯函数，可单测）
src/server/       classes/ students/ questions/ assignments/ submissions/ stats/
                  （各域服务层：入参校验 + Drizzle 读写，不含 HTTP 细节）
app/api/**/route.ts   薄路由：鉴权 → 调服务 → 统一错误响应
app/(auth)/           登录页（学生选班输名 / 老师输密码）
app/(student)/        学生端：作业列表、答题页、结果页
app/(teacher)/        老师后台：名单、题库、作业、统计、登录记录
src/components/ui/    shadcn 组件
src/components/bento/ 卡片网格布局组件
src/components/motion/ 受控动画封装（统一遵守 prefers-reduced-motion）
drizzle/              迁移文件
wrangler.jsonc        D1 / R2 绑定
open-next.config.ts   OpenNext 适配配置
```

数据流：客户端（localStorage token）→ `fetch` 带 Bearer → 路由鉴权 → 服务层 → Drizzle → D1。

## 8. API 一览（本轮）

统一响应：成功 `{ data: ... }`；失败 `{ error: { code, message } }`（中文 message，前端 toast）。所有 `/api/teacher/*` 走 `requireTeacher`，`/api/student/*` 走 `requireStudent`。

```
公共
  GET  /api/classes                         班级列表（登录页用）

认证
  POST /api/auth/student/login              {classId,name} → {token, student}
  POST /api/auth/teacher/login              {password} → {token}

老师 - 班级与名单
  GET  /api/teacher/classes                 班级 + 人数
  POST /api/teacher/classes                 建班
  POST /api/teacher/students/import         批量导入 [{name,class}]（含判重报告）
  GET  /api/teacher/students?classId=       学生列表
  PATCH/api/teacher/students/:id            改名 / 加 dedup_label / 停用
  GET  /api/teacher/students/:id/logins     登录记录
  POST /api/teacher/students/:id/revoke     清除登录态（login_version++）

老师 - 题库
  GET  /api/teacher/questions               题目列表（可按章节/知识点/题型过滤）
  POST /api/teacher/questions               建题
  PATCH/api/teacher/questions/:id           改题
  DELETE /api/teacher/questions/:id         删题

老师 - 作业与统计
  POST /api/teacher/assignments             建作业 {title,dueAt,classIds,questions[]}
  GET  /api/teacher/assignments             作业列表
  GET  /api/teacher/assignments/:id/stats   统计：提交进度/平均用时/平均分/每题正确率

学生 - 作业
  GET  /api/student/assignments             我的作业列表（含状态）
  GET  /api/student/assignments/:id         作业详情（题目，不含答案）
  POST /api/student/assignments/:id/start   开始（记录 started_at）
  POST /api/student/assignments/:id/submit  提交 {answers[], durationSec} → 客观判分结果
  GET  /api/student/assignments/:id/result  结果（客观对错 + 得分 + 解析；简答待批改）
```

## 9. 客观题判分逻辑（`src/lib/grading/objective.ts`，纯函数）

- **单选 single**：`content===answer` → 1 分（该题满分），否则 0。
- **多选 multi**：完全一致 → 满分；**部分正确且无错选 → 满分 × 50%（半对）**；有错选 → 0。
- **填空 fill**：学生文本经归一化（去首尾空白、全角→半角、大小写不敏感）后，命中 `answer_json` 可接受答案列表任一 → 满分，否则 0。
- **简答 short**：本轮不判分，`is_correct=NULL`、`score=NULL`，`submission.status` 若含未判简答则记为 `submitted`（非 `graded`）；纯客观作业提交即 `graded`。
- `objective_score` = 各客观题得分和；`total_score` 本轮 = `objective_score`（简答未计分）。

判分为纯函数，输入题目 + 作答、输出得分与对错，先写单测覆盖上述全部分支再实现。

## 10. 错误处理

- 服务层抛带 `code` 的领域错误；路由层统一映射为 `{error:{code,message}}` + 合适 HTTP 状态。
- 常见码：`unauthorized` / `forbidden` / `student_not_found` / `duplicate_name` / `session_revoked` / `validation_error` / `not_found` / `conflict`。
- 前端：全局 fetch 封装，401/`session_revoked` 自动登出；其余 toast 中文提示；表单校验前置。

## 11. 测试策略（TDD）

- **单测（Vitest）**：token 签发/校验、客观判分全分支、同名判重、导入解析与判重报告、归一化匹配。
- **集成（vitest-pool-workers）**：关键路由跑本地真实 D1 —— 学生登录（0/1/多命中）、导入、建题建作业、答题提交判分、统计、越权 403、清除登录态后旧 token 失效。
- 每功能先写测试再实现；**完成前必须跑通全部测试**，以输出为证。

## 12. UI/UX

- **结构语言：Bento Box** —— 仪表板以不对称卡片网格呈现，圆角 16px（rounded-xl）、微阴影、hover scale 1.02、平滑过渡；中性底色 `#FFFFFF` / `#F5F5F5` + 单一品牌强调色；Inter 字体；**完整深色模式**（next-themes + Tailwind `dark:`）。
- **动效点睛：Motion-Driven（克制使用）** —— Framer Motion 做入场 stagger、页面切换、hover 微交互，时长 300–400ms；因 Motion-Driven 本身警告不宜用于数据仪表板，故仅点睛、不铺满，并统一封装在 `components/motion/` 中**遵守 `prefers-reduced-motion`**（用户系统开启减少动效则关闭动画）。
- **响应式（本条为显示适配，非独立功能）**：移动优先；学生端（选班/答题/结果）为手机浏览器优化，单列大按钮、计时器常驻；老师后台（名单/题库/作业/统计）桌面多列网格，手机上自动降为单列可用。同一套页面适配手机与电脑浏览器。
- **计时器**：答题页客户端计时，提交时上报 `durationSec`；切后台/刷新不丢（localStorage 暂存开始时间）。

## 13. 环境变量

```
ADMIN_PASSWORD     老师后台密码（Cloudflare Secret）
AUTH_SECRET        JWT 签名密钥（Cloudflare Secret）
# D1 / R2 通过 wrangler.jsonc 的 bindings 注入，非 env 明文
```
本地开发用 `.dev.vars`（加入 .gitignore）；线上用 `wrangler secret put`。README 说明两处。

## 14. 部署（Cloudflare Workers + OpenNext）

- `wrangler.jsonc`：配置 D1 绑定（`DB`）、R2 绑定（`BUCKET`，本轮预留）、`nodejs_compat`。
- 迁移：`drizzle-kit generate` 产出 SQL → `wrangler d1 migrations apply`（本地 `--local`，线上远程）。
- 构建部署：`opennextjs-cloudflare build` → `wrangler deploy`（或 `opennextjs-cloudflare deploy`）。
- README 覆盖：本地运行、环境变量、D1 迁移、R2 桶创建、首次部署与后续部署步骤。

## 15. 非目标与未决

- **非目标（本轮明确不做）**：见 §3.2。
- **已知取舍**：单一管理员密码 ⇒ 老师看全部班级（§6.5）；简答题本轮只存不判（§9）。
- **未决问题**：无（如需"每位老师只看自己班"，需在后续轮次引入老师账号表，届时单开规格）。

## 16. 交付定义（本轮 Done）

1. 可本地 `dev` 运行，本地 D1 迁移可用。
2. 全部单测 + 集成测试通过（以输出为证）。
3. 端到端手测闭环：老师建班→导名单→建题→建作业；学生选班登录→答题计时→提交→看客观判分与解析；老师看统计。
4. README 完整（运行 / env / 迁移 / 部署）。
5. 深色模式与手机/桌面显示适配正常。

