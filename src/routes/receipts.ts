import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db'
import { mapReceipt } from '../lib/mapReceipt'

const GetReceiptsQuery = z.object({
  month:      z.coerce.number().int().min(1).max(12).optional(),
  year:       z.coerce.number().int().min(2000).max(2100).optional(),
  category:   z.string().max(100).optional(),
  isBusiness: z.enum(['true', 'false']).optional(),
  search:     z.string().max(200).optional(),
  page:       z.coerce.number().int().min(1).optional(),
  limit:      z.coerce.number().int().min(1).max(200).optional(),
})

const UpdateReceiptBody = z.object({
  vendor:     z.string().max(200).optional(),
  date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD').optional(),
  time:       z.string().optional(),
  category:   z.string().max(100).optional(),
  emoji:      z.string().max(10).optional(),
  amount:     z.number().nonnegative().optional(),
  tax:        z.number().nonnegative().optional(),
  isBusiness: z.boolean().optional(),
  isBillable: z.boolean().optional(),
  notes:      z.string().max(2000).optional(),
  items:      z.array(z.object({ name: z.string(), price: z.number() })).optional(),
})

const receiptsRoute = async (app: FastifyInstance) => {

  // ─── GET /api/receipts ───────────────────────────────────────────────────────
  app.get('/receipts', async (request, reply) => {
    const { neonUser } = request
    if (!neonUser) return reply.status(401).send({ error: 'Unauthorized' })

    const parsed = GetReceiptsQuery.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues.map(i => i.message).join('; ') })
    }

    const q      = parsed.data
    const page   = q.page  ?? 1
    const limit  = q.limit ?? 50
    const offset = (page - 1) * limit

    const conditions: string[] = ['user_id = $1']
    const params: any[] = [neonUser.id]
    let idx = 2

    if (q.month !== undefined) {
      conditions.push(`EXTRACT(MONTH FROM receipt_date) = $${idx++}`)
      params.push(q.month)
    }
    if (q.year !== undefined) {
      conditions.push(`EXTRACT(YEAR FROM receipt_date) = $${idx++}`)
      params.push(q.year)
    }
    if (q.category) {
      conditions.push(`category = $${idx++}`)
      params.push(q.category)
    }
    if (q.isBusiness !== undefined) {
      conditions.push(`is_business = $${idx++}`)
      params.push(q.isBusiness === 'true')
    }
    if (q.search) {
      conditions.push(`(vendor_name ILIKE $${idx} OR notes ILIKE $${idx})`)
      params.push(`%${q.search}%`)
      idx++
    }

    const where = conditions.join(' AND ')

    const [countResult, dataResult] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM receipts WHERE ${where}`, params),
      db.query(
        `SELECT * FROM receipts WHERE ${where} ORDER BY receipt_date DESC, created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
    ])

    const total = parseInt(countResult.rows[0].count)

    return {
      receipts:   dataResult.rows.map(mapReceipt),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  })

  // ─── GET /api/receipts/:id ───────────────────────────────────────────────────
  app.get('/receipts/:id', async (request, reply) => {
    const { neonUser } = request
    if (!neonUser) return reply.status(401).send({ error: 'Unauthorized' })

    const { id } = request.params as { id: string }
    if (!id) return reply.status(400).send({ error: 'id is required' })

    const { rows } = await db.query(
      `SELECT * FROM receipts WHERE id = $1 AND user_id = $2`,
      [id, neonUser.id]
    )
    if (!rows[0]) return reply.status(404).send({ error: 'Receipt not found' })

    return { receipt: mapReceipt(rows[0]) }
  })

  // ─── PUT /api/receipts/:id ───────────────────────────────────────────────────
  app.put('/receipts/:id', async (request, reply) => {
    const { neonUser } = request
    if (!neonUser) return reply.status(401).send({ error: 'Unauthorized' })

    const parsed = UpdateReceiptBody.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues.map(i => i.message).join('; ') })
    }

    const { id } = request.params as { id: string }
    const body   = parsed.data

    const fieldMap: Record<string, string> = {
      vendor:     'vendor_name',
      date:       'receipt_date',
      time:       'receipt_time',
      category:   'category',
      emoji:      'emoji',
      amount:     'total_amount',
      tax:        'tax_amount',
      isBusiness: 'is_business',
      isBillable: 'is_billable',
      notes:      'notes',
      items:      'items',
    }

    const sets: string[] = []
    const params: any[]  = []
    let idx = 1

    for (const [key, col] of Object.entries(fieldMap)) {
      if ((body as any)[key] !== undefined) {
        sets.push(`${col} = $${idx++}`)
        params.push(key === 'items' ? JSON.stringify((body as any)[key]) : (body as any)[key])
      }
    }

    if (sets.length === 0) return reply.status(400).send({ error: 'No fields to update' })

    sets.push(`updated_at = NOW()`)
    params.push(id, neonUser.id)

    const { rows } = await db.query(
      `UPDATE receipts SET ${sets.join(', ')} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
      params
    )
    if (!rows[0]) return reply.status(404).send({ error: 'Receipt not found' })

    return { success: true, receipt: mapReceipt(rows[0]) }
  })

  // ─── DELETE /api/receipts/:id ────────────────────────────────────────────────
  app.delete('/receipts/:id', async (request, reply) => {
    const { neonUser } = request
    if (!neonUser) return reply.status(401).send({ error: 'Unauthorized' })

    const { id } = request.params as { id: string }
    const result = await db.query(
      `DELETE FROM receipts WHERE id = $1 AND user_id = $2`,
      [id, neonUser.id]
    )
    if (!result.rowCount) return reply.status(404).send({ error: 'Receipt not found' })

    return { success: true }
  })
}

export default receiptsRoute
