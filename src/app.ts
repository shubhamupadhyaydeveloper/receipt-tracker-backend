import 'dotenv/config';
import path from 'path';
import fastify from "fastify";
import multipart from "@fastify/multipart";
import staticFiles from "@fastify/static";
import rateLimit from "@fastify/rate-limit";
import cors from "@fastify/cors";
import receiptRoutes from "./routes/receipt-scan";
import paymentRoutes from "./routes/payment";
import { admin } from './firebase';
import { db } from './db';
import authRoutes from './routes/auth';
import createReceiptsRoute from './routes/create-receipts';
import receiptsRoute from './routes/receipts';
import dashboardRoute from './routes/dashboard';
import reportsRoute from './routes/reports';
import exportRoute from './routes/export';
import userRoute from './routes/user';

const isProd = process.env.NODE_ENV === 'production'
const app = fastify({
  logger: { level: isProd ? 'warn' : 'info' },
})

app.register(cors, {
  origin: process.env.CORS_ORIGIN ?? true, // set CORS_ORIGIN=https://yourdomain.com in prod
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
})

app.register(rateLimit, {
    max: 30,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
        error: 'Too many requests. Please slow down.',
    }),
})

// Session-based payment routes do their own auth — skip Firebase middleware for these
const AUTH_EXEMPT_PATHS = new Set([
  '/api/payment/create-order-session',
  '/api/payment/verify-session',
])

app.addHook('preHandler', async (request, reply) => {
  // Skip auth for static files and health check — only protect /api routes
  if (!request.url.startsWith('/api')) return

  // Skip for session-based routes (they validate sessionId internally)
  const urlPath = request.url.split('?')[0]
  if (AUTH_EXEMPT_PATHS.has(urlPath)) return

  try {
    const token = request.headers.authorization?.split('Bearer ')[1]
    if (!token) return reply.status(401).send({ error: 'Unauthorized' })

    // Verify Firebase token
    const decoded = await admin.auth().verifyIdToken(token)

    // Get Neon user from firebase_uid
    const { rows } = await db.query(
      `SELECT * FROM user_profiles WHERE firebase_uid = $1`,
      [decoded.uid]
    )

    // Attach to request — available in every route
    request.firebaseUser = decoded
    request.neonUser = rows[0] || null
  } catch (error: unknown) {
    request.log.warn({ err: error }, 'Firebase token verification failed')
    return reply.status(401).send({ error: 'Invalid token' })
  }
})

app.register(multipart)
if (!process.env.VERCEL) {
  app.register(staticFiles, { root: path.join(__dirname, '..', 'public'), prefix: '/' })
}

app.register(receiptRoutes, { prefix: '/api' })
app.register(paymentRoutes, { prefix: '/api' })
app.register(authRoutes, { prefix: '/api' })
app.register(createReceiptsRoute, { prefix: '/api' })
app.register(receiptsRoute, { prefix: '/api' })
app.register(dashboardRoute, { prefix: '/api' })
app.register(reportsRoute, { prefix: '/api' })
app.register(exportRoute, { prefix: '/api' })
app.register(userRoute, { prefix: '/api' })

// Serve the pricing/payment page at /payment — Chrome redirect lands here
// On Vercel this is handled by vercel.json rewrite; reply.sendFile works locally
app.get('/payment', async (_request, reply) => {
  return reply.sendFile('index.html')
})

app.get('/health', async (_request, reply) => {
  try {
    await db.query('SELECT 1')
    return { status: 'ok', db: 'ok' }
  } catch {
    return reply.status(503).send({ status: 'error', db: 'down' })
  }
})

export default app
