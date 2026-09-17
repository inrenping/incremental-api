import { bigint, boolean, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core'

// 与后端 ORM 定义保持一致：incremental-mcp/app/models/user.py
export const tUsers = pgTable('t_users', {
  id: bigint('id', { mode: 'number' }).primaryKey(),
  userName: varchar('user_name', { length: 255 }).unique(),
  userEmail: varchar('user_email', { length: 255 }).unique(),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  active: boolean('active').default(false),
  vip: boolean('vip').default(false),
  timezone: varchar('timezone').default('Asia/Shanghai'),
})
