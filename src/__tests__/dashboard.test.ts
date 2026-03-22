import { describe, it, expect, vi } from 'vitest'
import { buildTestApp } from './helpers/buildTestApp'
import { MOCK_RECEIPT_ROW } from './helpers/mockData'
import dashboardRoute from '../routes/dashboard'
import { db } from '../db'

vi.mock('../db', () => ({ db: { query: vi.fn() } }))

const mockQuery = vi.mocked(db.query)

function mockDashboardQueries() {
  mockQuery
    // this month total + count
    .mockResolvedValueOnce({ rows: [{ total: '12400.50', count: '34' }], rowCount: 1 } as any)
    // last month total
    .mockResolvedValueOnce({ rows: [{ total: '9800.00' }], rowCount: 1 } as any)
    // overall total
    .mockResolvedValueOnce({ rows: [{ total: '84200.00' }], rowCount: 1 } as any)
    // categories
    .mockResolvedValueOnce({
      rows: [{ category: 'Food & Dining', emoji: '🍕', total: '4200.00' }],
      rowCount: 1,
    } as any)
    // recent receipts
    .mockResolvedValueOnce({ rows: [MOCK_RECEIPT_ROW], rowCount: 1 } as any)
}

describe('GET /api/dashboard', () => {
  it('returns dashboard data', async () => {
    mockDashboardQueries()
    const app = await buildTestApp(dashboardRoute)
    const res = await app.inject({ method: 'GET', url: '/api/dashboard?month=3&year=2026' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.thisMonthTotal).toBe(12400.5)
    expect(body.lastMonthTotal).toBe(9800)
    expect(body.overallTotal).toBe(84200)
    expect(body.thisMonthCount).toBe(34)
    expect(body.trendDirection).toBe('up')
    expect(body.trendPercent).toBeGreaterThan(0)
    expect(body.categories).toHaveLength(1)
    expect(body.recentReceipts).toHaveLength(1)
  })

  it('calculates trendDirection=down correctly', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: '5000.00', count: '10' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [{ total: '9800.00' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [{ total: '50000.00' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const app = await buildTestApp(dashboardRoute)
    const res = await app.inject({ method: 'GET', url: '/api/dashboard?month=3&year=2026' })

    expect(res.statusCode).toBe(200)
    expect(res.json().trendDirection).toBe('down')
  })

  it('returns 400 when month is missing', async () => {
    const app = await buildTestApp(dashboardRoute)
    const res = await app.inject({ method: 'GET', url: '/api/dashboard?year=2026' })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when year is missing', async () => {
    const app = await buildTestApp(dashboardRoute)
    const res = await app.inject({ method: 'GET', url: '/api/dashboard?month=3' })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 for invalid month value', async () => {
    const app = await buildTestApp(dashboardRoute)
    const res = await app.inject({ method: 'GET', url: '/api/dashboard?month=13&year=2026' })
    expect(res.statusCode).toBe(400)
  })

  it('handles January rollover for last-month calculation', async () => {
    mockDashboardQueries()
    const app = await buildTestApp(dashboardRoute)
    // January: last month should be December of previous year
    const res = await app.inject({ method: 'GET', url: '/api/dashboard?month=1&year=2026' })
    expect(res.statusCode).toBe(200)
    // Last month query should use month=12, year=2025
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([12, 2025])
    )
  })
})
