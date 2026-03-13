import { FastifyInstance } from 'fastify';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { db } from '../db';
import { PaymentSession, UserProfile } from '../db/types';

const plans = {
    monthly: { amount: 14900, currency: 'INR', description: 'BillSnap Pro — Monthly' },
    yearly:  { amount: 249900, currency: 'INR', description: 'BillSnap Pro — Yearly' },
}

const paymentRoutes = async (fastify: FastifyInstance) => {
    const razorpay = new Razorpay({
        key_id:     process.env.RAZORPAY_KEY_ID     as string,
        key_secret: process.env.RAZORPAY_KEY_SECRET as string,
    });

    // ─── GET /api/payment/status ──────────────────────────────────────────────
    // Returns the current user's plan status.
    fastify.get('/payment/status', async (request, reply) => {
        const { neonUser } = request

        if (!neonUser) {
            return reply.status(401).send({ error: 'Unauthorized' })
        }

        return reply.send({
            plan:          neonUser.plan,
            planExpiresAt: neonUser.plan_expires_at,
        })
    })

    // ─── POST /api/payment/create-session ────────────────────────────────────
    // Called by the mobile app (with Firebase Bearer token).
    // Creates a one-time, 10-minute session UUID and returns it so the app can
    // safely pass it in the Chrome redirect URL instead of the raw token.
    fastify.post('/payment/create-session', async (request, reply) => {
        const { neonUser } = request

        if (!neonUser) {
            return reply.status(401).send({ error: 'Unauthorized' })
        }

        const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 min from now

        const { rows } = await db.query<PaymentSession>(
            `INSERT INTO payment_sessions (user_id, expires_at)
             VALUES ($1, $2) RETURNING *`,
            [neonUser.id, expiresAt]
        )

        return reply.status(201).send({ sessionId: rows[0].session_id })
    })

    // ─── POST /api/payment/create-order-session ───────────────────────────────
    // Called by the Chrome pricing page — no Firebase token required.
    // Validates + consumes the session, then creates a Razorpay order.
    fastify.post<{ Body: { sessionId: string; plan: 'monthly' | 'yearly' } }>(
        '/payment/create-order-session',
        async (request, reply) => {
            const { sessionId, plan } = request.body

            if (!sessionId)  return reply.status(400).send({ error: 'sessionId is required' })
            if (!plans[plan]) return reply.status(400).send({ error: 'Invalid plan. Choose monthly or yearly.' })

            // ── Fetch session ─────────────────────────────────────────────────
            const { rows } = await db.query<PaymentSession>(
                `SELECT * FROM payment_sessions WHERE session_id = $1`,
                [sessionId]
            )

            if (rows.length === 0) return reply.status(404).send({ error: 'Session not found' })

            const session = rows[0]
            if (session.used)                    return reply.status(410).send({ error: 'Session already used' })
            if (new Date() > session.expires_at) return reply.status(410).send({ error: 'Session expired' })

            // ── Atomic mark-as-used (safe against concurrent requests) ────────
            const { rowCount } = await db.query(
                `UPDATE payment_sessions SET used = true WHERE session_id = $1 AND used = false`,
                [sessionId]
            )
            if (rowCount === 0) return reply.status(410).send({ error: 'Session already used' })

            // ── Look up user ──────────────────────────────────────────────────
            const { rows: userRows } = await db.query<UserProfile>(
                `SELECT * FROM user_profiles WHERE id = $1`,
                [session.user_id]
            )
            if (userRows.length === 0) return reply.status(404).send({ error: 'User not found' })

            // ── Create Razorpay order (userId stored in notes server-side) ────
            const order = await razorpay.orders.create({
                amount:   plans[plan].amount,
                currency: plans[plan].currency,
                receipt:  `receipt_${Date.now()}`,
                notes:    { plan, userId: userRows[0].id },
            })

            return reply.send({
                orderId:  order.id,
                amount:   order.amount,
                currency: order.currency,
                keyId:    process.env.RAZORPAY_KEY_ID,
            })
        }
    )

    // ─── POST /api/payment/verify-session ─────────────────────────────────────
    // Called by the Chrome pricing page — no Firebase token required.
    // Verifies Razorpay signature, reads userId from order notes, upgrades plan.
    fastify.post<{
        Body: {
            razorpay_order_id:   string
            razorpay_payment_id: string
            razorpay_signature:  string
        }
    }>(
        '/payment/verify-session',
        async (request, reply) => {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = request.body

            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                return reply.status(400).send({ error: 'Missing required payment fields' })
            }

            // ── Verify Razorpay HMAC signature ────────────────────────────────
            const generated_signature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
                .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                .digest('hex')

            if (generated_signature !== razorpay_signature) {
                return reply.status(400).send({ success: false, error: 'Payment verification failed' })
            }

            // ── Read userId + plan from Razorpay order notes (server-authored) ─
            const order = await razorpay.orders.fetch(razorpay_order_id)
            const notes  = order.notes as Record<string, string>
            const plan   = notes.plan   as 'monthly' | 'yearly'
            const userId = notes.userId as string

            if (!plans[plan] || !userId) {
                return reply.status(400).send({ success: false, error: 'Invalid order notes' })
            }

            // ── Calculate plan expiry ─────────────────────────────────────────
            const now = new Date()
            const planExpiresAt = new Date(now)
            if (plan === 'monthly') {
                planExpiresAt.setMonth(planExpiresAt.getMonth() + 1)
            } else {
                planExpiresAt.setFullYear(planExpiresAt.getFullYear() + 1)
            }

            // ── Upgrade user plan in DB ───────────────────────────────────────
            await db.query(
                `UPDATE user_profiles
                 SET plan                     = 'pro',
                     plan_started_at          = $1,
                     plan_expires_at          = $2,
                     razorpay_subscription_id = $3,
                     updated_at               = NOW()
                 WHERE id = $4`,
                [now, planExpiresAt, razorpay_payment_id, userId]
            )

            return reply.send({ success: true, plan: 'pro', expiresAt: planExpiresAt })
        }
    )
}

export default paymentRoutes;
