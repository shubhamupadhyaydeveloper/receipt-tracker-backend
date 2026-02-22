import { FastifyInstance } from 'fastify';
// import Razorpay from 'razorpay';
// import crypto from 'crypto';

// const plans = {
//     monthly: { amount: 29900, currency: 'INR', description: 'Monthly Plan' },
//     yearly:  { amount: 249900, currency: 'INR', description: 'Yearly Plan' },
// }

const paymentRoutes = async (fastify: FastifyInstance) => {
    // const razorpay = new Razorpay({
    //     key_id: process.env.RAZORPAY_KEY_ID as string,
    //     key_secret: process.env.RAZORPAY_KEY_SECRET as string,
    // });

    // fastify.post<{ Body: { plan: 'monthly' | 'yearly' } }>('/payment/create-order', async (request, reply) => {
    //     const { plan } = request.body;

    //     if (!plans[plan]) {
    //         return reply.status(400).send({ error: 'Invalid plan. Choose monthly or yearly.' });
    //     }

    //     const order = await razorpay.orders.create({
    //         amount: plans[plan].amount,
    //         currency: plans[plan].currency,
    //         receipt: `receipt_${Date.now()}`,
    //     });

    //     return reply.send({
    //         orderId: order.id,
    //         amount: order.amount,
    //         currency: order.currency,
    //         keyId: process.env.RAZORPAY_KEY_ID,
    //     });
    // });

    // fastify.post<{ Body: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string } }>(
    //     '/payment/verify',
    //     async (request, reply) => {
    //         const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = request.body;

    //         const generated_signature = crypto
    //             .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
    //             .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    //             .digest('hex');

    //         if (generated_signature !== razorpay_signature) {
    //             return reply.status(400).send({ success: false, error: 'Payment verification failed' });
    //         }

    //         return reply.send({ success: true, paymentId: razorpay_payment_id });
    //     }
    // );

    fastify.get('/payment/status', async (_req, reply) => {
        return reply.send({ status: 'Payment routes coming soon' });
    });
}

export default paymentRoutes;
