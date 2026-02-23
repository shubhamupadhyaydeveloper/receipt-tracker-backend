import 'dotenv/config';
import path from 'path';
import fastify from "fastify";
import multipart from "@fastify/multipart";
import staticFiles from "@fastify/static";
import rateLimit from "@fastify/rate-limit";
import jwt from "jsonwebtoken";
import receiptRoutes from "./routes/receipt-scan";
import paymentRoutes from "./routes/payment";

const app = fastify({ logger: false })

app.register(rateLimit, {
    max: 30,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
        error: 'Too many requests. Please slow down.',
    }),
})

app.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/api')) return

    const authHeader = request.headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Unauthorized: missing token' })
    }

    const token = authHeader.split(' ')[1]
    try {
        jwt.verify(token, process.env.SUPABASE_JWT_SECRET as string)
    } catch {
        return reply.status(401).send({ error: 'Unauthorized: invalid or expired token' })
    }
})

app.register(multipart)
app.register(staticFiles, { root: path.join(__dirname, '..', 'public'), prefix: '/' })

app.register(receiptRoutes, { prefix: '/api' })
app.register(paymentRoutes, { prefix: '/api' })

export default app
