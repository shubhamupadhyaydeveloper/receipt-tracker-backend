import 'dotenv/config';
import path from 'path';
import fastify from "fastify";
import multipart from "@fastify/multipart";
import staticFiles from "@fastify/static";
import rateLimit from "@fastify/rate-limit";
import receiptRoutes from "./routes/receipt-scan";
import paymentRoutes from "./routes/payment";
import { admin } from './firebase';
import { db } from './db';
import authRoutes from './routes/auth';
const app = fastify({ logger: false })

app.register(rateLimit, {
    max: 30,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
        error: 'Too many requests. Please slow down.',
    }),
})

app.addHook('preHandler', async (request, reply) => {
  // Skip auth for health check
  if (request.url === '/health') return

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
  } catch (error:unknown) {
    console.error('Error verifying Firebase token:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return reply.status(401).send({ error: 'Invalid token', details: errorMessage })
  }
})

app.register(multipart)
app.register(staticFiles, { root: path.join(__dirname, '..', 'public'), prefix: '/' })

app.register(receiptRoutes, { prefix: '/api' })
app.register(paymentRoutes, { prefix: '/api' })
app.register(authRoutes, { prefix: '/api' })

app.get('/health', async () => ({ status: 'ok' }))

export default app
