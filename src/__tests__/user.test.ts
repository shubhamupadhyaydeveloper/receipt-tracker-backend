import { describe, it, expect, vi } from 'vitest'
import { buildTestApp } from './helpers/buildTestApp'
import userRoute from '../routes/user'
import { db } from '../db'

vi.mock('../db', () => ({ db: { query: vi.fn() } }))

const mockQuery = vi.mocked(db.query)

const MOCK_PROFILE_ROW = {
  id:                   'user-uuid-123',
  full_name:            'Test User',
  email:                'test@example.com',
  avatar_url:           'https://example.com/avatar.jpg',
  currency:             'INR',
  user_type:            'Freelancer',
  monthly_budget:       '50000.00',
  plan:                 'free',
  language:             'en',
  selected_categories:  ['Food & Dining', 'Travel'],
}

describe('GET /api/user/profile', () => {
  it('returns user profile', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_PROFILE_ROW], rowCount: 1 } as any)

    const app = await buildTestApp(userRoute)
    const res = await app.inject({ method: 'GET', url: '/api/user/profile' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.name).toBe('Test User')
    expect(body.email).toBe('test@example.com')
    expect(body.currency).toBe('INR')
    expect(body.userType).toBe('Freelancer')
    expect(body.monthlyBudget).toBe(50000)
    expect(body.isPremium).toBe(false)
    expect(body.premiumPlan).toBeNull()
    expect(body.selectedCategories).toEqual(['Food & Dining', 'Travel'])
  })

  it('returns isPremium=true for pro plan', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...MOCK_PROFILE_ROW, plan: 'pro' }],
      rowCount: 1,
    } as any)

    const app = await buildTestApp(userRoute)
    const res = await app.inject({ method: 'GET', url: '/api/user/profile' })

    expect(res.statusCode).toBe(200)
    expect(res.json().isPremium).toBe(true)
    expect(res.json().premiumPlan).toBe('pro')
  })

  it('returns 404 when profile not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const app = await buildTestApp(userRoute)
    const res = await app.inject({ method: 'GET', url: '/api/user/profile' })

    expect(res.statusCode).toBe(404)
  })
})

describe('PUT /api/user/profile', () => {
  it('updates profile fields', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)

    const app = await buildTestApp(userRoute)
    const res = await app.inject({
      method:  'PUT',
      url:     '/api/user/profile',
      payload: { name: 'New Name', currency: 'USD', language: 'hi' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().success).toBe(true)
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE user_profiles'),
      expect.arrayContaining(['New Name', 'USD', 'hi'])
    )
  })

  it('returns 400 when no fields provided', async () => {
    const app = await buildTestApp(userRoute)
    const res = await app.inject({
      method:  'PUT',
      url:     '/api/user/profile',
      payload: {},
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('No fields to update')
  })

  it('returns 400 for invalid currency (not 3 chars)', async () => {
    const app = await buildTestApp(userRoute)
    const res = await app.inject({
      method:  'PUT',
      url:     '/api/user/profile',
      payload: { currency: 'RUPEE' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 for invalid photoUrl', async () => {
    const app = await buildTestApp(userRoute)
    const res = await app.inject({
      method:  'PUT',
      url:     '/api/user/profile',
      payload: { photoUrl: 'not-a-url' },
    })
    expect(res.statusCode).toBe(400)
  })
})
