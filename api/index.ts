import 'dotenv/config';
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import receiptRoutes from '../src/routes/receipt-scan';
import { IncomingMessage, ServerResponse } from 'http';

const app = Fastify({ logger: false });

app.register(multipart);
app.register(receiptRoutes, { prefix: '/api' });

app.get('/', async (_req, _res) => {
    return { hello: 'hello world' };
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
    await app.ready();
    app.server.emit('request', req, res);
}
