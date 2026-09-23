# 物理教学工作台 —— 地基 + 切片A 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 subagent-driven-development（推荐）或 executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法跟踪进度。

**目标：** 打通"登录 → 老师建题建作业 → 学生答题计时提交 → 客观题自动判分 → 基础统计"的端到端闭环，无任何外部 AI/OCR 依赖。

**架构：** Next.js 15 App Router 单体，Route Handlers 作后端；服务层（`src/server/*`）封装领域逻辑，路由层只做鉴权与错误映射；纯逻辑（token、判分）独立成可单测模块；Drizzle + D1 持久化；`jose` 无状态 JWT 存 localStorage。

**技术栈：** Next.js 15、TypeScript、Tailwind、shadcn/ui、Framer Motion、next-themes、`@opennextjs/cloudflare`、Cloudflare Workers/D1/R2、Drizzle ORM、drizzle-kit、Vitest、`@cloudflare/vitest-pool-workers`、`jose`。

**规格：** `docs/superpowers/specs/2026-09-23-physics-workbench-foundation-slice-a-design.md`（执行者两份都读）

## 全局约束

- 运行时：所有 Route Handler 在 Workers 运行；不用 Node-only API；`wrangler.jsonc` 开 `nodejs_compat`。
- 密钥：`ADMIN_PASSWORD`、`AUTH_SECRET` 只走环境变量 / `.dev.vars`（本地）/ `wrangler secret`（线上），**绝不硬编码、绝不写进日志**。
- 统一响应：成功 `{ data }`；失败 `{ error: { code, message } }`，message 为中文，HTTP 状态语义正确。
- 时间戳：数据库用 Unix 秒（INT）。
- JWT 载荷：学生 `{ sub:studentId, role:'student', classId, lv }`；老师 `{ role:'teacher' }`。
- 判重键：students `UNIQUE(class_id, name, dedup_label)`；submissions `UNIQUE(assignment_id, student_id)`。
- 题型集合：`single | multi | fill | short`；简答本轮只存不判分。
- 测试为证：每个后端任务完成前须跑通其测试并粘贴输出；前端任务须 `next build` 通过 + 手测清单勾选。
- 频繁 commit：每个任务至少一次 commit，信息用中文 Conventional Commits。

## 文件结构与职责

| 文件 | 职责 |
|---|---|
| `wrangler.jsonc` | Workers 配置：D1 绑定 `DB`、R2 绑定 `BUCKET`（预留）、`nodejs_compat` |
| `open-next.config.ts` | OpenNext 适配配置 |
| `drizzle.config.ts` | drizzle-kit 迁移配置（sqlite/d1） |
| `vitest.config.ts` | Vitest + workers pool 配置 |
| `.dev.vars` | 本地密钥（gitignore） |
| `src/db/schema.ts` | 全部本轮表的 Drizzle 定义 |
| `src/db/client.ts` | 从 env 绑定构造 `drizzle(db)` |
| `src/lib/auth/token.ts` | `signToken` / `verifyToken`（jose，纯逻辑） |
| `src/lib/auth/guards.ts` | `requireStudent` / `requireTeacher`（读 header + 校验 lv/status） |
| `src/lib/grading/objective.ts` | `gradeAnswer` 客观判分纯函数 |
| `src/lib/http.ts` | `ok()` / `fail()` 响应helper、`AppError` |
| `src/server/classes/*` `students/*` `questions/*` `assignments/*` `submissions/*` `stats/*` | 各域服务层 |
| `app/api/**/route.ts` | 薄路由 |
| `app/(auth)/`、`app/(student)/`、`app/(teacher)/` | 页面 |
| `src/components/ui/*` | shadcn |
| `src/components/bento/*`、`src/components/motion/*` | 布局与受控动画 |
| `src/lib/client/fetcher.ts` | 前端 fetch 封装（带 token、401 自动登出） |
| `README.md` | 运行/env/迁移/部署 |

## 任务清单（15 个，逐任务 TDD）

> 后端任务顺序：脚手架 → schema → 纯逻辑（token/判分）→ 服务+路由。纯逻辑先做，路由复用。前端任务在后端 API 齐备后进行。

---

### 任务 1：项目脚手架 + 工具链

**文件：**
- 创建：`package.json`、`tsconfig.json`、`next.config.ts`、`postcss.config.mjs`、`tailwind.config.ts`、`app/globals.css`、`app/layout.tsx`、`app/page.tsx`
- 创建：`wrangler.jsonc`、`open-next.config.ts`、`drizzle.config.ts`、`vitest.config.ts`
- 创建：`.gitignore`、`.dev.vars`、`.env.example`、`README.md`（占位，任务 15 补全）

- [ ] **步骤 1：初始化 Next.js + 依赖**

在 `D:\physics-workbench` 执行（已 git init，目录非空则手动建文件，勿覆盖 `docs/`）：

```bash
npm init -y
npm i next@15 react react-dom
npm i -D typescript @types/react @types/node @types/react-dom
npm i tailwindcss postcss autoprefixer next-themes framer-motion
npm i drizzle-orm jose
npm i -D drizzle-kit wrangler @opennextjs/cloudflare
npm i -D vitest @cloudflare/vitest-pool-workers @vitest/coverage-v8
```

`package.json` 的 `scripts`：

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "drizzle-kit generate",
    "db:migrate:local": "wrangler d1 migrations apply physics_workbench --local",
    "db:migrate:remote": "wrangler d1 migrations apply physics_workbench --remote",
    "cf:build": "opennextjs-cloudflare build",
    "cf:deploy": "opennextjs-cloudflare deploy",
    "cf:preview": "opennextjs-cloudflare preview"
  }
}
```

- [ ] **步骤 2：写 `wrangler.jsonc`（D1 / R2 预留 / nodejs_compat）**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "physics-workbench",
  "main": ".open-next/worker.js",
  "compatibility_date": "2025-03-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": { "directory": ".open-next/assets", "binding": "ASSETS" },
  "d1_databases": [
    { "binding": "DB", "database_name": "physics_workbench", "database_id": "PLACEHOLDER_RUN_wrangler_d1_create", "migrations_dir": "drizzle" }
  ],
  "r2_buckets": [
    { "binding": "BUCKET", "bucket_name": "physics-workbench-uploads" }
  ]
}
```

> `database_id` 由 `npx wrangler d1 create physics_workbench` 产出后回填；本地测试用 `--local` 不需要真实 id。R2 桶本轮仅声明绑定、不写入。

- [ ] **步骤 3：写 `open-next.config.ts`**

```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
export default defineCloudflareConfig({});
```

- [ ] **步骤 4：写 `drizzle.config.ts`**

```ts
import type { Config } from "drizzle-kit";
export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  driver: "d1-http",
} satisfies Config;
```

- [ ] **步骤 5：写 `vitest.config.ts`（workers pool，跑本地真实 D1）**

```ts
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          d1Databases: ["DB"],
          bindings: { AUTH_SECRET: "test-secret-please-change", ADMIN_PASSWORD: "test-admin-pw" },
        },
      },
    },
  },
});
```

- [ ] **步骤 6：写 `.gitignore` / `.dev.vars` / `.env.example`**

`.gitignore` 追加：

```
node_modules/
.next/
.open-next/
.wrangler/
.dev.vars
coverage/
```

`.dev.vars`（本地密钥，已 gitignore）：

```
ADMIN_PASSWORD=dev-admin-123
AUTH_SECRET=dev-secret-change-me-please-32chars-min
```

`.env.example`（入库，仅示例不含真值）：

```
ADMIN_PASSWORD=
AUTH_SECRET=
```

- [ ] **步骤 7：Tailwind + 根布局最小骨架**

`tailwind.config.ts` 开 `darkMode: "class"`，`content` 指向 `./app/**/*.{ts,tsx}` 与 `./src/**/*.{ts,tsx}`；`app/globals.css` 引入 `@tailwind base/components/utilities`；`app/layout.tsx` 挂 `<html lang="zh-CN" suppressHydrationWarning>` + `Inter` 字体；`app/page.tsx` 临时重定向到 `/login`。

- [ ] **步骤 8：验证构建通过**

运行：`npm run build`
预期：Next.js 构建成功，无类型错误。

- [ ] **步骤 9：Commit**

```bash
git add -A
git commit -m "chore: 初始化 Next.js 15 + Cloudflare Workers/D1 + Drizzle + Vitest 脚手架"
```

---

### 任务 2：D1 数据模型 + 迁移 + db client

**文件：**
- 创建：`src/db/schema.ts`（全部本轮表）
- 创建：`src/db/client.ts`（从 env 绑定构造 drizzle）
- 生成：`drizzle/0000_*.sql`（drizzle-kit 产出）
- 测试：`src/db/__tests__/schema.test.ts`

- [ ] **步骤 1：编写失败的集成测试（建表后可增删查）**

`src/db/__tests__/schema.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { classes, students } from "../schema";

describe("schema + D1", () => {
  it("插入班级与学生并按班级查询", async () => {
    const db = drizzle(env.DB);
    const [c] = await db.insert(classes).values({ name: "八年级(1)班" }).returning();
    await db.insert(students).values({ classId: c.id, name: "张三" });
    const rows = await db.select().from(students).where(eq(students.classId, c.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("active");
    expect(rows[0].loginVersion).toBe(0);
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test -- schema`
预期：FAIL —— `schema.ts` 尚不存在 / 表未迁移。

- [ ] **步骤 3：编写 `src/db/schema.ts`**

