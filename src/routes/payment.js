"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const zod_1 = require("zod");
const db_1 = require("../db");
const CreateOrderBody = zod_1.z.object({
    sessionId: zod_1.z.string().uuid('sessionId must be a valid UUID'),
    plan: zod_1.z.enum(['monthly', 'yearly']),
});
const VerifyPaymentBody = zod_1.z.object({
    razorpay_order_id: zod_1.z.string().min(1),
    razorpay_payment_id: zod_1.z.string().min(1),
    razorpay_signature: zod_1.z.string().min(1),
});
const plans = {
    monthly: { amount: 14900, currency: 'INR', description: 'BillSnap Pro — Monthly' },
    yearly: { amount: 249900, currency: 'INR', description: 'BillSnap Pro — Yearly' },
};
const paymentRoutes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    const razorpay = new razorpay_1.default({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    // ─── GET /api/payment/status ──────────────────────────────────────────────
    // Returns the current user's plan status.
    fastify.get('/payment/status', (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const { neonUser } = request;
        if (!neonUser) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
        return reply.send({
            plan: neonUser.plan,
            planExpiresAt: neonUser.plan_expires_at,
        });
    }));
    // ─── POST /api/payment/create-session ────────────────────────────────────
    // Called by the mobile app (with Firebase Bearer token).
    // Creates a one-time, 10-minute session UUID and returns it so the app can
    // safely pass it in the Chrome redirect URL instead of the raw token.
    fastify.post('/payment/create-session', (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const { neonUser } = request;
        if (!neonUser) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min from now
        const { rows } = yield db_1.db.query(`INSERT INTO payment_sessions (user_id, expires_at)
             VALUES ($1, $2) RETURNING *`, [neonUser.id, expiresAt]);
        return reply.status(201).send({ sessionId: rows[0].session_id });
    }));
    // ─── POST /api/payment/create-order-session ───────────────────────────────
    // Called by the Chrome pricing page — no Firebase token required.
    // Validates + consumes the session, then creates a Razorpay order.
    fastify.post('/payment/create-order-session', (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const parsed = CreateOrderBody.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: parsed.error.issues.map(i => i.message).join('; ') });
        }
        const { sessionId, plan } = parsed.data;
        // ── Fetch session ─────────────────────────────────────────────────
        const { rows } = yield db_1.db.query(`SELECT * FROM payment_sessions WHERE session_id = $1`, [sessionId]);
        if (rows.length === 0)
            return reply.status(404).send({ error: 'Session not found' });
        const session = rows[0];
        if (session.used)
            return reply.status(410).send({ error: 'Session already used' });
        if (new Date() > session.expires_at)
            return reply.status(410).send({ error: 'Session expired' });
        // ── Atomic mark-as-used (safe against concurrent requests) ────────
        const { rowCount } = yield db_1.db.query(`UPDATE payment_sessions SET used = true WHERE session_id = $1 AND used = false`, [sessionId]);
        if (rowCount === 0)
            return reply.status(410).send({ error: 'Session already used' });
        // ── Look up user ──────────────────────────────────────────────────
        const { rows: userRows } = yield db_1.db.query(`SELECT * FROM user_profiles WHERE id = $1`, [session.user_id]);
        if (userRows.length === 0)
            return reply.status(404).send({ error: 'User not found' });
        // ── Create Razorpay order (userId stored in notes server-side) ────
        try {
            const order = yield razorpay.orders.create({
                amount: plans[plan].amount,
                currency: plans[plan].currency,
                receipt: `receipt_${Date.now()}`,
                notes: { plan, userId: userRows[0].id },
            });
            return reply.send({
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                keyId: process.env.RAZORPAY_KEY_ID,
            });
        }
        catch (err) {
            request.log.error({ err }, 'Razorpay order creation failed');
            return reply.status(502).send({ error: 'Payment service unavailable. Please try again.' });
        }
    }));
    // ─── POST /api/payment/verify-session ─────────────────────────────────────
    // Called by the Chrome pricing page — no Firebase token required.
    // Verifies Razorpay signature, reads userId from order notes, upgrades plan.
    fastify.post('/payment/verify-session', (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const parsed = VerifyPaymentBody.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: parsed.error.issues.map(i => i.message).join('; ') });
        }
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;
        // ── Verify Razorpay HMAC signature ────────────────────────────────
        const generated_signature = crypto_1.default
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');
        if (generated_signature !== razorpay_signature) {
            return reply.status(400).send({ success: false, error: 'Payment verification failed' });
        }
        // ── Read userId + plan from Razorpay order notes (server-authored) ─
        let orderNotes;
        try {
            const order = yield razorpay.orders.fetch(razorpay_order_id);
            orderNotes = order.notes;
        }
        catch (err) {
            request.log.error({ err }, 'Razorpay order fetch failed');
            return reply.status(502).send({ success: false, error: 'Payment service unavailable. Please contact support.' });
        }
        const notes = orderNotes;
        const plan = notes.plan;
        const userId = notes.userId;
        if (!plans[plan] || !userId) {
            return reply.status(400).send({ success: false, error: 'Invalid order notes' });
        }
        // ── Calculate plan expiry ─────────────────────────────────────────
        const now = new Date();
        const planExpiresAt = new Date(now);
        if (plan === 'monthly') {
            planExpiresAt.setMonth(planExpiresAt.getMonth() + 1);
        }
        else {
            planExpiresAt.setFullYear(planExpiresAt.getFullYear() + 1);
        }
        // ── Upgrade user plan in DB ───────────────────────────────────────
        yield db_1.db.query(`UPDATE user_profiles
                 SET plan                     = 'pro',
                     plan_started_at          = $1,
                     plan_expires_at          = $2,
                     razorpay_subscription_id = $3,
                     updated_at               = NOW()
                 WHERE id = $4`, [now, planExpiresAt, razorpay_payment_id, userId]);
        return reply.send({ success: true, plan: 'pro', expiresAt: planExpiresAt });
    }));
});
exports.default = paymentRoutes;
