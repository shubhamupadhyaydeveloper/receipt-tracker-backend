import 'dotenv/config';
import fastify from "fastify";
import multipart from "@fastify/multipart";
import receiptRoutes from "./routes/receipt-scan";

const app = fastify({logger : false})

// plugins
app.register(multipart)
app.register(receiptRoutes, { prefix: '/api' })

app.listen({port : 3001,host : "0.0.0.0"},(err, address) => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    console.log(`Server listening at ${address}`)
})

app.get('/', async (request, reply) => {
    return { hello: 'hello world' }
})



