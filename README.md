# 八年级物理 AI 教学练习工作台

面向八年级物理教学的在线练习与作业平台。老师建班、导入名单、维护题库、布置作业并查看统计；学生选班登录、计时答题、提交后即时看到客观题判分与解析。

> **本轮范围（地基 + 切片 A）**：完整的"建班 → 名单 → 题库 → 作业 → 学生答题提交 → 客观自动判分 → 统计"闭环，不含任何外部依赖（无 AI 出题/批改、无文件上传）。简答题本轮只作答存储、不判分（标记"待老师批改"）。

## 技术栈

- **Next.js 15**（App Router）+ TypeScript + Tailwind CSS v3
- **Cloudflare Workers**（`@opennextjs/cloudflare`，Node 运行时靠 `nodejs_compat`）
- **D1**（SQLite）+ **Drizzle ORM** + drizzle-kit 迁移
- **R2**（本轮仅预留绑定，不写入）
- `jose` HS256 无状态 JWT（存 localStorage；靠 `login_version` 支持"清除登录态"）
- Vitest + `@cloudflare/vitest-pool-workers`（对本地真实 D1 跑集成测试）
- next-themes（明暗主题）+ framer-motion（受控动效）+ sonner（提示）

## 本地运行

```bash
# 1. 安装依赖（项目已配 .npmrc 走 npmmirror 镜像）
npm install

# 2. 准备本地密钥（见下方"环境变量"）：创建 .dev.vars
#    .dev.vars 已被 .gitignore 忽略，切勿提交
#    ADMIN_PASSWORD=你的老师后台密码
#    AUTH_SECRET=至少32字符的随机串

# 3. 生成 Cloudflare 运行时/绑定类型（cloudflare-env.d.ts，已 gitignore）
#    首次克隆后、以及每次改动 wrangler.jsonc 后都要重跑
npm run cf-typegen

# 4. 创建本地 D1 并应用迁移
npx wrangler d1 create physics_workbench   # 首次：把打印出的 database_id 回填到 wrangler.jsonc
npm run db:migrate:local

# 5. 启动开发服务器
npm run dev
```

打开 http://localhost:3000 —— 首页会重定向到 `/login`。老师用 `ADMIN_PASSWORD` 登录，学生选班输名登录。

## 环境变量

| 变量 | 用途 | 本地 | 线上 |
| --- | --- | --- | --- |
| `ADMIN_PASSWORD` | 老师后台登录密码（本轮单一管理员） | `.dev.vars` | `wrangler secret put ADMIN_PASSWORD` |
| `AUTH_SECRET` | JWT 签名密钥，至少 32 字符 | `.dev.vars` | `wrangler secret put AUTH_SECRET` |
| `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` / `AI_API_STYLE` | ②③ 轮 AI 网关（简答批改 / 学习助手）；默认 Anthropic Messages 兼容 | `.dev.vars` | `wrangler secret put AI_API_KEY`（URL/MODEL 可入 vars 或 secret） |
| `OCR_PROVIDER` / `OCR_SECRET_ID` / `OCR_SECRET_KEY` / `OCR_REGION` | ⑤ 轮图片 OCR 切题（腾讯云）；未配置则导入功能提示未开通 | `.dev.vars` | `wrangler secret put OCR_SECRET_ID` 等 |

> ②~⑥ 轮（AI 批改 / AI 助手 / 错题本+拍照 / OCR 导入 / 公告+CSV）的实现说明与逐项测试清单见
> [`docs/superpowers/ROUNDS-2-7-HANDOFF.md`](docs/superpowers/ROUNDS-2-7-HANDOFF.md)。这些密钥仅经环境注入，绝不硬编码/入库/入日志。

> **安全红线**：这两个值**绝不硬编码进代码、绝不提交进仓库、绝不写入任何日志**。`.dev.vars`、`.env*` 已在 `.gitignore` 中。服务端错误处理只记录错误摘要，不打印密钥或请求载荷；老师密码在登录接口内用常量时间比较，也不入日志。

`.env.example` 仅列出需要配置的键名（空值），供参考。

## D1 数据迁移

```bash
npm run db:generate        # 改动 src/db/schema.ts 后，用 drizzle-kit 生成新迁移
npm run db:migrate:local   # 应用到本地 D1（.wrangler 下）
npm run db:migrate:remote  # 应用到线上 D1
```

迁移文件在 `drizzle/`，`wrangler.jsonc` 的 `migrations_dir` 指向它。集成测试通过 `test/apply-migrations.ts` 在每个测试的隔离 D1 上自动应用同一批迁移。

## R2

本轮仅预留绑定 `BUCKET`，不实际读写。需要时创建存储桶：

```bash
npx wrangler r2 bucket create physics-workbench-uploads
```

## 测试

```bash
npm test          # 一次性跑全部单测 + 集成测试
npm run test:watch
```

集成测试用 `@cloudflare/vitest-pool-workers` 在本地真实 D1 上运行（无需联网）。当前覆盖：JWT 往返、客观题判分全分支、权限守卫、schema、登录、名单、题库、作业、提交判分、统计。

## 部署到 Cloudflare Workers

```bash
# 首次：确保已 wrangler login、已回填 wrangler.jsonc 的 database_id、
#       已 db:migrate:remote、已用 wrangler secret put 设置两个密钥
npm run cf:build     # opennextjs-cloudflare build
npm run cf:deploy    # opennextjs-cloudflare deploy
npm run cf:preview   # 本地预览生产构建
```

> 路由一律运行在 Node 运行时（靠 `nodejs_compat`），**不要**在任何 route handler 写 `export const runtime = "edge"`（那是已弃用的 next-on-pages 写法）。

## 安全声明（照搬规格 §6.5）

本项目是**刻意选择的低安全方案**，仅供班级内部使用：

- **单一管理员密码**：所有老师共用一个 `ADMIN_PASSWORD`，因此登录后可看到全部班级的数据。"每位老师只看自己班级"需要后续引入真正的老师账号体系。
- **学生凭姓名登录**：无学生密码，靠"班级 + 姓名"匹配；同班同名用区分标签（如「张三(1)」）处理。这是便利与安全的折衷。
- **隐私最小暴露**：学生姓名、登录记录等属隐私数据，接口按角色最小下发——学生端只返回本人数据，作业详情不下发标准答案；登录 IP/UA 仅老师后台可见。
- **登录态可清除**：老师"清除登录态"会自增该生 `login_version`，使其已签发的 JWT 立即失效，需重新登录。

如需提升到面向公网的安全等级，应在后续轮次加入：真实老师账号与鉴权、学生凭证、更严格的速率限制与审计。

