import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db'
import { mapReceipt } from '../lib/mapReceipt'

const DashboardQuery = z.object({
  month: z.coerce.number().int().min(1, 'month must be 1–12').max(12, 'month must be 1–12'),
  year:  z.coerce.number().int().min(2000, 'invalid year').max(2100, 'invalid year'),
})

const dashboardRoute = async (app: FastifyInstance) => {

  // ─── GET /api/dashboard?month=&year= ────────────────────────────────────────
  app.get('/dashboard', async (request, reply) => {
    const { neonUser } = request
    if (!neonUser) return reply.status(401).send({ error: 'Unauthorized' })

    const parsed = DashboardQuery.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues.map(i => i.message).join('; ') })
    }

    const { month, year } = parsed.data
    const userId          = neonUser.id

    const lastMonth = month === 1 ? 12 : month - 1
    const lastYear  = month === 1 ? year - 1 : year

    const [thisMonthRow, lastMonthRow, overallRow, categoriesRows, recentRows] = await Promise.all([
      db.query(
        `SELECT COALESCE(SUM(total_amount), 0) AS total, COUNT(*) AS count
         FROM receipts
         WHERE user_id = $1
           AND EXTRACT(MONTH FROM receipt_date) = $2
           AND EXTRACT(YEAR  FROM receipt_date) = $3`,
        [userId, month, year]
      ),
      db.query(
        `SELECT COALESCE(SUM(total_amount), 0) AS total
         FROM receipts
         WHERE user_id = $1
           AND EXTRACT(MONTH FROM receipt_date) = $2
           AND EXTRACT(YEAR  FROM receipt_date) = $3`,
        [userId, lastMonth, lastYear]
      ),
      db.query(
        `SELECT COALESCE(SUM(total_amount), 0) AS total FROM receipts WHERE user_id = $1`,
        [userId]
      ),
      db.query(
        `SELECT
           category,
           (array_agg(emoji ORDER BY created_at DESC) FILTER (WHERE emoji IS NOT NULL))[1] AS emoji,
           COALESCE(SUM(total_amount), 0) AS total
         FROM receipts
         WHERE user_id = $1
           AND EXTRACT(MONTH FROM receipt_date) = $2
           AND EXTRACT(YEAR  FROM receipt_date) = $3
           AND category IS NOT NULL
         GROUP BY category
         ORDER BY total DESC
         LIMIT 6`,
        [userId, month, year]
      ),
      db.query(
        `SELECT * FROM receipts WHERE user_id = $1 ORDER BY receipt_date DESC, created_at DESC LIMIT 5`,
        [userId]
      ),
    ])

    const thisMonthTotal = Number(thisMonthRow.rows[0].total)
    const lastMonthTotal = Number(lastMonthRow.rows[0].total)
    const thisMonthCount = Number(thisMonthRow.rows[0].count)
    const overallTotal   = Number(overallRow.rows[0].total)

    let trendPercent    = 0
    let trendDirection: 'up' | 'down' | 'same' = 'same'

    if (lastMonthTotal > 0) {
      trendPercent   = Math.abs(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)
      trendDirection = thisMonthTotal > lastMonthTotal ? 'up' : thisMonthTotal < lastMonthTotal ? 'down' : 'same'
    } else if (thisMonthTotal > 0) {
      trendPercent   = 100
      trendDirection = 'up'
    }

    const categorySum = categoriesRows.rows.reduce((s: number, r: Record<string, unknown>) => s + Number(r.total), 0) || 1

    return {
      thisMonthTotal,
      lastMonthTotal,
      trendPercent:   Math.round(trendPercent * 10) / 10,
      trendDirection,
      overallTotal,
      thisMonthCount,
      categories: categoriesRows.rows.map((r: Record<string, unknown>) => ({
        name:    r.category,
        emoji:   r.emoji ?? null,
        total:   Number(r.total),
        percent: Math.round((Number(r.total) / categorySum) * 1000) / 10,
      })),
      recentReceipts: recentRows.rows.map(mapReceipt),
    }
  })
}

export default dashboardRoute
