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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const path_1 = __importDefault(require("path"));
const fastify_1 = __importDefault(require("fastify"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const static_1 = __importDefault(require("@fastify/static"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const cors_1 = __importDefault(require("@fastify/cors"));
const receipt_scan_1 = __importDefault(require("./routes/receipt-scan"));
const payment_1 = __importDefault(require("./routes/payment"));
const supabase_1 = require("./supabase");
const db_1 = require("./db");
const auth_1 = __importDefault(require("./routes/auth"));
const create_receipts_1 = __importDefault(require("./routes/create-receipts"));
const receipts_1 = __importDefault(require("./routes/receipts"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const reports_1 = __importDefault(require("./routes/reports"));
const export_1 = __importDefault(require("./routes/export"));
const user_1 = __importDefault(require("./routes/user"));
// In-memory cache for user profile lookups — avoids a DB round-trip on every request
const userCache = new Map();
const USER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const isProd = process.env.NODE_ENV === 'production';
const app = (0, fastify_1.default)({
    logger: { level: isProd ? 'warn' : 'info' },
});
app.register(cors_1.default, {
    origin: (_a = process.env.CORS_ORIGIN) !== null && _a !== void 0 ? _a : true, // set CORS_ORIGIN=https://yourdomain.com in prod
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});
app.register(rate_limit_1.default, {
    max: 30,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
        error: 'Too many requests. Please slow down.',
    }),
});
// Session-based payment routes do their own auth — skip Supabase middleware for these
const AUTH_EXEMPT_PATHS = new Set([
    '/api/payment/create-order-session',
    '/api/payment/verify-session',
]);
app.addHook('preHandler', (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Skip auth for static files and health check — only protect /api routes
    if (!request.url.startsWith('/api'))
        return;
    // Skip for session-based routes (they validate sessionId internally)
    const urlPath = request.url.split('?')[0];
    if (AUTH_EXEMPT_PATHS.has(urlPath))
        return;
    try {
        const token = (_a = request.headers.authorization) === null || _a === void 0 ? void 0 : _a.split('Bearer ')[1];
        if (!token)
            return reply.status(401).send({ error: 'Unauthorized' });
        // Verify Supabase token
        const { data: { user }, error: authError } = yield supabase_1.supabase.auth.getUser(token);
        if (authError || !user)
            return reply.status(401).send({ error: 'Unauthorized' });
        // Get Neon user — serve from cache to avoid a DB call on every request
        const cached = userCache.get(user.id);
        let neonUser;
        if (cached && cached.exp > Date.now()) {
            neonUser = cached.user;
        }
        else {
            const { rows } = yield db_1.db.query(`SELECT id, supabase_uid, full_name, email, avatar_url, plan,
                plan_started_at, plan_expires_at, razorpay_subscription_id,
                razorpay_customer_id, receipts_scanned_this_month,
                last_usage_reset_at, currency, user_type, monthly_budget,
                language, selected_categories, created_at, updated_at
         FROM user_profiles WHERE supabase_uid = $1`, [user.id]);
            neonUser = rows[0] || null;
            if (neonUser)
                userCache.set(user.id, { user: neonUser, exp: Date.now() + USER_CACHE_TTL });
        }
        // Attach to request — available in every route
        request.supabaseUser = user;
        request.neonUser = neonUser;
    }
    catch (error) {
        request.log.warn({ err: error }, 'Supabase token verification failed');
        return reply.status(401).send({ error: 'Invalid token' });
    }
}));
app.register(multipart_1.default);
if (!process.env.VERCEL) {
    app.register(static_1.default, { root: path_1.default.join(__dirname, '..', 'public'), prefix: '/' });
}
app.register(receipt_scan_1.default, { prefix: '/api' });
app.register(payment_1.default, { prefix: '/api' });
app.register(auth_1.default, { prefix: '/api' });
app.register(create_receipts_1.default, { prefix: '/api' });
app.register(receipts_1.default, { prefix: '/api' });
app.register(dashboard_1.default, { prefix: '/api' });
app.register(reports_1.default, { prefix: '/api' });
app.register(export_1.default, { prefix: '/api' });
app.register(user_1.default, { prefix: '/api' });
// Serve the pricing/payment page at /payment — Chrome redirect lands here
// On Vercel this is handled by vercel.json rewrite; reply.sendFile works locally
app.get('/payment', (_request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    return reply.sendFile('index.html');
}));
app.get('/health', (_request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield db_1.db.query('SELECT 1');
        return { status: 'ok', db: 'ok' };
    }
    catch (_a) {
        return reply.status(503).send({ status: 'error', db: 'down' });
    }
}));
exports.default = app;
