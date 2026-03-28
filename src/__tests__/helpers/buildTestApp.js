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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOCK_USER = void 0;
exports.buildTestApp = buildTestApp;
const fastify_1 = __importDefault(require("fastify"));
exports.MOCK_USER = {
    id: 'user-uuid-123',
    supabase_uid: 'supabase-uid-123',
    plan: 'free',
    full_name: 'Test User',
    email: 'test@example.com',
    avatar_url: null,
    plan_started_at: null,
    plan_expires_at: null,
    razorpay_subscription_id: null,
    razorpay_customer_id: null,
    receipts_scanned_this_month: 0,
    last_usage_reset_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
};
function buildTestApp(plugin) {
    return __awaiter(this, void 0, void 0, function* () {
        const app = (0, fastify_1.default)({ logger: false });
        // Bypass Supabase auth — attach mock user directly
        app.addHook('preHandler', (request) => __awaiter(this, void 0, void 0, function* () {
            request.neonUser = exports.MOCK_USER;
            request.supabaseUser = { id: exports.MOCK_USER.supabase_uid };
        }));
        app.register(plugin, { prefix: '/api' });
        yield app.ready();
        return app;
    });
}
