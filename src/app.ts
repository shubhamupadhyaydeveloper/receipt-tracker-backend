import 'dotenv/config';
import path from 'path';
import fastify from "fastify";
import multipart from "@fastify/multipart";
import staticFiles from "@fastify/static";
import rateLimit from "@fastify/rate-limit";
import { createRemoteJWKSet, jwtVerify } from "jose";
import receiptRoutes from "./routes/receipt-scan";
import paymentRoutes from "./routes/payment";

const app = fastify({ logger: false })

// ─── JWKS — fetches Supabase's public key automatically ─────────────────────
// Works with both old HS256 and new ECC P-256 keys, and handles future rotations.
const JWKS = createRemoteJWKSet(
    new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
)

// ─── 1. RATE LIMITING ───────────────────────────────────────────────────────
// Max 30 requests per minute per IP
app.register(rateLimit, {
    max: 30,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
        error: 'Too many requests. Please slow down.',
    }),
})

// ─── 2. SUPABASE JWT AUTH ───────────────────────────────────────────────────
// Protects all /api/* routes.
// The mobile app sends: Authorization: Bearer <supabase_access_token>
// jwtVerify fetches the public key from Supabase's /auth/v1/jwks endpoint
// and verifies the token signature — no secret needed.
app.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/api')) return  // skip static files

    const authHeader = request.headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Unauthorized: missing token' })
    }

    const token = authHeader.split(' ')[1]
    try {
        await jwtVerify(token, JWKS)
    } catch {
        return reply.status(401).send({ error: 'Unauthorized: invalid or expired token' })
    }
})

// ─── PLUGINS ────────────────────────────────────────────────────────────────
app.register(multipart)
app.register(staticFiles, { root: path.join(__dirname, '..', 'public'), prefix: '/' })

// ─── ROUTES ─────────────────────────────────────────────────────────────────
app.register(receiptRoutes, { prefix: '/api' })
app.register(paymentRoutes, { prefix: '/api' })

export default app
