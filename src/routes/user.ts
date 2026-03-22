import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db'

const UpdateProfileBody = z.object({
  name:               z.string().max(200).optional(),
  photoUrl:           z.string().url('photoUrl must be a valid URL').optional(),
  currency:           z.string().length(3, 'currency must be a 3-letter code').optional(),
  userType:           z.string().max(100).optional(),
  monthlyBudget:      z.number().nonnegative().optional(),
  language:           z.string().max(10).optional(),
  selectedCategories: z.array(z.string().max(100)).max(50).optional(),
})

const userRoute = async (app: FastifyInstance) => {

  // ─── GET /api/user/profile ───────────────────────────────────────────────────
  app.get('/user/profile', async (request, reply) => {
    const { neonUser } = request
    if (!neonUser) return reply.status(401).send({ error: 'Unauthorized' })

    const { rows } = await db.query(
      `SELECT * FROM user_profiles WHERE id = $1`,
      [neonUser.id]
    )
    if (!rows[0]) return reply.status(404).send({ error: 'Profile not found' })

    const u = rows[0]
    return {
      name:               u.full_name            ?? null,
      email:              u.email                ?? null,
      photoUrl:           u.avatar_url           ?? null,
      currency:           u.currency             ?? 'INR',
      userType:           u.user_type            ?? null,
      monthlyBudget:      u.monthly_budget       ? Number(u.monthly_budget) : null,
      isPremium:          u.plan === 'pro',
      premiumPlan:        u.plan === 'pro' ? u.plan : null,
      language:           u.language             ?? 'en',
      selectedCategories: u.selected_categories  ?? [],
    }
  })

  // ─── PUT /api/user/profile ───────────────────────────────────────────────────
  app.put('/user/profile', async (request, reply) => {
    const { neonUser } = request
    if (!neonUser) return reply.status(401).send({ error: 'Unauthorized' })

    const parsed = UpdateProfileBody.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues.map(i => i.message).join('; ') })
    }

    const body = parsed.data

    const fieldMap: Record<string, string> = {
      name:               'full_name',
      photoUrl:           'avatar_url',
      currency:           'currency',
      userType:           'user_type',
      monthlyBudget:      'monthly_budget',
      language:           'language',
      selectedCategories: 'selected_categories',
    }

    const sets: string[] = []
    const params: any[]  = []
    let idx = 1

    for (const [key, col] of Object.entries(fieldMap)) {
      if ((body as any)[key] !== undefined) {
        sets.push(`${col} = $${idx++}`)
        params.push((body as any)[key])
      }
    }

    if (sets.length === 0) return reply.status(400).send({ error: 'No fields to update' })

    sets.push(`updated_at = NOW()`)
    params.push(neonUser.id)

    await db.query(
      `UPDATE user_profiles SET ${sets.join(', ')} WHERE id = $${idx}`,
      params
    )

    return { success: true }
  })
}

export default userRoute
