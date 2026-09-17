import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

type Sql = ReturnType<typeof postgres>

let sql: Sql | undefined

function connectionString(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not set')
  }
  return url
}

export function getDb() {
  if (!sql) {
    sql = postgres(connectionString(), {
      // Supabase Supavisor 事务模式（6543 端口）不支持 prepared statements
      prepare: false,
      // serverless 实例内单连接即可，避免打满数据库连接数
      max: 1,
      ssl: 'require',
    })
  }
  return drizzle(sql)
}
