import { Hono } from 'hono'
import { db } from './routes/db'
import { root } from './routes/root'

const app = new Hono()

app.route('/', root)
app.route('/api', db)

// Vercel 的 Hono 约定：入口文件默认导出 app，每个路由自动成为 Vercel Function
export default app
