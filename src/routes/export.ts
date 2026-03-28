import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import ImageKit from 'imagekit'
import { db } from '../db'

const imagekit = new ImageKit({
  publicKey:   process.env.IMAGEKIT_PUBLIC_KEY   as string,
  privateKey:  process.env.IMAGEKIT_PRIVATE_KEY  as string,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT as string,
})

const ExportBody = z.object({
  format:          z.enum(['excel', 'csv', 'pdf']),
  period:          z.enum(['this_month', 'last_month', 'this_year', 'custom']),
  month:           z.number().int().min(1).max(12).optional(),
  year:            z.number().int().min(2000).max(2100).optional(),
  dateFrom:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateFrom must be YYYY-MM-DD').optional(),
  dateTo:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateTo must be YYYY-MM-DD').optional(),
  isBusiness:      z.boolean().optional(),
  groupByCategory: z.boolean().optional(),
  includeImages:   z.boolean().optional(),
})

function resolveDateRange(body: z.infer<typeof ExportBody>): { from: string; to: string } {
  const { period, month, year, dateFrom, dateTo } = body

  if (period === 'custom') {
    if (!dateFrom || !dateTo) throw new Error('dateFrom and dateTo are required for custom period')
    return { from: dateFrom, to: dateTo }
  }

  const now = new Date()
  const y   = year  || now.getFullYear()
  const m   = month || (now.getMonth() + 1)
  const pad = (n: number) => String(n).padStart(2, '0')

  if (period === 'this_month') {
    const lastDay = new Date(y, m, 0).getDate()
    return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${lastDay}` }
  }

  if (period === 'last_month') {
    const lm      = m === 1 ? 12 : m - 1
    const ly      = m === 1 ? y - 1 : y
    const lastDay = new Date(ly, lm, 0).getDate()
    return { from: `${ly}-${pad(lm)}-01`, to: `${ly}-${pad(lm)}-${lastDay}` }
  }

  // this_year
  return { from: `${y}-01-01`, to: `${y}-12-31` }
}

function buildCsv(rows: Record<string, unknown>[], groupByCategory: boolean): string {
  const headers = ['Date', 'Vendor', 'Category', 'Amount', 'Tax', 'Business', 'Billable', 'Notes']
  const escape  = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

  const toRow = (r: Record<string, unknown>) => [
    r.receipt_date ? new Date(r.receipt_date as string | number | Date).toISOString().split('T')[0] : '',
    r.vendor_name  ?? '',
    r.category     ?? '',
    r.total_amount ?? 0,
    r.tax_amount   ?? 0,
    r.is_business  ? 'Yes' : 'No',
    r.is_billable  ? 'Yes' : 'No',
    r.notes        ?? '',
  ].map(escape).join(',')

  const sorted = groupByCategory
    ? [...rows].sort((a, b) => ((a.category as string) ?? '').localeCompare((b.category as string) ?? ''))
    : rows

  return [headers.join(','), ...sorted.map(toRow)].join('\n')
}

const exportRoute = async (app: FastifyInstance) => {

  // ─── POST /api/export ────────────────────────────────────────────────────────
  app.post('/export', async (request, reply) => {
    const { neonUser } = request
    if (!neonUser) return reply.status(401).send({ error: 'Unauthorized' })

    const parsed = ExportBody.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues.map(i => i.message).join('; ') })
    }

    const body = parsed.data

    if (body.format === 'pdf') {
      return reply.status(422).send({ error: 'PDF export is not yet supported' })
    }

    let dateRange: { from: string; to: string }
    try {
      dateRange = resolveDateRange(body)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid date range'
      return reply.status(400).send({ error: message })
    }

    const conditions = ['user_id = $1', 'receipt_date >= $2', 'receipt_date <= $3']
    const params: unknown[] = [neonUser.id, dateRange.from, dateRange.to]

    if (body.isBusiness === true) {
      conditions.push(`is_business = $${params.length + 1}`)
      params.push(true)
    }

    const EXPORT_LIMIT = 5000
    const { rows } = await db.query(
      `SELECT * FROM receipts WHERE ${conditions.join(' AND ')} ORDER BY receipt_date ASC LIMIT ${EXPORT_LIMIT + 1}`,
      params
    )

    const truncated = rows.length > EXPORT_LIMIT
    const exportRows = truncated ? rows.slice(0, EXPORT_LIMIT) : rows

    const csvContent = buildCsv(exportRows, body.groupByCategory ?? false)
    const fileBuffer = Buffer.from(csvContent, 'utf-8')

    const label    = body.period === 'custom' ? `${dateRange.from}_to_${dateRange.to}` : body.period.replace(/_/g, '-')
    const ext      = body.format === 'excel' ? 'xlsx' : 'csv'
    const fileName = `BillSnap_${label}.${ext}`

    try {
      const uploadResult = await imagekit.upload({ file: fileBuffer, fileName, folder: '/exports' })
      const fileUrl   = imagekit.url({ path: uploadResult.filePath, signed: true, expireSeconds: 3600 })
      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString()
      if (truncated) reply.header('X-Export-Truncated', 'true')
      return { success: true, fileUrl, fileName, expiresAt }
    } catch (err) {
      request.log.error({ err }, 'ImageKit export upload failed')
      return reply.status(502).send({ error: 'Export upload failed. Please try again.' })
    }
  })
}

export default exportRoute
