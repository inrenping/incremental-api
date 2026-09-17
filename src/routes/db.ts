import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { getDb } from '../db/client'

export const db = new Hono()

db.get('/db', async (c) => {
  const startedAt = Date.now()
  try {
    const rows = await getDb().execute(sql`select 1 as ping`)
    const row = rows[0] as { ping: number } | undefined
    return c.json({
      ok: true,
      ping: row?.ping ?? null,
      latencyMs: Date.now() - startedAt,
    })
  } catch (error) {
    return c.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        latencyMs: Date.now() - startedAt,
      },
      500,
    )
  }
})
