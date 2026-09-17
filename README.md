# incremental-api

Incremental.icu 的 serverless API，基于 Hono + Vercel Functions + Drizzle ORM，数据库为 Supabase Postgres。

## 项目结构

```
src/
  app.ts          # 入口：Hono 实例并 export default（Vercel 靠这个文件识别 Hono 项目）
  db/client.ts    # postgres.js + drizzle 初始化
  db/schema.ts    # t_users 表定义（public schema）
  routes/root.ts  # GET /
  routes/db.ts    # GET /api/db
```

## 本地运行

```bash
pnpm install
cp .env.example .env         # 填入真实 DATABASE_URL
pnpm serve                   # vercel dev --listen 8787
```

首次运行 `pnpm serve` 会要求 `vercel login` 并选择一个 Vercel 项目，按提示完成。

验证：

```bash
curl http://localhost:8787/
curl http://localhost:8787/api/db
```

## 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/` | 返回 `{ "message": "hello world" }` |
| GET | `/api/db` | `SELECT 1` 数据库探针，返回连通性与耗时 |

## 部署

1. `vercel link` 关联或新建 Vercel 项目
2. 在 Vercel 项目设置里添加环境变量 `DATABASE_URL`（Production / Preview / Development）
3. `vercel --prod` 部署

若要挂到主域名下，在 `incremental.icu` 前端项目里加 rewrite 转发 `/api/*` 到本服务，这样浏览器视角同源，无需配置 CORS。

## 注意事项

- **入口必须是 `src/app.ts` 且 `export default app`**。Vercel 通过 `hono` 依赖自动识别为 Hono 项目，并在这个位置找入口；用 `api/` 目录 + `hono/vercel` 的 `handle` 是 Edge runtime 的写法，在 Node.js runtime 下签名不匹配，请求会一直挂起直到超时。
- **本地环境变量写在 `.env`，不要写 `.env.local`**。`vercel dev` 只读取 `.env`；`.env.local` 由 Vercel CLI 自己管理，用来存放 `VERCEL_OIDC_TOKEN`。
- **npm 脚本不要叫 `dev`**。`vercel dev` 会把 package.json 的 `dev` 脚本当作开发命令执行，导致递归调用自身而报错，所以这里用 `serve`。
- **不要使用 Edge runtime**：`postgres` 驱动依赖 Node 原生 socket。Vercel 的 Hono 预设默认跑 Node.js runtime（Fluid compute），无需额外配置。
- **必须设置 `prepare: false`**：Supabase Supavisor 事务模式（6543 端口）不支持 prepared statements。
- **连接数控制在 `max: 1`**：serverless 实例多，直连会打满数据库连接数。
- `DATABASE_URL` 只在请求处理函数内读取，避免构建阶段因缺少环境变量而失败。

## 数据库

`src/db/schema.ts` 中的 `t_users` 定义与后端 ORM（`incremental-mcp/app/models/user.py`）保持一致，位于 `public` schema。
