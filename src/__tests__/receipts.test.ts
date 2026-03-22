import { describe, it, expect, vi } from 'vitest'
import { buildTestApp } from './helpers/buildTestApp'
import { MOCK_RECEIPT_ROW } from './helpers/mockData'
import receiptsRoute from '../routes/receipts'
import { db } from '../db'

vi.mock('../db', () => ({ db: { query: vi.fn() } }))

const mockQuery = vi.mocked(db.query)

describe('GET /api/receipts', () => {
  it('returns paginated receipts', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [MOCK_RECEIPT_ROW, MOCK_RECEIPT_ROW], rowCount: 2 } as any)

    const app = await buildTestApp(receiptsRoute)
    const res = await app.inject({ method: 'GET', url: '/api/receipts' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.receipts).toHaveLength(2)
    expect(body.total).toBe(2)
    expect(body.page).toBe(1)
    expect(body.totalPages).toBe(1)
    expect(body.receipts[0].vendor).toBe('Test Vendor')
  })

  it('returns 400 for invalid month', async () => {
    const app = await buildTestApp(receiptsRoute)
    const res = await app.inject({ method: 'GET', url: '/api/receipts?month=13' })
    expect(res.statusCode).toBe(400)
  })

  it('filters by search query', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [MOCK_RECEIPT_ROW], rowCount: 1 } as any)

    const app = await buildTestApp(receiptsRoute)
    const res = await app.inject({ method: 'GET', url: '/api/receipts?search=Test' })

    expect(res.statusCode).toBe(200)
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('ILIKE'),
      expect.arrayContaining(['%Test%'])
    )
  })
})

describe('GET /api/receipts/:id', () => {
  it('returns a single receipt', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_RECEIPT_ROW], rowCount: 1 } as any)

    const app = await buildTestApp(receiptsRoute)
    const res = await app.inject({ method: 'GET', url: '/api/receipts/receipt-uuid-1' })

    expect(res.statusCode).toBe(200)
    expect(res.json().receipt.id).toBe('receipt-uuid-1')
  })

  it('returns 404 when receipt not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const app = await buildTestApp(receiptsRoute)
    const res = await app.inject({ method: 'GET', url: '/api/receipts/nonexistent-id' })

    expect(res.statusCode).toBe(404)
    expect(res.json().error).toBe('Receipt not found')
  })
})

describe('PUT /api/receipts/:id', () => {
  it('updates a receipt', async () => {
    const updated = { ...MOCK_RECEIPT_ROW, vendor_name: 'Updated Vendor' }
    mockQuery.mockResolvedValueOnce({ rows: [updated], rowCount: 1 } as any)

    const app = await buildTestApp(receiptsRoute)
    const res = await app.inject({
      method:  'PUT',
      url:     '/api/receipts/receipt-uuid-1',
      payload: { vendor: 'Updated Vendor' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().success).toBe(true)
    expect(res.json().receipt.vendor).toBe('Updated Vendor')
  })

  it('returns 400 when no fields provided', async () => {
    const app = await buildTestApp(receiptsRoute)
    const res = await app.inject({
      method:  'PUT',
      url:     '/api/receipts/receipt-uuid-1',
      payload: {},
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('No fields to update')
  })

  it('returns 400 for invalid date format', async () => {
    const app = await buildTestApp(receiptsRoute)
    const res = await app.inject({
      method:  'PUT',
      url:     '/api/receipts/receipt-uuid-1',
      payload: { date: '15-03-2026' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 404 when receipt not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const app = await buildTestApp(receiptsRoute)
    const res = await app.inject({
      method:  'PUT',
      url:     '/api/receipts/nonexistent-id',
      payload: { vendor: 'X' },
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /api/receipts/:id', () => {
  it('deletes a receipt', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)

    const app = await buildTestApp(receiptsRoute)
    const res = await app.inject({ method: 'DELETE', url: '/api/receipts/receipt-uuid-1' })

    expect(res.statusCode).toBe(200)
    expect(res.json().success).toBe(true)
  })

  it('returns 404 when receipt not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const app = await buildTestApp(receiptsRoute)
    const res = await app.inject({ method: 'DELETE', url: '/api/receipts/nonexistent-id' })

    expect(res.statusCode).toBe(404)
  })
})
