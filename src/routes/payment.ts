import { FastifyInstance } from 'fastify';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { db } from '../db';

const plans = {
    monthly: { amount: 14900, currency: 'INR', description: 'BillSnap Pro — Monthly' },
    yearly:  { amount: 249900, currency: 'INR', description: 'BillSnap Pro — Yearly' },
}

const paymentRoutes = async (fastify: FastifyInstance) => {
    const razorpay = new Razorpay({
        key_id:     process.env.RAZORPAY_KEY_ID     as string,
        key_secret: process.env.RAZORPAY_KEY_SECRET as string,
    });

    // ─── POST /api/payment/create-order ──────────────────────────────────────
    // Creates a Razorpay order for the selected plan. Frontend uses the returned
    // orderId to open the Razorpay checkout UI.
    fastify.post<{ Body: { plan: 'monthly' | 'yearly' } }>(
        '/payment/create-order',
        async (request, reply) => {
            const { neonUser } = request

            if (!neonUser) {
                return reply.status(401).send({ error: 'Unauthorized' })
            }

            const { plan } = request.body

            if (!plans[plan]) {
                return reply.status(400).send({ error: 'Invalid plan. Choose monthly or yearly.' })
            }

            const order = await razorpay.orders.create({
                amount:   plans[plan].amount,
                currency: plans[plan].currency,
                receipt:  `receipt_${Date.now()}`,
                notes:    { plan, userId: neonUser.id },
            })

            return reply.send({
                orderId:  order.id,
                amount:   order.amount,
                currency: order.currency,
                keyId:    process.env.RAZORPAY_KEY_ID,
            })
        }
    )

    // ─── POST /api/payment/verify ─────────────────────────────────────────────
    // Verifies Razorpay payment signature, then upgrades the user's plan in DB.
    // Frontend sends the three Razorpay fields + the plan that was purchased.
    fastify.post<{
        Body: {
            razorpay_order_id:   string
            razorpay_payment_id: string
            razorpay_signature:  string
        }
    }>(
        '/payment/verify',
        async (request, reply) => {
            const { neonUser } = request

            if (!neonUser) {
                return reply.status(401).send({ error: 'Unauthorized' })
            }

            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = request.body

            // ── Verify Razorpay signature ─────────────────────────────────────
            const generated_signature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
                .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                .digest('hex')

            if (generated_signature !== razorpay_signature) {
                return reply.status(400).send({ success: false, error: 'Payment verification failed' })
            }

            // ── Read plan from order notes (never trust frontend) ─────────────
            const order = await razorpay.orders.fetch(razorpay_order_id)
            const plan = (order.notes as Record<string, string>).plan as 'monthly' | 'yearly'
            if (!plan || !plans[plan]) {
                return reply.status(400).send({ success: false, error: 'Invalid plan in order' })
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
                 SET plan = 'pro',
                     plan_started_at          = $1,
                     plan_expires_at          = $2,
                     razorpay_subscription_id = $3,
                     updated_at               = NOW()
                 WHERE id = $4`,
                [now, planExpiresAt, razorpay_payment_id, neonUser.id]
            )

            return reply.send({ success: true, plan: 'pro', expiresAt: planExpiresAt })
        }
    )

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
}

export default paymentRoutes;
