import 'fastify'
import { DecodedIdToken } from 'firebase-admin/auth'

declare module 'fastify' {
  interface FastifyRequest {
    firebaseUser: DecodedIdToken
    neonUser: {
      id: string
      firebase_uid: string
      full_name: string
      email: string
      avatar_url: string
      plan: 'free' | 'pro'
      receipts_scanned_this_month: number
      razorpay_customer_id: string | null
      razorpay_subscription_id: string | null
    } | null
  }
}