```ts
import { sqliteTable, integer, text, real, unique, primaryKey } from "drizzle-orm/sqlite-core";

const nowSec = () => Math.floor(Date.now() / 1000);

export const classes = sqliteTable("classes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: integer("created_at").notNull().$defaultFn(nowSec),
});

export const students = sqliteTable("students", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  classId: integer("class_id").notNull().references(() => classes.id),
  name: text("name").notNull(),
  dedupLabel: text("dedup_label").notNull().default(""),
  status: text("status", { enum: ["active", "disabled"] }).notNull().default("active"),
  loginVersion: integer("login_version").notNull().default(0),
  createdAt: integer("created_at").notNull().$defaultFn(nowSec),
}, (t) => ({ uniqNameLabel: unique().on(t.classId, t.name, t.dedupLabel) }));

export const questions = sqliteTable("questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type", { enum: ["single", "multi", "fill", "short"] }).notNull(),
  stem: text("stem").notNull(),
  optionsJson: text("options_json"),
  answerJson: text("answer_json"),
  analysis: text("analysis"),
  knowledgeTagsJson: text("knowledge_tags_json").notNull().default("[]"),
  chapter: text("chapter"),
  difficulty: integer("difficulty").notNull().default(1),
  createdAt: integer("created_at").notNull().$defaultFn(nowSec),
});

export const assignments = sqliteTable("assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  type: text("type", { enum: ["normal"] }).notNull().default("normal"),
  dueAt: integer("due_at"),
  createdAt: integer("created_at").notNull().$defaultFn(nowSec),
});
```

`src/db/schema.ts`（续，同一文件）：

```ts
export const assignmentClasses = sqliteTable("assignment_classes", {
  assignmentId: integer("assignment_id").notNull().references(() => assignments.id),
  classId: integer("class_id").notNull().references(() => classes.id),
}, (t) => ({ pk: primaryKey({ columns: [t.assignmentId, t.classId] }) }));

export const assignmentQuestions = sqliteTable("assignment_questions", {
  assignmentId: integer("assignment_id").notNull().references(() => assignments.id),
  questionId: integer("question_id").notNull().references(() => questions.id),
  orderNo: integer("order_no").notNull(),
  score: real("score").notNull(),
}, (t) => ({ pk: primaryKey({ columns: [t.assignmentId, t.questionId] }) }));

export const submissions = sqliteTable("submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  assignmentId: integer("assignment_id").notNull().references(() => assignments.id),
  studentId: integer("student_id").notNull().references(() => students.id),
  status: text("status", { enum: ["not_started", "submitted", "graded"] }).notNull().default("not_started"),
  startedAt: integer("started_at"),
  submittedAt: integer("submitted_at"),
  durationSec: integer("duration_sec"),
  objectiveScore: real("objective_score"),
  totalScore: real("total_score"),
  createdAt: integer("created_at").notNull().$defaultFn(nowSec),
}, (t) => ({ uniqOne: unique().on(t.assignmentId, t.studentId) }));

export const answers = sqliteTable("answers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  submissionId: integer("submission_id").notNull().references(() => submissions.id),
  questionId: integer("question_id").notNull().references(() => questions.id),
  contentJson: text("content_json").notNull(),
  isCorrect: integer("is_correct"),
  score: real("score"),
  durationSec: integer("duration_sec"),
});

export const loginLogs = sqliteTable("login_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id").notNull().references(() => students.id),
  ip: text("ip"),
  ua: text("ua"),
  createdAt: integer("created_at").notNull().$defaultFn(nowSec),
});
```

- [ ] **步骤 4：编写 `src/db/client.ts`**

```ts
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export type DB = ReturnType<typeof getDb>;

export function getDb(d1: D1Database) {
  return drizzle(d1, { schema });
}
```

> 路由/服务里通过 `getCloudflareContext().env.DB` 拿到 D1 绑定后传入 `getDb`。测试里用 `cloudflare:test` 的 `env.DB`。

- [ ] **步骤 5：生成迁移**

运行：`npm run db:generate`
预期：产出 `drizzle/0000_*.sql`，含全部 8 张表 + UNIQUE 约束 + 复合主键。检查生成的 SQL 含 `UNIQUE(class_id, name, dedup_label)` 与 `UNIQUE(assignment_id, student_id)`。

- [ ] **步骤 6：运行测试验证通过**

运行：`npm test -- schema`
预期：PASS（vitest-pool-workers 自动对本地 D1 应用 `migrations_dir` 下迁移）。

- [ ] **步骤 7：Commit**

```bash
git add -A
git commit -m "feat: 定义本轮全部 D1 表结构、db client 与首个迁移"
```

---

### 任务 3：JWT token.ts（纯逻辑，单测）

**文件：**
- 创建：`src/lib/auth/token.ts`
- 测试：`src/lib/auth/__tests__/token.test.ts`

- [ ] **步骤 1：编写失败的单测**

```ts
import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "../token";

const SECRET = "unit-test-secret-at-least-32-bytes-long!!";

describe("token", () => {
  it("学生 token 往返", async () => {
    const t = await signToken({ sub: 7, role: "student", classId: 3, lv: 0 }, SECRET);
    const p = await verifyToken(t, SECRET);
    expect(p).toMatchObject({ sub: 7, role: "student", classId: 3, lv: 0 });
  });
```

测试文件续（同一 describe）：

```ts
  it("老师 token 往返", async () => {
    const t = await signToken({ role: "teacher" }, SECRET);
    const p = await verifyToken(t, SECRET);
    expect(p.role).toBe("teacher");
  });

  it("被篡改的 token 校验失败", async () => {
    const t = await signToken({ role: "teacher" }, SECRET);
    await expect(verifyToken(t + "x", SECRET)).rejects.toThrow();
  });

  it("错误密钥校验失败", async () => {
    const t = await signToken({ role: "teacher" }, SECRET);
    await expect(verifyToken(t, "another-wrong-secret-32bytes-long!!!!")).rejects.toThrow();
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test -- token`
预期：FAIL —— `token.ts` 未定义 `signToken`/`verifyToken`。

- [ ] **步骤 3：编写 `src/lib/auth/token.ts`**

```ts
import { SignJWT, jwtVerify } from "jose";

export type StudentClaims = { sub: number; role: "student"; classId: number; lv: number };
export type TeacherClaims = { role: "teacher" };
export type Claims = StudentClaims | TeacherClaims;

const enc = (secret: string) => new TextEncoder().encode(secret);

export async function signToken(claims: Claims, secret: string): Promise<string> {
  return await new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(enc(secret));
}

export async function verifyToken<T extends Claims = Claims>(token: string, secret: string): Promise<T> {
  const { payload } = await jwtVerify(token, enc(secret), { algorithms: ["HS256"] });
  return payload as unknown as T;
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npm test -- token`
预期：PASS（4 条）。

- [ ] **步骤 5：Commit**

```bash
git add -A
git commit -m "feat: 实现 jose HS256 JWT 签发/校验纯逻辑与单测"
```

---

### 任务 4：客观题判分纯函数（纯逻辑，单测）

> 先于路由实现，任务 9 提交接口复用它。

**文件：**
- 创建：`src/lib/grading/objective.ts`
- 测试：`src/lib/grading/__tests__/objective.test.ts`

- [ ] **步骤 1：编写失败的单测（覆盖全部分支）**

```ts
import { describe, it, expect } from "vitest";
import { gradeAnswer } from "../objective";

describe("gradeAnswer", () => {
  const full = 10;
  it("单选正确得满分", () => {
    expect(gradeAnswer({ type: "single", answer: "A", content: "A", full })).toEqual({ isCorrect: 1, score: 10 });
  });
  it("单选错误得 0", () => {
    expect(gradeAnswer({ type: "single", answer: "A", content: "B", full })).toEqual({ isCorrect: 0, score: 0 });
  });
  it("多选完全一致得满分（乱序也算对）", () => {
    expect(gradeAnswer({ type: "multi", answer: ["A", "C"], content: ["C", "A"], full })).toEqual({ isCorrect: 1, score: 10 });
  });
  it("多选部分正确且无错选得半分", () => {
    expect(gradeAnswer({ type: "multi", answer: ["A", "B", "C"], content: ["A", "B"], full })).toEqual({ isCorrect: 0, score: 5 });
  });
  it("多选有错选得 0", () => {
    expect(gradeAnswer({ type: "multi", answer: ["A", "B"], content: ["A", "D"], full })).toEqual({ isCorrect: 0, score: 0 });
  });
  it("多选空作答得 0", () => {
    expect(gradeAnswer({ type: "multi", answer: ["A"], content: [], full })).toEqual({ isCorrect: 0, score: 0 });
  });
```

测试文件续（同一 describe）：

```ts
  it("填空归一化命中（去空白+全角转半角+大小写不敏感）", () => {
    expect(gradeAnswer({ type: "fill", answer: ["2m/s", "2 m/s"], content: " ２M/S ", full })).toEqual({ isCorrect: 1, score: 10 });
  });
  it("填空不命中得 0", () => {
    expect(gradeAnswer({ type: "fill", answer: ["2m/s"], content: "3m/s", full })).toEqual({ isCorrect: 0, score: 0 });
  });
  it("简答本轮不判分", () => {
    expect(gradeAnswer({ type: "short", answer: null, content: "任何文本", full })).toEqual({ isCorrect: null, score: null });
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test -- objective`
预期：FAIL —— `gradeAnswer` 未定义。

- [ ] **步骤 3：编写 `src/lib/grading/objective.ts`**

```ts
export type GradeInput =
  | { type: "single"; answer: string; content: string; full: number }
  | { type: "multi"; answer: string[]; content: string[]; full: number }
  | { type: "fill"; answer: string[]; content: string; full: number }
  | { type: "short"; answer: null; content: string; full: number };

export type GradeResult = { isCorrect: number | null; score: number | null };

function normalize(s: string): string {
  return s
    .trim()
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)) // 全角→半角
    .replace(/　/g, " ") // 全角空格
    .replace(/\s+/g, "")
    .toLowerCase();
}

export function gradeAnswer(input: GradeInput): GradeResult {
  const { type, full } = input;
  if (type === "single") {
    const ok = input.content === input.answer;
    return { isCorrect: ok ? 1 : 0, score: ok ? full : 0 };
  }
```

