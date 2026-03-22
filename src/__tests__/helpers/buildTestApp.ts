import Fastify, { FastifyInstance } from 'fastify'
import { UserProfile } from '../../db/types'

export const MOCK_USER: UserProfile = {
  id:                          'user-uuid-123',
  firebase_uid:                'firebase-uid-123',
  plan:                        'free',
  full_name:                   'Test User',
  email:                       'test@example.com',
  avatar_url:                  null,
  plan_started_at:             null,
  plan_expires_at:             null,
  razorpay_subscription_id:    null,
  razorpay_customer_id:        null,
  receipts_scanned_this_month: 0,
  last_usage_reset_at:         new Date(),
  created_at:                  new Date(),
  updated_at:                  new Date(),
}

export async function buildTestApp(plugin: (app: FastifyInstance) => Promise<void>) {
  const app = Fastify({ logger: false })

  // Bypass Firebase auth — attach mock user directly
  app.addHook('preHandler', async (request) => {
    request.neonUser     = MOCK_USER
    request.firebaseUser = { uid: MOCK_USER.firebase_uid } as any
  })

  app.register(plugin, { prefix: '/api' })
  await app.ready()
  return app
}
