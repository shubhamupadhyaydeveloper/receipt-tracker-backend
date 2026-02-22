import 'dotenv/config';
import path from 'path';
import fastify from "fastify";
import multipart from "@fastify/multipart";
import staticFiles from "@fastify/static";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import receiptRoutes from "./routes/receipt-scan";
import paymentRoutes from "./routes/payment";

const app = fastify({ logger: false })

// ─── 1. CORS ────────────────────────────────────────────────────────────────
// Comma-separated list of allowed origins in .env:
// ALLOWED_ORIGINS=https://your-app.com,https://another-domain.com
// Use * to allow all (not recommended in production)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*')
    .split(',')
    .map(o => o.trim())

app.register(cors, {
    origin: allowedOrigins.length === 1 && allowedOrigins[0] === '*'
        ? '*'
        : allowedOrigins,
    methods: ['GET', 'POST'],
})

app.register(rateLimit, {
    max: 30,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
        error: 'Too many requests. Please slow down.',
    }),
})

// Set API_KEY in your .env file. Your mobile app reads it from secure storage.
app.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/api')) return  // skip static files

    const apiKey = request.headers['x-api-key']
    if (!apiKey || apiKey !== process.env.API_KEY) {
        return reply.status(401).send({ error: 'Unauthorized: invalid or missing API key' })
    }
})

app.register(multipart)
app.register(staticFiles, { root: path.join(__dirname, '..', 'public'), prefix: '/' })

app.register(receiptRoutes, { prefix: '/api' })
app.register(paymentRoutes, { prefix: '/api' })

export default app