`objective.ts` 续（同一函数体）：

```ts
  if (type === "multi") {
    const ans = new Set(input.answer);
    const got = input.content;
    if (got.length === 0) return { isCorrect: 0, score: 0 };
    const hasWrong = got.some((k) => !ans.has(k));
    if (hasWrong) return { isCorrect: 0, score: 0 };
    const uniqGot = new Set(got);
    if (uniqGot.size === ans.size) return { isCorrect: 1, score: full }; // 无错选且数量齐 = 全对
    return { isCorrect: 0, score: full * 0.5 }; // 部分正确且无错选 = 半对
  }
  if (type === "fill") {
    const norm = normalize(input.content);
    const ok = input.answer.some((a) => normalize(a) === norm);
    return { isCorrect: ok ? 1 : 0, score: ok ? full : 0 };
  }
  // short：本轮不判分
  return { isCorrect: null, score: null };
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npm test -- objective`
预期：PASS（10 条，覆盖单选对错 / 多选全对·半对·错选·空 / 填空归一化命中·不命中 / 简答不判）。

- [ ] **步骤 5：Commit**

```bash
git add -A
git commit -m "feat: 实现客观题判分纯函数(含多选半对与填空归一化)与全分支单测"
```

---

### 任务 5：HTTP helpers + 权限守卫

**文件：**
- 创建：`src/lib/http.ts`（`ok` / `fail` / `AppError`）
- 创建：`src/lib/auth/guards.ts`（`requireStudent` / `requireTeacher`）
- 创建：`src/lib/env.ts`（统一取 Cloudflare env 绑定）
- 测试：`src/lib/auth/__tests__/guards.test.ts`

- [ ] **步骤 1：编写 `src/lib/http.ts`（先建，守卫依赖它）**

```ts
export class AppError extends Error {
  constructor(public code: string, public message: string, public status: number) {
    super(message);
  }
}

const CODE_STATUS: Record<string, number> = {
  unauthorized: 401, forbidden: 403, student_not_found: 404, duplicate_name: 409,
  session_revoked: 401, validation_error: 400, not_found: 404, conflict: 409,
};

export function ok<T>(data: T, status = 200): Response {
  return Response.json({ data }, { status });
}

export function fail(err: unknown): Response {
  if (err instanceof AppError) {
    return Response.json({ error: { code: err.code, message: err.message } }, { status: err.status });
  }
  const code = "internal_error";
  console.error("[unhandled]", err instanceof Error ? err.message : String(err)); // 不打印密钥/载荷
  return Response.json({ error: { code, message: "服务器内部错误，请稍后重试" } }, { status: 500 });
}

export function appError(code: keyof typeof CODE_STATUS, message: string): AppError {
  return new AppError(code, message, CODE_STATUS[code] ?? 400);
}
```

- [ ] **步骤 2：编写 `src/lib/env.ts`**

```ts
import { getCloudflareContext } from "@opennextjs/cloudflare";

export function cfEnv() {
  const { env } = getCloudflareContext();
  return env as {
    DB: D1Database;
    BUCKET: R2Bucket;
    AUTH_SECRET: string;
    ADMIN_PASSWORD: string;
  };
}
```

- [ ] **步骤 3：编写失败的集成测试（守卫）**

`src/lib/auth/__tests__/guards.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { classes, students } from "../../../db/schema";
import { signToken } from "../token";
import { requireStudent, requireTeacher } from "../guards";
import { AppError } from "../../http";

function req(token?: string) {
  return new Request("http://x", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
}
const deps = () => ({ db: getDb(env.DB), secret: env.AUTH_SECRET });

describe("guards", () => {
  it("无 token → unauthorized", async () => {
    await expect(requireStudent(req(), deps())).rejects.toMatchObject({ code: "unauthorized" });
  });
  it("学生 token 且 lv 匹配 → 返回 studentId", async () => {
    const db = getDb(env.DB);
    const [c] = await db.insert(classes).values({ name: "1班" }).returning();
    const [s] = await db.insert(students).values({ classId: c.id, name: "李四" }).returning();
    const t = await signToken({ sub: s.id, role: "student", classId: c.id, lv: 0 }, env.AUTH_SECRET);
    await expect(requireStudent(req(t), deps())).resolves.toBe(s.id);
  });
  it("lv 落后于库 → session_revoked", async () => {
    const db = getDb(env.DB);
    const [c] = await db.insert(classes).values({ name: "2班" }).returning();
    const [s] = await db.insert(students).values({ classId: c.id, name: "王五" }).returning();
    const t = await signToken({ sub: s.id, role: "student", classId: c.id, lv: 0 }, env.AUTH_SECRET);
    await db.update(students).set({ loginVersion: 1 }).where(eq(students.id, s.id));
    await expect(requireStudent(req(t), deps())).rejects.toMatchObject({ code: "session_revoked" });
  });
  it("学生 token 调 requireTeacher → forbidden", async () => {
    const t = await signToken({ sub: 1, role: "student", classId: 1, lv: 0 }, env.AUTH_SECRET);
    await expect(requireTeacher(req(t), env.AUTH_SECRET)).rejects.toBeInstanceOf(AppError);
  });
});
```

- [ ] **步骤 4：运行测试验证失败**

运行：`npm test -- guards`
预期：FAIL —— `guards.ts` 未定义。

- [ ] **步骤 5：编写 `src/lib/auth/guards.ts`（依赖注入，便于单测与路由复用）**

```ts
import { eq } from "drizzle-orm";
import type { DB } from "../../db/client";
import { students } from "../../db/schema";
import { verifyToken, type StudentClaims, type TeacherClaims } from "./token";
import { appError } from "../http";

function bearer(req: Request): string {
  const h = req.headers.get("Authorization") ?? "";
  const m = h.match(/^Bearer (.+)$/);
  if (!m) throw appError("unauthorized", "未登录或登录已过期");
  return m[1];
}

/** 校验学生 token：签名 + login_version + status，返回 studentId */
export async function requireStudent(req: Request, deps: { db: DB; secret: string }): Promise<number> {
  const token = bearer(req);
  let claims: StudentClaims;
  try {
    claims = await verifyToken<StudentClaims>(token, deps.secret);
  } catch {
    throw appError("unauthorized", "登录状态无效，请重新登录");
  }
  if (claims.role !== "student") throw appError("forbidden", "无权访问");
  const row = await deps.db.select().from(students).where(eq(students.id, claims.sub)).get();
  if (!row) throw appError("unauthorized", "登录状态无效，请重新登录");
  if (row.loginVersion !== claims.lv) throw appError("session_revoked", "登录态已被清除，请重新登录");
  if (row.status === "disabled") throw appError("forbidden", "登录已被老师暂停");
  return row.id;
}

/** 校验老师 token：签名 + role */
export async function requireTeacher(req: Request, secret: string): Promise<void> {
  const token = bearer(req);
  let claims: TeacherClaims;
  try {
    claims = await verifyToken<TeacherClaims>(token, secret);
  } catch {
    throw appError("unauthorized", "登录状态无效，请重新登录");
  }
  if (claims.role !== "teacher") throw appError("forbidden", "无权访问");
}
```

- [ ] **步骤 6：运行测试验证通过**

运行：`npm test -- guards`
预期：PASS（4 条：无 token / 正常 / session_revoked / 越权）。

- [ ] **步骤 7：Commit**

```bash
git add -A
git commit -m "feat: 实现统一响应helper、AppError 与 requireStudent/requireTeacher 守卫"
```

---

### 任务 6：认证 API（班级列表 + 学生/老师登录 + 清除登录态）

**文件：**
- 创建：`src/server/auth/service.ts`（登录领域逻辑，可测）
- 创建：`app/api/classes/route.ts`
- 创建：`app/api/auth/student/login/route.ts`、`app/api/auth/teacher/login/route.ts`
- 测试：`src/server/auth/__tests__/login.test.ts`

- [ ] **步骤 1：编写失败的集成测试（登录三分支 + 老师密码 + 清除）**

`src/server/auth/__tests__/login.test.ts`：

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { getDb } from "../../../db/client";
import { classes, students } from "../../../db/schema";
import { studentLogin, teacherLogin } from "../service";

