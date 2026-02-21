import 'dotenv/config';
import fastify from "fastify";
import multipart from "@fastify/multipart";
import receiptRoutes from "./routes/receipt-scan";

const app = fastify({ logger: false })

app.register(multipart)
app.register(receiptRoutes, { prefix: '/api' })

app.get('/', async (_req, _res) => {
    return { hello: 'HI server health is good' }
})

export default app
