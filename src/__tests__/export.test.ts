import { describe, it, expect, vi } from 'vitest'
import { buildTestApp } from './helpers/buildTestApp'
import exportRoute from '../routes/export'
import { db } from '../db'

vi.mock('../db', () => ({ db: { query: vi.fn() } }))

vi.mock('imagekit', () => {
  return {
    default: class {
      upload = vi.fn().mockResolvedValue({ filePath: '/exports/BillSnap_test.csv', url: 'https://ik.test/test.csv' })
      url    = vi.fn().mockReturnValue('https://ik.test/signed/BillSnap_test.csv')
    },
  }
})

const mockQuery = vi.mocked(db.query)

const MOCK_ROWS = [
  {
    receipt_date: new Date('2026-03-10'),
    vendor_name:  'Swiggy',
    category:     'Food & Dining',
    total_amount: '450.00',
    tax_amount:   '45.00',
    is_business:  false,
    is_billable:  false,
    notes:        '',
  },
]

describe('POST /api/export', () => {
  it('exports CSV for this_month period', async () => {
    mockQuery.mockResolvedValueOnce({ rows: MOCK_ROWS, rowCount: 1 } as any)

    const app = await buildTestApp(exportRoute)
    const res = await app.inject({
      method:  'POST',
      url:     '/api/export',
      payload: { format: 'csv', period: 'this_month', month: 3, year: 2026 },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.fileUrl).toBeTruthy()
    expect(body.fileName).toMatch(/\.csv$/)
    expect(body.expiresAt).toBeTruthy()
  })

  it('exports with excel format (returns xlsx filename)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: MOCK_ROWS, rowCount: 1 } as any)

    const app = await buildTestApp(exportRoute)
    const res = await app.inject({
      method:  'POST',
      url:     '/api/export',
      payload: { format: 'excel', period: 'this_year', year: 2026 },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().fileName).toMatch(/\.xlsx$/)
  })

  it('returns 422 for PDF format', async () => {
    const app = await buildTestApp(exportRoute)
    const res = await app.inject({
      method:  'POST',
      url:     '/api/export',
      payload: { format: 'pdf', period: 'this_month' },
    })
    expect(res.statusCode).toBe(422)
  })

  it('returns 400 when format is missing', async () => {
    const app = await buildTestApp(exportRoute)
    const res = await app.inject({
      method:  'POST',
      url:     '/api/export',
      payload: { period: 'this_month' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when period is missing', async () => {
    const app = await buildTestApp(exportRoute)
    const res = await app.inject({
      method:  'POST',
      url:     '/api/export',
      payload: { format: 'csv' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 for custom period without dateFrom/dateTo', async () => {
    const app = await buildTestApp(exportRoute)
    const res = await app.inject({
      method:  'POST',
      url:     '/api/export',
      payload: { format: 'csv', period: 'custom' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toContain('dateFrom and dateTo')
  })

  it('filters by isBusiness when provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const app = await buildTestApp(exportRoute)
    await app.inject({
      method:  'POST',
      url:     '/api/export',
      payload: { format: 'csv', period: 'this_year', year: 2026, isBusiness: true },
    })

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('is_business'),
      expect.arrayContaining([true])
    )
  })
})
