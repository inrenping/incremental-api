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

若要挂到主域名下，见下文「前端反代」。

## 前端反代（同源调用）

部署后本服务有自己的域名（如 `https://incremental-api.vercel.app`）。浏览器从前端域名直接请求它属于**跨域**（子域名也算不同源），需要在「配 CORS」和「加反代」之间二选一。推荐**反代**：前端把某个路径前缀服务端转发到本服务，浏览器看到的是同源请求，不需要任何 CORS 配置。

### 先确认前缀没被占用

反代按路径前缀匹配，写之前先确认前缀没被别的服务用掉：

| 项目 | 已占用的前缀 |
| --- | --- |
| `incremental`（主站，见其 `vercel.json`） | `/api/*` |
| `incremental-dashboard`（见其 `next.config.ts`） | `/api/v1/*` |

所以本服务要另选一个独立前缀，例如 `/svc/*`（前缀名随意，不与上表冲突即可）。

### 方式一：vercel.json（任意项目通用）

在前端项目根目录的 `vercel.json` 中加：

```json
{
  "rewrites": [
    {
      "source": "/svc/:path*",
      "destination": "https://incremental-api.vercel.app/api/:path*"
    }
  ]
}
```

`source` 与 `destination` 的路径不必相同，上例把 `incremental.icu/svc/db` 映射到本服务的 `/api/db`。

### 方式二：next.config.ts（Next.js 项目）

Next.js 项目的 rewrites 可以读环境变量，方便开发/生产指向不同后端：

```ts
async rewrites() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return [];
  return [
    {
      source: "/svc/:path*",
      destination: `${apiUrl}/api/:path*`,
    },
  ];
}
```

配 `NEXT_PUBLIC_API_URL=https://incremental-api.vercel.app`；本地开发时改成 `http://localhost:8787` 即可。

### 同时存在时的优先级

若一个项目既有 `vercel.json` 又有 `next.config.ts` 的 rewrites，Vercel 先应用 `vercel.json`，命中后不再进入 Next.js 的 rewrites。同一个前缀不要在两边重复定义。

### 验证

```bash
curl https://incremental.icu/svc/db
# {"ok":true,"ping":1,"latencyMs":...}
```

### 注意

- 反代是**服务端转发**，浏览器地址栏不变。所以前端代码里写同源相对路径即可（`fetch('/svc/db')`），不要写完整域名。
- **确认 API 项目的 Deployment Protection 没有挡住该域名**：若开了 Vercel Authentication，反代请求会被拦下返回登录页。生产域名默认关闭，预览域名默认开启。
- 如果确实不想用反代，就得改走子域名（如 `api.incremental.icu`），并在 `src/app.ts` 里挂上 Hono 的 `cors()` 中间件，同时把前端域名加进 `origin` 白名单。

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
