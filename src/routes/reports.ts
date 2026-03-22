import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db'

const ViewQuery = z.object({
  view:  z.enum(['month', 'year', 'all']),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year:  z.coerce.number().int().min(2000).max(2100).optional(),
})

const TrendQuery = z.object({
  year: z.coerce.number().int().min(2000, 'year is required').max(2100),
})

function buildViewWhere(view: string, month: number, year: number, startIdx: number) {
  if (view === 'month') {
    return {
      clause: `AND EXTRACT(MONTH FROM receipt_date) = $${startIdx} AND EXTRACT(YEAR FROM receipt_date) = $${startIdx + 1}`,
      params: [month, year],
    }
  }
  if (view === 'year') {
    return {
      clause: `AND EXTRACT(YEAR FROM receipt_date) = $${startIdx}`,
      params: [year],
    }
  }
  return { clause: '', params: [] }
}

const reportsRoute = async (app: FastifyInstance) => {

  // ─── GET /api/reports/summary ────────────────────────────────────────────────
  app.get('/reports/summary', async (request, reply) => {
    const { neonUser } = request
    if (!neonUser) return reply.status(401).send({ error: 'Unauthorized' })

    const parsed = ViewQuery.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues.map(i => i.message).join('; ') })
    }

    const { view, month = 0, year = 0 } = parsed.data

    if (view === 'month' && (!month || !year)) {
      return reply.status(400).send({ error: 'month and year are required when view=month' })
    }
    if (view === 'year' && !year) {
      return reply.status(400).send({ error: 'year is required when view=year' })
    }

    const { clause, params } = buildViewWhere(view, month, year, 2)
    const userId = neonUser.id

    const [summaryRow, categoriesRows] = await Promise.all([
      db.query(
        `SELECT
           COALESCE(SUM(total_amount), 0)                                      AS total_spent,
           COALESCE(SUM(total_amount) FILTER (WHERE is_business = TRUE), 0)    AS business_total,
           COALESCE(SUM(total_amount) FILTER (WHERE is_business = FALSE), 0)   AS personal_total,
           COUNT(*)                                                             AS receipt_count,
           COALESCE(AVG(total_amount), 0)                                      AS avg_per_receipt,
           COALESCE(SUM(total_amount) FILTER (WHERE is_billable = TRUE), 0)    AS billable_amount,
           COUNT(*) FILTER (WHERE is_billable = TRUE)                          AS billable_count
         FROM receipts
         WHERE user_id = $1 ${clause}`,
        [userId, ...params]
      ),
      db.query(
        `SELECT
           category,
           (array_agg(emoji ORDER BY created_at DESC) FILTER (WHERE emoji IS NOT NULL))[1] AS emoji,
           COALESCE(SUM(total_amount), 0) AS total,
           COUNT(*)                        AS count
         FROM receipts
         WHERE user_id = $1 ${clause} AND category IS NOT NULL
         GROUP BY category
         ORDER BY total DESC`,
        [userId, ...params]
      ),
    ])

    const r          = summaryRow.rows[0]
    const totalSpent = Number(r.total_spent)

    return {
      totalSpent,
      businessTotal:    Number(r.business_total),
      personalTotal:    Number(r.personal_total),
      receiptCount:     Number(r.receipt_count),
      avgPerReceipt:    Math.round(Number(r.avg_per_receipt) * 100) / 100,
      deductibleAmount: Number(r.business_total),
      billableCount:    Number(r.billable_count),
      billableAmount:   Number(r.billable_amount),
      categories: categoriesRows.rows.map((cat: Record<string, unknown>) => ({
        name:    cat.category,
        emoji:   cat.emoji ?? null,
        total:   Number(cat.total),
        percent: totalSpent > 0 ? Math.round((Number(cat.total) / totalSpent) * 1000) / 10 : 0,
        count:   Number(cat.count),
      })),
    }
  })

  // ─── GET /api/reports/monthly-trend ─────────────────────────────────────────
  app.get('/reports/monthly-trend', async (request, reply) => {
    const { neonUser } = request
    if (!neonUser) return reply.status(401).send({ error: 'Unauthorized' })

    const parsed = TrendQuery.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues.map(i => i.message).join('; ') })
    }

    const { year } = parsed.data

    const { rows } = await db.query(
      `SELECT
         EXTRACT(MONTH FROM receipt_date)::int AS month,
         COALESCE(SUM(total_amount), 0)        AS total
       FROM receipts
       WHERE user_id = $1 AND EXTRACT(YEAR FROM receipt_date) = $2
       GROUP BY month`,
      [neonUser.id, year]
    )

    const totalsMap = new Map<number, number>()
    for (const row of rows) totalsMap.set(Number(row.month), Number(row.total))

    const LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const months = LABELS.map((label, i) => ({
      label,
      month: i + 1,
      year,
      total: totalsMap.get(i + 1) ?? 0,
    }))

    return { months }
  })

  // ─── GET /api/reports/gst ────────────────────────────────────────────────────
  app.get('/reports/gst', async (request, reply) => {
    const { neonUser } = request
    if (!neonUser) return reply.status(401).send({ error: 'Unauthorized' })

    const parsed = ViewQuery.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues.map(i => i.message).join('; ') })
    }

    const { view, month = 0, year = 0 } = parsed.data

    if (view === 'month' && (!month || !year)) {
      return reply.status(400).send({ error: 'month and year are required when view=month' })
    }
    if (view === 'year' && !year) {
      return reply.status(400).send({ error: 'year is required when view=year' })
    }

    const { clause, params } = buildViewWhere(view, month, year, 2)

    const { rows } = await db.query(
      `SELECT
         category,
         (array_agg(emoji ORDER BY created_at DESC) FILTER (WHERE emoji IS NOT NULL))[1] AS emoji,
         COALESCE(SUM(total_amount - COALESCE(tax_amount, 0)), 0) AS base_amount,
         COALESCE(SUM(tax_amount), 0)                             AS tax_total
       FROM receipts
       WHERE user_id = $1 ${clause}
         AND category IS NOT NULL
         AND tax_amount > 0
       GROUP BY category
       ORDER BY tax_total DESC`,
      [neonUser.id, ...params]
    )

    const totalTax = rows.reduce((s: number, r: Record<string, unknown>) => s + Number(r.tax_total), 0)

    return {
      totalTax,
      items: rows.map((r: Record<string, unknown>) => {
        const base = Number(r.base_amount)
        const tax  = Number(r.tax_total)
        return {
          category:   r.category,
          emoji:      r.emoji ?? null,
          baseAmount: base,
          taxTotal:   tax,
          gstRate:    base > 0 ? Math.round((tax / base) * 100) : 0,
        }
      }),
    }
  })
}

export default reportsRoute