async function seed() {
  const db = getDb(env.DB);
  const [c] = await db.insert(classes).values({ name: "八(1)班" }).returning();
  await db.insert(students).values([
    { classId: c.id, name: "张三", dedupLabel: "" },
    { classId: c.id, name: "王二", dedupLabel: "1" },
    { classId: c.id, name: "王二", dedupLabel: "2" },
  ]);
  return { db, classId: c.id };
}
```

测试文件续：

```ts
describe("studentLogin", () => {
  it("0 命中 → student_not_found", async () => {
    const { db, classId } = await seed();
    await expect(studentLogin(db, { classId, name: "不存在" }, env.AUTH_SECRET, null))
      .rejects.toMatchObject({ code: "student_not_found" });
  });
  it(">1 同名命中 → duplicate_name", async () => {
    const { db, classId } = await seed();
    await expect(studentLogin(db, { classId, name: "王二" }, env.AUTH_SECRET, null))
      .rejects.toMatchObject({ code: "duplicate_name", message: "该班级有多个同名同学，请联系老师处理" });
  });
  it("1 命中 active → 返回 token 且写 login_logs", async () => {
    const { db, classId } = await seed();
    const r = await studentLogin(db, { classId, name: "张三" }, env.AUTH_SECRET, { ip: "1.1.1.1", ua: "test" });
    expect(r.token).toBeTruthy();
    expect(r.student.name).toBe("张三");
    const logs = await db.query.loginLogs.findMany();
    expect(logs).toHaveLength(1);
  });
  it("disabled → forbidden", async () => {
    const { db, classId } = await seed();
    await db.update(students).set({ status: "disabled" }).where(eq(students.name, "张三"));
    await expect(studentLogin(db, { classId, name: "张三" }, env.AUTH_SECRET, null))
      .rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("teacherLogin", () => {
  it("密码正确 → token", async () => {
    const r = await teacherLogin("test-admin-pw", env.ADMIN_PASSWORD, env.AUTH_SECRET);
    expect(r.token).toBeTruthy();
  });
  it("密码错误 → unauthorized", async () => {
    await expect(teacherLogin("wrong", env.ADMIN_PASSWORD, env.AUTH_SECRET))
      .rejects.toMatchObject({ code: "unauthorized" });
  });
});
```

> 顶部需 `import { eq } from "drizzle-orm"; import { loginLogs } from "../../../db/schema";`（若 `db.query.loginLogs` 未启用则改用 `db.select().from(loginLogs)`）。

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test -- login`
预期：FAIL —— `service.ts` 未定义。

- [ ] **步骤 3：编写 `src/server/auth/service.ts`**

```ts
import { and, eq } from "drizzle-orm";
import type { DB } from "../../db/client";
import { students, loginLogs } from "../../db/schema";
import { signToken } from "../../lib/auth/token";
import { appError } from "../../lib/http";

/** 常量时间比较，避免时序侧信道 */
function timingSafeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}

export async function studentLogin(
  db: DB,
  input: { classId: number; name: string },
  secret: string,
  meta: { ip: string | null; ua: string | null } | null,
) {
  const name = input.name.trim();
  if (!name) throw appError("validation_error", "请输入姓名");
  const matches = await db.select().from(students)
    .where(and(eq(students.classId, input.classId), eq(students.name, name)));
  if (matches.length === 0) throw appError("student_not_found", "未找到该同学，请核对姓名或联系老师");
  if (matches.length > 1) throw appError("duplicate_name", "该班级有多个同名同学，请联系老师处理");
  const s = matches[0];
  if (s.status === "disabled") throw appError("forbidden", "登录已被老师暂停");
  await db.insert(loginLogs).values({ studentId: s.id, ip: meta?.ip ?? null, ua: meta?.ua ?? null });
  const token = await signToken({ sub: s.id, role: "student", classId: s.classId, lv: s.loginVersion }, secret);
  return { token, student: { id: s.id, name: s.name, classId: s.classId } };
}

export async function teacherLogin(input: string, adminPassword: string, secret: string) {
  if (!timingSafeEqual(input, adminPassword)) throw appError("unauthorized", "密码错误");
  const token = await signToken({ role: "teacher" }, secret);
  return { token };
}
```

- [ ] **步骤 4：编写路由（薄路由：鉴权→调服务→统一响应）**

`app/api/classes/route.ts`：

```ts
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
```

`app/api/auth/student/login/route.ts`：

```ts
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
```

`app/api/auth/teacher/login/route.ts`：类似，读 `{ password }`，调 `teacherLogin(password, env.ADMIN_PASSWORD, env.AUTH_SECRET)`，返回 `{ token }`。**切勿把密码写日志。**

- [ ] **步骤 5：运行测试验证通过**

运行：`npm test -- login`
预期：PASS（6 条：0/1/多命中 + disabled + 老师对/错）。

- [ ] **步骤 6：Commit**

```bash
git add -A
git commit -m "feat: 实现班级列表与学生/老师登录(含同名判重与常量时间比对)API"
```

---

### 任务 7：老师端班级与名单管理 API

**文件：**
- 创建：`src/server/students/service.ts`（建班/导入判重/列表/改学生/清除登录态）
- 创建：`app/api/teacher/classes/route.ts`（GET 班级+人数、POST 建班）
- 创建：`app/api/teacher/students/import/route.ts`、`app/api/teacher/students/route.ts`
- 创建：`app/api/teacher/students/[id]/route.ts`（PATCH）、`.../[id]/logins/route.ts`、`.../[id]/revoke/route.ts`
- 测试：`src/server/students/__tests__/roster.test.ts`

- [ ] **步骤 1：编写失败的集成测试（导入判重报告 + 清除登录态使旧 token 失效）**

```ts
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { getDb } from "../../../db/client";
import { classes, students } from "../../../db/schema";
import { importStudents, revokeStudent } from "../service";
import { eq } from "drizzle-orm";

describe("importStudents", () => {
  it("批量导入并报告重复", async () => {
    const db = getDb(env.DB);
    const [c] = await db.insert(classes).values({ name: "1班" }).returning();
    const r1 = await importStudents(db, c.id, ["张三", "李四", "张三"]);
    expect(r1.inserted).toBe(2);        // 第二个"张三"与首个同名同 label 冲突
    expect(r1.duplicates).toContain("张三");
    const rows = await db.select().from(students).where(eq(students.classId, c.id));
    expect(rows).toHaveLength(2);
  });
});

describe("revokeStudent", () => {
  it("login_version 自增", async () => {
    const db = getDb(env.DB);
    const [c] = await db.insert(classes).values({ name: "2班" }).returning();
    const [s] = await db.insert(students).values({ classId: c.id, name: "钱七" }).returning();
    await revokeStudent(db, s.id);
    const after = await db.select().from(students).where(eq(students.id, s.id)).get();
    expect(after!.loginVersion).toBe(1);
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test -- roster`；预期 FAIL（service 未定义）。

- [ ] **步骤 3：编写 `src/server/students/service.ts`**

```ts
import { and, eq, sql } from "drizzle-orm";
import type { DB } from "../../db/client";
import { classes, students } from "../../db/schema";
import { appError } from "../../lib/http";

export async function createClass(db: DB, name: string) {
  const n = name.trim();
  if (!n) throw appError("validation_error", "班级名不能为空");
  const [c] = await db.insert(classes).values({ name: n }).returning();
  return c;
}

export async function listClassesWithCount(db: DB) {
  return db.select({
    id: classes.id, name: classes.name,
    count: sql<number>`count(${students.id})`,
  }).from(classes).leftJoin(students, eq(students.classId, classes.id)).groupBy(classes.id);
}

/** 导入名单：dedup_label 默认 ''，同名同 label 冲突则跳过并计入 duplicates */
export async function importStudents(db: DB, classId: number, names: string[]) {
  const duplicates: string[] = [];
  let inserted = 0;
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const exists = await db.select().from(students)
      .where(and(eq(students.classId, classId), eq(students.name, name), eq(students.dedupLabel, ""))).get();
    if (exists) { duplicates.push(name); continue; }
    await db.insert(students).values({ classId, name });
    inserted++;
  }
  return { inserted, duplicates };
}

export async function listStudents(db: DB, classId: number) {
  return db.select().from(students).where(eq(students.classId, classId));
}

export async function updateStudent(db: DB, id: number, patch: { name?: string; dedupLabel?: string; status?: "active" | "disabled" }) {
  const [row] = await db.update(students).set(patch).where(eq(students.id, id)).returning();
  if (!row) throw appError("not_found", "学生不存在");
  return row;
}

export async function revokeStudent(db: DB, id: number) {
  const [row] = await db.update(students)
    .set({ loginVersion: sql`${students.loginVersion} + 1` }).where(eq(students.id, id)).returning();
  if (!row) throw appError("not_found", "学生不存在");
  return row;
}
```

- [ ] **步骤 4：编写路由（全部先 `requireTeacher(req, env.AUTH_SECRET)`）**

各路由统一模板：

```ts
import { cfEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { requireTeacher } from "@/lib/auth/guards";
import { ok, fail } from "@/lib/http";
// ...import 对应 service 函数

// 注意：@opennextjs/cloudflare 在 Workers 上跑 Node 运行时(靠 nodejs_compat)，
// 路由**不要**写 `export const runtime = "edge"`（那是已弃用的 next-on-pages 写法）。默认 Node 运行时即可。

export async function POST(req: Request) {
  try {
    const env = cfEnv();
    await requireTeacher(req, env.AUTH_SECRET);
    const db = getDb(env.DB);
    // 解析 body、调用 service、ok(...)
  } catch (e) { return fail(e); }
}
```

按 §8 落地这些端点：
- `GET /api/teacher/classes` → `listClassesWithCount`；`POST` → `createClass`。
- `POST /api/teacher/students/import` → body `{ classId, names: string[] }`（或 `[{name,class}]` 先归一为按班分组）→ `importStudents`，返回 `{ inserted, duplicates }`。
- `GET /api/teacher/students?classId=` → `listStudents`。
- `PATCH /api/teacher/students/[id]` → `updateStudent`（改名 / 加 dedupLabel / 停用启用）。
- `GET /api/teacher/students/[id]/logins` → 查 `login_logs`（按 `created_at desc`）。
- `POST /api/teacher/students/[id]/revoke` → `revokeStudent`。

> 动态段用 App Router 的 `{ params }: { params: Promise<{ id: string }> }`（Next 15 params 为 Promise，需 `await`）。

- [ ] **步骤 5：补一条集成测试（清除后旧 token 被守卫拒）**

在 roster 测试追加：签发学生 token → `revokeStudent` → 用旧 token 调 `requireStudent` 断言 `session_revoked`。

- [ ] **步骤 6：运行测试验证通过**

运行：`npm test -- roster`；预期 PASS。

- [ ] **步骤 7：Commit**

```bash
git add -A
git commit -m "feat: 老师端班级/名单管理API(建班/导入判重/改名停用/登录记录/清除登录态)"
```

---

### 任务 8：题库 CRUD API

**文件：**
- 创建：`src/server/questions/service.ts` + `src/server/questions/validate.ts`（按题型校验 answer/options 形状）
- 创建：`app/api/teacher/questions/route.ts`（GET 列表带过滤、POST 建题）、`app/api/teacher/questions/[id]/route.ts`（PATCH/DELETE）
- 测试：`src/server/questions/__tests__/questions.test.ts`

- [ ] **步骤 1：编写失败的单测（按题型校验 + 建/改/删/过滤）**

```ts
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { getDb } from "../../../db/client";
import { createQuestion, listQuestions } from "../service";

describe("createQuestion", () => {
  it("单选缺 options 报 validation_error", async () => {
    const db = getDb(env.DB);
    await expect(createQuestion(db, { type: "single", stem: "x", answer: "A" } as any))
      .rejects.toMatchObject({ code: "validation_error" });
  });
  it("单选合法则入库，answer/options 以 JSON 存", async () => {
    const db = getDb(env.DB);
    const q = await createQuestion(db, {
      type: "single", stem: "1+1=?", options: [{ key: "A", text: "1" }, { key: "B", text: "2" }],
      answer: "B", chapter: "运动", knowledgeTags: ["计算"], difficulty: 2,
    });
    expect(q.id).toBeGreaterThan(0);
    const list = await listQuestions(db, { chapter: "运动" });
    expect(list).toHaveLength(1);
    expect(list[0].answerJson).toBe(JSON.stringify("B"));
  });
  it("简答无需 answer/options", async () => {
    const db = getDb(env.DB);
    const q = await createQuestion(db, { type: "short", stem: "简述惯性", difficulty: 3 });
    expect(q.answerJson).toBeNull();
  });
});
```

- [ ] **步骤 2：运行测试验证失败**（`npm test -- questions` → FAIL）

- [ ] **步骤 3：编写 `src/server/questions/validate.ts`**

```ts
import { appError } from "../../lib/http";

export type QuestionType = "single" | "multi" | "fill" | "short";
export type Option = { key: string; text: string };
export interface QuestionInput {
  type: QuestionType; stem: string;
  options?: Option[]; answer?: string | string[] | null;
  analysis?: string; knowledgeTags?: string[]; chapter?: string; difficulty?: number;
}

/** 校验并归一化为可入库的 JSON 字段；非法则抛 validation_error */
export function normalizeQuestion(input: QuestionInput) {
  const stem = (input.stem ?? "").trim();
  if (!stem) throw appError("validation_error", "题干不能为空");
  let optionsJson: string | null = null;
  let answerJson: string | null = null;

  if (input.type === "single" || input.type === "multi") {
    if (!input.options?.length) throw appError("validation_error", "选择题必须提供选项");
    optionsJson = JSON.stringify(input.options);
    const keys = new Set(input.options.map((o) => o.key));
    if (input.type === "single") {
      if (typeof input.answer !== "string" || !keys.has(input.answer))
        throw appError("validation_error", "单选答案必须是选项之一");
      answerJson = JSON.stringify(input.answer);
    } else {
      if (!Array.isArray(input.answer) || input.answer.length === 0 || input.answer.some((k) => !keys.has(k)))
        throw appError("validation_error", "多选答案必须是选项子集且非空");
      answerJson = JSON.stringify(input.answer);
    }
  } else if (input.type === "fill") {
    const arr = Array.isArray(input.answer) ? input.answer : [];
    if (arr.length === 0) throw appError("validation_error", "填空题必须提供至少一个可接受答案");
    answerJson = JSON.stringify(arr);
  } // short: options/answer 均为 null

  return {
    type: input.type, stem, optionsJson, answerJson,
    analysis: input.analysis?.trim() || null,
    knowledgeTagsJson: JSON.stringify(input.knowledgeTags ?? []),
    chapter: input.chapter?.trim() || null,
    difficulty: input.difficulty ?? 1,
  };
}
```

- [ ] **步骤 4：编写 `src/server/questions/service.ts`**

```ts
import { and, eq, like, desc } from "drizzle-orm";
import type { DB } from "../../db/client";
import { questions } from "../../db/schema";
import { appError } from "../../lib/http";
import { normalizeQuestion, type QuestionInput } from "./validate";

export async function createQuestion(db: DB, input: QuestionInput) {
  const row = normalizeQuestion(input);
  const [q] = await db.insert(questions).values(row).returning();
  return q;
}

export async function listQuestions(db: DB, filter: { chapter?: string; type?: string; tag?: string } = {}) {
  const conds = [];
  if (filter.chapter) conds.push(eq(questions.chapter, filter.chapter));
  if (filter.type) conds.push(eq(questions.type, filter.type as any));
  if (filter.tag) conds.push(like(questions.knowledgeTagsJson, `%${filter.tag}%`));
  return db.select().from(questions)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(questions.createdAt));
}

export async function updateQuestion(db: DB, id: number, input: QuestionInput) {
  const row = normalizeQuestion(input);
  const [q] = await db.update(questions).set(row).where(eq(questions.id, id)).returning();
  if (!q) throw appError("not_found", "题目不存在");
  return q;
}

export async function deleteQuestion(db: DB, id: number) {
  const [q] = await db.delete(questions).where(eq(questions.id, id)).returning();
  if (!q) throw appError("not_found", "题目不存在");
  return { id };
}
```

> 删题若已被作业引用，本轮策略：直接删（作业引用完整性由前端"选题时才快照分值"保证，且本轮不做级联校验）。若需拦截，后续轮次加引用计数。

- [ ] **步骤 5：编写路由**（`GET/POST /api/teacher/questions`，`PATCH/DELETE /api/teacher/questions/[id]`，均 `requireTeacher`；GET 读 `searchParams` 的 chapter/type/tag 过滤）

- [ ] **步骤 6：运行测试验证通过**（`npm test -- questions` → PASS）

- [ ] **步骤 7：Commit**

```bash
git add -A
git commit -m "feat: 题库CRUD API与按题型答案形状校验"
```

---

### 任务 9：作业 API（建作业 + 老师列表 + 学生列表/详情/开始）

**文件：**
- 创建：`src/server/assignments/service.ts`
- 创建：`app/api/teacher/assignments/route.ts`（POST 建、GET 列表）
- 创建：`app/api/student/assignments/route.ts`（我的作业列表）、`.../[id]/route.ts`（详情，不含答案）、`.../[id]/start/route.ts`
- 测试：`src/server/assignments/__tests__/assignments.test.ts`

- [ ] **步骤 1：编写失败的集成测试**

```ts
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { getDb } from "../../../db/client";
import { classes, students, questions } from "../../../db/schema";
import { createAssignment, listStudentAssignments, getStudentAssignmentDetail } from "../service";

async function seed() {
  const db = getDb(env.DB);
  const [c] = await db.insert(classes).values({ name: "1班" }).returning();
  const [s] = await db.insert(students).values({ classId: c.id, name: "甲" }).returning();
  const [q] = await db.insert(questions).values({ type: "single", stem: "Q", optionsJson: JSON.stringify([{key:"A",text:"1"}]), answerJson: JSON.stringify("A") }).returning();
  return { db, c, s, q };
}

describe("assignments", () => {
  it("建作业并分配班级 + 选题带分值", async () => {
    const { db, c, q } = await seed();
    const a = await createAssignment(db, { title: "作业一", dueAt: null, classIds: [c.id], questions: [{ questionId: q.id, orderNo: 1, score: 10 }] });
    expect(a.id).toBeGreaterThan(0);
  });
  it("学生只看到分配到本班的作业；详情不含答案", async () => {
    const { db, c, s, q } = await seed();
    await createAssignment(db, { title: "作业一", dueAt: null, classIds: [c.id], questions: [{ questionId: q.id, orderNo: 1, score: 10 }] });
    const list = await listStudentAssignments(db, s.id, c.id);
    expect(list).toHaveLength(1);
    const detail = await getStudentAssignmentDetail(db, list[0].id, s.id, c.id);
    expect((detail.questions[0] as any).answerJson).toBeUndefined(); // 不下发答案
  });
});
```

- [ ] **步骤 2：运行测试验证失败**（`npm test -- assignments` → FAIL）

- [ ] **步骤 3：编写 `src/server/assignments/service.ts`**

```ts
import { and, eq, inArray } from "drizzle-orm";
import type { DB } from "../../db/client";
import { assignments, assignmentClasses, assignmentQuestions, questions, submissions } from "../../db/schema";
import { appError } from "../../lib/http";

export interface CreateAssignmentInput {
  title: string; dueAt: number | null; classIds: number[];
  questions: { questionId: number; orderNo: number; score: number }[];
}

export async function createAssignment(db: DB, input: CreateAssignmentInput) {
  if (!input.title?.trim()) throw appError("validation_error", "作业标题不能为空");
  if (!input.classIds?.length) throw appError("validation_error", "请至少分配一个班级");
  if (!input.questions?.length) throw appError("validation_error", "作业至少包含一道题");
  const [a] = await db.insert(assignments).values({ title: input.title.trim(), dueAt: input.dueAt }).returning();
  await db.insert(assignmentClasses).values(input.classIds.map((classId) => ({ assignmentId: a.id, classId })));
  await db.insert(assignmentQuestions).values(input.questions.map((q) => ({ assignmentId: a.id, ...q })));
  return a;
}

export async function listTeacherAssignments(db: DB) {
  return db.select().from(assignments).orderBy(assignments.createdAt);
}

/** 学生：分配到本班的作业 + 本人提交状态 */
export async function listStudentAssignments(db: DB, studentId: number, classId: number) {
  const rows = await db.select({ id: assignments.id, title: assignments.title, dueAt: assignments.dueAt })
    .from(assignments)
    .innerJoin(assignmentClasses, eq(assignmentClasses.assignmentId, assignments.id))
    .where(eq(assignmentClasses.classId, classId));
  const subs = await db.select().from(submissions).where(eq(submissions.studentId, studentId));
  const byA = new Map(subs.map((s) => [s.assignmentId, s]));
  return rows.map((r) => ({ ...r, status: byA.get(r.id)?.status ?? "not_started" }));
}
```

`service.ts` 续：

```ts
/** 学生：作业详情。校验该作业确实分配给学生所在班级；题目不下发 answerJson */
export async function getStudentAssignmentDetail(db: DB, assignmentId: number, studentId: number, classId: number) {
  const assigned = await db.select().from(assignmentClasses)
    .where(and(eq(assignmentClasses.assignmentId, assignmentId), eq(assignmentClasses.classId, classId))).get();
  if (!assigned) throw appError("forbidden", "无权访问该作业");
  const a = await db.select().from(assignments).where(eq(assignments.id, assignmentId)).get();
  if (!a) throw appError("not_found", "作业不存在");
  const aqs = await db.select().from(assignmentQuestions)
    .where(eq(assignmentQuestions.assignmentId, assignmentId)).orderBy(assignmentQuestions.orderNo);
  const qIds = aqs.map((x) => x.questionId);
  const qs = qIds.length ? await db.select().from(questions).where(inArray(questions.id, qIds)) : [];
  const qMap = new Map(qs.map((q) => [q.id, q]));
  const questionsOut = aqs.map((aq) => {
    const q = qMap.get(aq.questionId)!;
    return {
      questionId: q.id, type: q.type, stem: q.stem,
      optionsJson: q.optionsJson, // 选项要发；答案/解析不发
      orderNo: aq.orderNo, score: aq.score,
    };
  });
  return { id: a.id, title: a.title, dueAt: a.dueAt, questions: questionsOut };
}

/** 学生开始作业：幂等创建 submission 并记 started_at */
export async function startAssignment(db: DB, assignmentId: number, studentId: number, classId: number) {
  await getStudentAssignmentDetail(db, assignmentId, studentId, classId); // 复用越权校验
  const existing = await db.select().from(submissions)
    .where(and(eq(submissions.assignmentId, assignmentId), eq(submissions.studentId, studentId))).get();
  if (existing) return existing;
  const now = Math.floor(Date.now() / 1000);
  const [s] = await db.insert(submissions)
    .values({ assignmentId, studentId, status: "not_started", startedAt: now }).returning();
  return s;
}
```

- [ ] **步骤 4：编写路由**（老师 POST/GET 走 `requireTeacher`；学生列表/详情/开始走 `requireStudent`，classId 从守卫返回的 studentId 再查库或从 token claims 取——路由里 `verifyToken` 后拿 `classId`）

> **classId 来源统一约定：** `requireStudent` 只返回 `studentId`（与任务 5 一致，勿改签名）。学生路由拿到 `studentId` 后，再 `db.select({ classId }).from(students).where(eq(students.id, studentId)).get()` 取 `classId` 传入 service。全项目学生路由都走这一步，勿从 token 直接取 classId（避免与库不一致）。

- [ ] **步骤 5：运行测试验证通过**（`npm test -- assignments` → PASS）

- [ ] **步骤 6：Commit**

```bash
git add -A
git commit -m "feat: 作业建立/老师列表/学生列表·详情·开始API(详情不下发答案+越权校验)"
```

---

### 任务 10：提交 + 判分 + 结果 API

**文件：**
- 创建：`src/server/submissions/service.ts`（复用任务 4 的 `gradeAnswer`）
- 创建：`app/api/student/assignments/[id]/submit/route.ts`、`.../[id]/result/route.ts`
- 测试：`src/server/submissions/__tests__/submit.test.ts`

- [ ] **步骤 1：编写失败的集成测试（提交→客观判分→结果）**

```ts
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { getDb } from "../../../db/client";
import { classes, students, questions, assignments, assignmentClasses, assignmentQuestions } from "../../../db/schema";
import { submitAssignment, getResult } from "../service";

async function seed() {
  const db = getDb(env.DB);
  const [c] = await db.insert(classes).values({ name: "1班" }).returning();
  const [s] = await db.insert(students).values({ classId: c.id, name: "甲" }).returning();
  const [q1] = await db.insert(questions).values({ type: "single", stem: "S", optionsJson: JSON.stringify([{key:"A",text:"1"},{key:"B",text:"2"}]), answerJson: JSON.stringify("B") }).returning();
  const [q2] = await db.insert(questions).values({ type: "short", stem: "简答" }).returning();
  const [a] = await db.insert(assignments).values({ title: "T" }).returning();
  await db.insert(assignmentClasses).values({ assignmentId: a.id, classId: c.id });
  await db.insert(assignmentQuestions).values([
    { assignmentId: a.id, questionId: q1.id, orderNo: 1, score: 10 },
    { assignmentId: a.id, questionId: q2.id, orderNo: 2, score: 10 },
  ]);
  return { db, c, s, a, q1, q2 };
}
```

测试续：

```ts
describe("submitAssignment", () => {
  it("含简答的作业提交后状态为 submitted，客观题判分正确", async () => {
    const { db, c, s, a, q1, q2 } = await seed();
    const r = await submitAssignment(db, a.id, s.id, c.id, {
      durationSec: 120,
      answers: [
        { questionId: q1.id, content: "B" },   // 单选正确 → 10
        { questionId: q2.id, content: "我的简答" }, // 简答不判
      ],
    });
    expect(r.objectiveScore).toBe(10);
    expect(r.status).toBe("submitted"); // 含未判简答
  });
  it("重复提交 → conflict", async () => {
    const { db, c, s, a, q1 } = await seed();
    await submitAssignment(db, a.id, s.id, c.id, { durationSec: 10, answers: [{ questionId: q1.id, content: "A" }] });
    await expect(submitAssignment(db, a.id, s.id, c.id, { durationSec: 10, answers: [{ questionId: q1.id, content: "A" }] }))
      .rejects.toMatchObject({ code: "conflict" });
  });
  it("纯客观作业提交即 graded；结果含对错与解析", async () => {
    const db = getDb(env.DB);
    const [c] = await db.insert(classes).values({ name: "2班" }).returning();
    const [s] = await db.insert(students).values({ classId: c.id, name: "乙" }).returning();
    const [q] = await db.insert(questions).values({ type: "single", stem: "S", optionsJson: JSON.stringify([{key:"A",text:"1"}]), answerJson: JSON.stringify("A"), analysis: "因为A" }).returning();
    const [a] = await db.insert(assignments).values({ title: "T2" }).returning();
    await db.insert(assignmentClasses).values({ assignmentId: a.id, classId: c.id });
    await db.insert(assignmentQuestions).values({ assignmentId: a.id, questionId: q.id, orderNo: 1, score: 10 });
    const r = await submitAssignment(db, a.id, s.id, c.id, { durationSec: 30, answers: [{ questionId: q.id, content: "A" }] });
    expect(r.status).toBe("graded");
    const res = await getResult(db, a.id, s.id);
    expect(res.answers[0].isCorrect).toBe(1);
    expect(res.answers[0].analysis).toBe("因为A");
  });
});
```

- [ ] **步骤 2：运行测试验证失败**（`npm test -- submit` → FAIL）

- [ ] **步骤 3：编写 `src/server/submissions/service.ts`**

```ts
import { and, eq, inArray } from "drizzle-orm";
import type { DB } from "../../db/client";
import { submissions, answers, assignmentQuestions, assignmentClasses, questions } from "../../db/schema";
import { gradeAnswer, type GradeInput } from "../../lib/grading/objective";
import { appError } from "../../lib/http";

interface SubmitInput { durationSec: number; answers: { questionId: number; content: string | string[] }[]; }

export async function submitAssignment(db: DB, assignmentId: number, studentId: number, classId: number, input: SubmitInput) {
  // 越权校验：作业必须分配给该学生所在班级（规格 §6.4）
  const assigned = await db.select().from(assignmentClasses)
    .where(and(eq(assignmentClasses.assignmentId, assignmentId), eq(assignmentClasses.classId, classId))).get();
  if (!assigned) throw appError("forbidden", "无权提交该作业");

  // 幂等/防重：已存在且已提交 → conflict
  const existing = await db.select().from(submissions)
    .where(and(eq(submissions.assignmentId, assignmentId), eq(submissions.studentId, studentId))).get();
  if (existing && existing.status !== "not_started") throw appError("conflict", "该作业已提交，不能重复提交");

  const aqs = await db.select().from(assignmentQuestions).where(eq(assignmentQuestions.assignmentId, assignmentId));
  if (aqs.length === 0) throw appError("not_found", "作业不存在或无题目");
  const qIds = aqs.map((x) => x.questionId);
  const qs = await db.select().from(questions).where(inArray(questions.id, qIds));
  const qMap = new Map(qs.map((q) => [q.id, q]));
  const scoreMap = new Map(aqs.map((x) => [x.questionId, x.score]));
  const answerMap = new Map(input.answers.map((a) => [a.questionId, a.content]));

  let objectiveScore = 0;
  let hasUngradedShort = false;
  const now = Math.floor(Date.now() / 1000);

  const subId = existing?.id ?? (await db.insert(submissions)
    .values({ assignmentId, studentId, status: "not_started", startedAt: now }).returning())[0].id;

  for (const aq of aqs) {
    const q = qMap.get(aq.questionId)!;
    const raw = answerMap.get(aq.questionId);
    const full = scoreMap.get(aq.questionId)!;
    const gi = toGradeInput(q, raw, full);
    const g = gradeAnswer(gi);
    if (q.type === "short") hasUngradedShort = true;
    else objectiveScore += g.score ?? 0;
    await db.insert(answers).values({
      submissionId: subId, questionId: q.id,
      contentJson: JSON.stringify(raw ?? null), isCorrect: g.isCorrect, score: g.score,
    });
  }

  const status = hasUngradedShort ? "submitted" : "graded";
  const [updated] = await db.update(submissions).set({
    status, submittedAt: now, durationSec: input.durationSec,
    objectiveScore, totalScore: objectiveScore, // 本轮总分=客观分
  }).where(eq(submissions.id, subId)).returning();
  return updated;
}
```

`service.ts` 续（`toGradeInput` 把库中题目 + 学生作答适配为判分入参，与任务 4 的 `GradeInput` 严格对齐）：

```ts
function toGradeInput(q: { type: string; answerJson: string | null }, raw: unknown, full: number): GradeInput {
  const answer = q.answerJson ? JSON.parse(q.answerJson) : null;
  switch (q.type) {
    case "single": return { type: "single", answer: String(answer ?? ""), content: String(raw ?? ""), full };
    case "multi":  return { type: "multi", answer: (answer as string[]) ?? [], content: Array.isArray(raw) ? raw as string[] : [], full };
    case "fill":   return { type: "fill", answer: (answer as string[]) ?? [], content: String(raw ?? ""), full };
    default:       return { type: "short", answer: null, content: String(raw ?? ""), full };
  }
}

/** 结果：客观对错 + 得分 + 解析；简答标记"待批改" */
export async function getResult(db: DB, assignmentId: number, studentId: number) {
  const sub = await db.select().from(submissions)
    .where(and(eq(submissions.assignmentId, assignmentId), eq(submissions.studentId, studentId))).get();
  if (!sub) throw appError("not_found", "尚未提交");
  const rows = await db.select().from(answers).where(eq(answers.submissionId, sub.id));
  const qIds = rows.map((r) => r.questionId);
  const qs = qIds.length ? await db.select().from(questions).where(inArray(questions.id, qIds)) : [];
  const qMap = new Map(qs.map((q) => [q.id, q]));
  return {
    status: sub.status, objectiveScore: sub.objectiveScore, totalScore: sub.totalScore, durationSec: sub.durationSec,
    answers: rows.map((r) => {
      const q = qMap.get(r.questionId)!;
      return {
        questionId: r.questionId, type: q.type, stem: q.stem,
        content: JSON.parse(r.contentJson), isCorrect: r.isCorrect, score: r.score,
        answer: q.answerJson ? JSON.parse(q.answerJson) : null, // 结果页可看标准答案
        analysis: q.analysis, pending: q.type === "short", // 简答待批改
      };
    }),
  };
}
```

- [ ] **步骤 4：编写路由**（`POST .../submit`、`GET .../result` 走 `requireStudent` + 取 classId；submit 校验作业分配给本班后调 service）

- [ ] **步骤 5：运行测试验证通过**（`npm test -- submit` → PASS，3 条）

- [ ] **步骤 6：Commit**

```bash
git add -A
git commit -m "feat: 作业提交与客观自动判分、结果查询API(简答待批改、防重复提交)"
```

---

### 任务 11：作业统计 API

**文件：**
- 创建：`src/server/stats/service.ts`
- 创建：`app/api/teacher/assignments/[id]/stats/route.ts`
- 测试：`src/server/stats/__tests__/stats.test.ts`

- [ ] **步骤 1：编写失败的集成测试**

```ts
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { getDb } from "../../../db/client";
import { classes, students, questions, assignments, assignmentClasses, assignmentQuestions, submissions, answers } from "../../../db/schema";
import { assignmentStats } from "../service";

describe("assignmentStats", () => {
  it("统计提交进度/平均用时/平均分/每题正确率", async () => {
    const db = getDb(env.DB);
    const [c] = await db.insert(classes).values({ name: "1班" }).returning();
    const [s1] = await db.insert(students).values({ classId: c.id, name: "甲" }).returning();
    const [s2] = await db.insert(students).values({ classId: c.id, name: "乙" }).returning();
    const [q] = await db.insert(questions).values({ type: "single", stem: "Q", optionsJson: "[]", answerJson: JSON.stringify("A") }).returning();
    const [a] = await db.insert(assignments).values({ title: "T" }).returning();
    await db.insert(assignmentClasses).values({ assignmentId: a.id, classId: c.id });
    await db.insert(assignmentQuestions).values({ assignmentId: a.id, questionId: q.id, orderNo: 1, score: 10 });
    // s1 提交且答对，s2 未提交
    const [sub] = await db.insert(submissions).values({ assignmentId: a.id, studentId: s1.id, status: "graded", submittedAt: 100, durationSec: 60, objectiveScore: 10, totalScore: 10 }).returning();
    await db.insert(answers).values({ submissionId: sub.id, questionId: q.id, contentJson: JSON.stringify("A"), isCorrect: 1, score: 10 });

    const st = await assignmentStats(db, a.id);
    expect(st.assigned).toBe(2);
    expect(st.submitted).toBe(1);
    expect(st.avgDurationSec).toBe(60);
    expect(st.avgTotalScore).toBe(10);
    expect(st.perQuestion[0].correctRate).toBeCloseTo(1); // 已提交里 1/1 答对
  });
});
```

- [ ] **步骤 2：运行测试验证失败**（`npm test -- stats` → FAIL）

- [ ] **步骤 3：编写 `src/server/stats/service.ts`**

```ts
import { eq, inArray } from "drizzle-orm";
import type { DB } from "../../db/client";
import { assignmentClasses, students, submissions, answers, assignmentQuestions } from "../../db/schema";

export async function assignmentStats(db: DB, assignmentId: number) {
  // 应交人数 = 分配班级的学生总数
  const cls = await db.select({ classId: assignmentClasses.classId }).from(assignmentClasses)
    .where(eq(assignmentClasses.assignmentId, assignmentId));
  const classIds = cls.map((x) => x.classId);
  const roster = classIds.length ? await db.select().from(students).where(inArray(students.classId, classIds)) : [];
  const assigned = roster.length;

  const subs = await db.select().from(submissions).where(eq(submissions.assignmentId, assignmentId));
  const done = subs.filter((s) => s.status !== "not_started");
  const submitted = done.length;
  const avgDurationSec = submitted ? Math.round(done.reduce((a, s) => a + (s.durationSec ?? 0), 0) / submitted) : 0;
  const avgTotalScore = submitted ? +(done.reduce((a, s) => a + (s.totalScore ?? 0), 0) / submitted).toFixed(2) : 0;

  // 每题正确率：在已提交答卷里，isCorrect=1 的占比（简答 isCorrect=NULL 不计入分母）
  const aqs = await db.select().from(assignmentQuestions).where(eq(assignmentQuestions.assignmentId, assignmentId));
  const subIds = done.map((s) => s.id);
  const ans = subIds.length ? await db.select().from(answers).where(inArray(answers.submissionId, subIds)) : [];
  const perQuestion = aqs.map((aq) => {
    const rows = ans.filter((a) => a.questionId === aq.questionId && a.isCorrect !== null);
    const correct = rows.filter((a) => a.isCorrect === 1).length;
    return { questionId: aq.questionId, orderNo: aq.orderNo, answered: rows.length, correctRate: rows.length ? correct / rows.length : 0 };
  }).sort((a, b) => a.orderNo - b.orderNo);

  return { assigned, submitted, progress: assigned ? submitted / assigned : 0, avgDurationSec, avgTotalScore, perQuestion };
}
```

- [ ] **步骤 4：编写路由**（`GET /api/teacher/assignments/[id]/stats` 走 `requireTeacher`）

- [ ] **步骤 5：运行测试验证通过**（`npm test -- stats` → PASS）

- [ ] **步骤 6：Commit**

```bash
git add -A
git commit -m "feat: 作业统计API(提交进度/平均用时/平均分/每题正确率)"
```

---

### 任务 12：前端地基（主题 + fetch 封装 + 布局 + 登录页）

> 前端任务不写单测；验收 = `npm run build` 通过 + 手测清单逐项勾选。

**文件：**
- 创建：`src/lib/client/fetcher.ts`（带 token、401/session_revoked 自动登出）
- 创建：`src/lib/client/auth.ts`（localStorage 存取 token 与角色）
- 创建：`src/components/theme-provider.tsx`（next-themes）、`src/components/ui/*`（button/input/card/toast 等 shadcn）
- 创建：`src/components/motion/fade-in.tsx`（受控动效，遵守 prefers-reduced-motion）
- 创建：`app/(auth)/login/page.tsx`（学生选班输名 / 老师输密码 切换）
- 修改：`app/layout.tsx`（挂 ThemeProvider + Toaster）

- [ ] **步骤 1：`src/lib/client/auth.ts`**

```ts
const KEY = "pw_auth";
export type Session = { token: string; role: "student" | "teacher"; student?: { id: number; name: string; classId: number } };
export function saveSession(s: Session) { localStorage.setItem(KEY, JSON.stringify(s)); }
export function getSession(): Session | null {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { return null; }
}
export function clearSession() { localStorage.removeItem(KEY); }
```

- [ ] **步骤 2：`src/lib/client/fetcher.ts`**

```ts
import { getSession, clearSession } from "./auth";

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const s = getSession();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (s?.token) headers.set("Authorization", `Bearer ${s.token}`);
  const res = await fetch(path, { ...init, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = json?.error?.code;
    if (res.status === 401 || code === "session_revoked") {
      clearSession();
      if (typeof window !== "undefined") window.location.href = "/login";
    }
    throw new Error(json?.error?.message ?? "请求失败");
  }
  return json.data as T;
}
```

- [ ] **步骤 3：主题与动效封装**

`src/components/theme-provider.tsx`：包 `next-themes` 的 `ThemeProvider`（`attribute="class" defaultTheme="system" enableSystem`）。
`src/components/motion/fade-in.tsx`：

```tsx
"use client";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export function FadeIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}>
      {children}
    </motion.div>
  );
}
```

- [ ] **步骤 4：shadcn 基础组件 + 全局布局**

用 `npx shadcn@latest init` + `add button input card label select sonner`（或手写等价组件）。`app/layout.tsx` 包 `ThemeProvider` 与 `<Toaster />`，`<body className="min-h-dvh bg-[#F5F5F5] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">`。

- [ ] **步骤 5：登录页 `app/(auth)/login/page.tsx`（客户端组件）**

- 顶部两个 Tab：学生 / 老师。
- 学生：`GET /api/classes` 填充班级下拉 → 选班 + 输名 → `POST /api/auth/student/login` → 存 session → 跳 `/student`。错误（404/409/403）以 toast 中文提示。
- 老师：输密码 → `POST /api/auth/teacher/login` → 存 session → 跳 `/teacher`。
- 进入页面时若已有有效 session，按角色自动跳转。
- Bento 风格卡片容器（rounded-xl、微阴影），入场用 `<FadeIn>`。

- [ ] **步骤 6：`npm run build` 通过**

- [ ] **手测清单：**
  - [ ] 亮/暗主题切换正常、跟随系统。
  - [ ] 学生登录成功跳转、刷新后自动进入。
  - [ ] 学生同名（409）/ 不存在（404）toast 文案正确。
  - [ ] 老师密码错误 toast，正确则进入后台。
  - [ ] `prefers-reduced-motion` 开启时动画关闭。
  - [ ] 手机窄屏下登录卡片单列可用。

- [ ] **步骤 7：Commit**

```bash
git add -A
git commit -m "feat: 前端地基(主题/受控动效/带token的fetch封装/登录页)"
```

---

### 任务 13：学生端页面（作业列表 / 计时答题 / 结果）

**文件：**
- 创建：`app/(student)/student/layout.tsx`（守卫：无 student session 跳登录）
- 创建：`app/(student)/student/page.tsx`（作业列表）
- 创建：`app/(student)/student/assignments/[id]/page.tsx`（答题页 + 计时器）
- 创建：`app/(student)/student/assignments/[id]/result/page.tsx`（结果页）
- 创建：`src/components/timer.tsx`（localStorage 暂存开始时间，切后台/刷新不丢）

- [ ] **步骤 1：作业列表页**

- `GET /api/student/assignments` → 卡片网格（Bento）；每卡显示标题、截止时间、状态标签（未开始/已提交/已批改）。
- 点未提交作业 → 进答题页；已提交 → 进结果页。

- [ ] **步骤 2：计时器组件 `src/components/timer.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";

export function useTimer(assignmentId: number) {
  const key = `pw_timer_${assignmentId}`;
  const [start] = useState(() => {
    const saved = localStorage.getItem(key);
    if (saved) return Number(saved);
    const now = Date.now(); localStorage.setItem(key, String(now)); return now;
  });
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, [start]);
  const clear = () => localStorage.removeItem(key);
  return { elapsed, clear };
}
```

- [ ] **步骤 3：答题页**

- 进入即 `POST .../start`（幂等）。
- `GET .../[id]` 渲染题目：单选=radio、多选=checkbox、填空=input、简答=textarea。计时器常驻顶部。
- 提交：收集 answers + `durationSec=elapsed` → `POST .../submit` → 成功后 `clear()` 计时器 → 跳结果页。
- 单列大按钮，移动优先。

- [ ] **步骤 4：结果页**

- `GET .../result`：逐题显示学生作答、对错（✓#22C55E / ✗#EF4444）、得分、标准答案、解析；简答显示"待老师批改"。
- 顶部汇总：客观得分 / 总分 / 用时。

- [ ] **步骤 5：`npm run build` 通过**

- [ ] **手测清单：**
  - [ ] 未登录访问 `/student` 跳转登录。
  - [ ] 作业列表状态标签正确。
  - [ ] 答题计时器每秒 +1；切后台再回来、刷新页面时间不清零。
  - [ ] 四种题型作答与提交正常。
  - [ ] 客观题结果对错/解析显示正确；简答显示待批改。
  - [ ] 重复提交被拦（后端 conflict，前端 toast）。
  - [ ] 手机窄屏单列大按钮可用。

- [ ] **步骤 6：Commit**

```bash
git add -A
git commit -m "feat: 学生端作业列表/计时答题/结果页(计时器localStorage持久)"
```

---

### 任务 14：老师端页面（名单 / 题库 / 作业 / 统计 / 登录记录）

**文件：**
- 创建：`app/(teacher)/teacher/layout.tsx`（守卫 + 侧边导航）
- 创建：`app/(teacher)/teacher/page.tsx`（仪表板概览，Bento）
- 创建：`.../teacher/roster/page.tsx`（班级+名单+导入+改名/停用/登录记录/清除登录态）
- 创建：`.../teacher/questions/page.tsx`（题库列表+建/改/删表单，按题型动态字段）
- 创建：`.../teacher/assignments/page.tsx`（作业列表+建作业向导：选题/分配班级/截止时间）
- 创建：`.../teacher/assignments/[id]/stats/page.tsx`（统计可视化）

- [ ] **步骤 1：布局与守卫**

`teacher/layout.tsx`：无 teacher session 跳登录；桌面左侧导航（名单/题库/作业），手机顶部抽屉。主题切换按钮常驻。

- [ ] **步骤 2：名单页**

- 班级列表（含人数）；建班。
- 选班看学生表；批量导入（多行文本框，每行一个姓名 → `POST .../import`，展示 `{inserted, duplicates}` 报告）。
- 每个学生行：改名 / 加 dedupLabel（展示"张三(1)"）/ 停用启用 / 查看登录记录（弹层列 login_logs）/ 清除登录态。

- [ ] **步骤 3：题库页**

- 列表（可按章节/题型/知识点过滤）。
- 建/改题表单：选题型 → 动态字段。单选/多选：选项编辑器（key+text）+ 选答案；填空：多个可接受答案；简答：仅题干。公共字段：知识点标签（多选/自由输入）、章节、难度 1–5、解析。
- 提交前端做基础校验，后端 `normalizeQuestion` 兜底。删题二次确认。

- [ ] **步骤 4：作业页 + 建作业向导**

- 列表显示作业标题、截止时间、班级；每行入口到统计。
- 建作业：填标题/截止时间 → 从题库多选题目并逐题设分值/顺序 → 勾选分配班级 → `POST /api/teacher/assignments`。

- [ ] **步骤 5：统计页**

- `GET .../stats`：概览卡（应交/已交/提交率/平均用时/平均分）；每题正确率条形（用 Bento 卡承载，动效克制）。

- [ ] **步骤 6：`npm run build` 通过**

- [ ] **手测清单：**
  - [ ] 未登录访问 `/teacher` 跳转登录。
  - [ ] 建班、导入名单（含重复报告）、改名/加标签/停用、登录记录、清除登录态后该生旧 token 失效（回登录页）。
  - [ ] 四种题型建题/改题/删题正常，非法答案被拦。
  - [ ] 建作业选题设分值分配班级成功；学生端立即可见。
  - [ ] 统计数值与手工核对一致。
  - [ ] 桌面多列、手机降为单列均可用；暗色正常。

- [ ] **步骤 7：Commit**

```bash
git add -A
git commit -m "feat: 老师后台(名单/题库/作业向导/统计/登录记录管理)"
```

---

### 任务 15：README + 部署文档 + 端到端联调

**文件：**
- 创建/补全：`README.md`
- 修改：`wrangler.jsonc`（回填真实 `database_id`）

- [ ] **步骤 1：全量测试回归**

运行：`npm test`
预期：token / objective / guards / schema / login / roster / questions / assignments / submit / stats 全部 PASS。粘贴输出为证。

- [ ] **步骤 2：本地端到端手测（真实 D1 local）**

```bash
npx wrangler d1 create physics_workbench   # 首次；回填 database_id 到 wrangler.jsonc
npm run db:migrate:local
npm run dev
```

手测闭环：老师登录 → 建班 → 导名单 → 建题（含四题型）→ 建作业分配班级 → 退出；学生选班登录 → 计时答题 → 提交 → 看客观判分与解析；老师看统计。逐项对照 §16 交付定义。

- [ ] **步骤 3：编写 `README.md`**

覆盖：
- 项目简介与本轮范围（切片A）。
- 本地运行：`npm i` → 建 `.dev.vars`（`ADMIN_PASSWORD`/`AUTH_SECRET`）→ `wrangler d1 create` + `db:migrate:local` → `npm run dev`。
- 环境变量说明：`.dev.vars`（本地）与 `wrangler secret put ADMIN_PASSWORD` / `AUTH_SECRET`（线上），**强调绝不硬编码、不进日志**。
- D1 迁移：`db:generate` → `db:migrate:local` / `db:migrate:remote`。
- R2：`wrangler r2 bucket create physics-workbench-uploads`（本轮仅预留绑定，不写入）。
- 部署：`npm run cf:build` → `npm run cf:deploy`（首次 + 后续）。
- **安全声明（照搬规格 §6.5）**：刻意的低安全方案，仅班级内部使用；单一管理员密码 ⇒ 老师看全部 3 班，"每位老师只看自己班"需后续真正老师账号；学生姓名等隐私按角色最小暴露。

- [ ] **步骤 4：Commit**

```bash
git add -A
git commit -m "docs: 补全README(运行/环境变量/D1迁移/R2/部署/安全声明)并回填D1配置"
```

## 完成标准（对照规格 §16）

1. 本地 `dev` 可运行，本地 D1 迁移可用。
2. 全部单测 + 集成测试通过（输出为证）。
3. 端到端手测闭环打通（老师建班→名单→题→作业；学生登录答题提交看判分；老师看统计）。
4. README 完整（运行 / env / 迁移 / 部署 / 安全声明）。
5. 深色模式与手机/桌面显示适配正常。
