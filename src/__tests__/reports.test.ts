import { describe, it, expect, vi } from 'vitest'
import { buildTestApp } from './helpers/buildTestApp'
import reportsRoute from '../routes/reports'
import { db } from '../db'

vi.mock('../db', () => ({ db: { query: vi.fn() } }))

const mockQuery = vi.mocked(db.query)

// ─── GET /api/reports/summary ─────────────────────────────────────────────────
describe('GET /api/reports/summary', () => {
  it('returns summary for view=all', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{
          total_spent:    '12400.50',
          business_total: '8200.00',
          personal_total: '4200.50',
          receipt_count:  '34',
          avg_per_receipt:'364.72',
          billable_amount:'5400.00',
          billable_count: '12',
        }],
        rowCount: 1,
      } as any)
      .mockResolvedValueOnce({
        rows: [{ category: 'Food & Dining', emoji: '🍕', total: '4200.00', count: '12' }],
        rowCount: 1,
      } as any)

    const app = await buildTestApp(reportsRoute)
    const res = await app.inject({ method: 'GET', url: '/api/reports/summary?view=all' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.totalSpent).toBe(12400.5)
    expect(body.businessTotal).toBe(8200)
    expect(body.receiptCount).toBe(34)
    expect(body.billableCount).toBe(12)
    expect(body.categories).toHaveLength(1)
    expect(body.categories[0].percent).toBeGreaterThan(0)
  })

  it('returns 400 when view is missing', async () => {
    const app = await buildTestApp(reportsRoute)
    const res = await app.inject({ method: 'GET', url: '/api/reports/summary' })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 for view=month without month param', async () => {
    const app = await buildTestApp(reportsRoute)
    const res = await app.inject({ method: 'GET', url: '/api/reports/summary?view=month&year=2026' })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toContain('month and year are required')
  })

  it('returns 400 for view=year without year param', async () => {
    const app = await buildTestApp(reportsRoute)
    const res = await app.inject({ method: 'GET', url: '/api/reports/summary?view=year' })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toContain('year is required')
  })
})

// ─── GET /api/reports/monthly-trend ──────────────────────────────────────────
describe('GET /api/reports/monthly-trend', () => {
  it('returns all 12 months including zeroes', async () => {
    // Only March and June have data
    mockQuery.mockResolvedValueOnce({
      rows: [{ month: 3, total: '9100.00' }, { month: 6, total: '4500.00' }],
      rowCount: 2,
    } as any)

    const app = await buildTestApp(reportsRoute)
    const res = await app.inject({ method: 'GET', url: '/api/reports/monthly-trend?year=2026' })

    expect(res.statusCode).toBe(200)
    const { months } = res.json()
    expect(months).toHaveLength(12)
    expect(months[0].label).toBe('Jan')
    expect(months[0].total).toBe(0)
    expect(months[2].total).toBe(9100)   // March
    expect(months[5].total).toBe(4500)   // June
    expect(months[11].label).toBe('Dec')
  })

  it('returns 400 when year is missing', async () => {
    const app = await buildTestApp(reportsRoute)
    const res = await app.inject({ method: 'GET', url: '/api/reports/monthly-trend' })
    expect(res.statusCode).toBe(400)
  })
})

// ─── GET /api/reports/gst ────────────────────────────────────────────────────
describe('GET /api/reports/gst', () => {
  it('returns GST breakdown', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        category:    'Food & Dining',
        emoji:       '🍕',
        base_amount: '3780.00',
        tax_total:   '420.00',
      }],
      rowCount: 1,
    } as any)

    const app = await buildTestApp(reportsRoute)
    const res = await app.inject({ method: 'GET', url: '/api/reports/gst?view=all' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.totalTax).toBe(420)
    expect(body.items).toHaveLength(1)
    expect(body.items[0].gstRate).toBe(11) // 420/3780 * 100 ≈ 11
  })

  it('returns 400 when view is missing', async () => {
    const app = await buildTestApp(reportsRoute)
    const res = await app.inject({ method: 'GET', url: '/api/reports/gst' })
    expect(res.statusCode).toBe(400)
  })
})
