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
const vitest_1 = require("vitest");
const buildTestApp_1 = require("./helpers/buildTestApp");
const user_1 = __importDefault(require("../routes/user"));
const db_1 = require("../db");
vitest_1.vi.mock('../db', () => ({ db: { query: vitest_1.vi.fn() } }));
const mockQuery = vitest_1.vi.mocked(db_1.db.query);
const MOCK_PROFILE_ROW = {
    id: 'user-uuid-123',
    full_name: 'Test User',
    email: 'test@example.com',
    avatar_url: 'https://example.com/avatar.jpg',
    currency: 'INR',
    user_type: 'Freelancer',
    monthly_budget: '50000.00',
    plan: 'free',
    language: 'en',
    selected_categories: ['Food & Dining', 'Travel'],
};
(0, vitest_1.describe)('GET /api/user/profile', () => {
    (0, vitest_1.it)('returns user profile', () => __awaiter(void 0, void 0, void 0, function* () {
        mockQuery.mockResolvedValueOnce({ rows: [MOCK_PROFILE_ROW], rowCount: 1 });
        const app = yield (0, buildTestApp_1.buildTestApp)(user_1.default);
        const res = yield app.inject({ method: 'GET', url: '/api/user/profile' });
        (0, vitest_1.expect)(res.statusCode).toBe(200);
        const body = res.json();
        (0, vitest_1.expect)(body.name).toBe('Test User');
        (0, vitest_1.expect)(body.email).toBe('test@example.com');
        (0, vitest_1.expect)(body.currency).toBe('INR');
        (0, vitest_1.expect)(body.userType).toBe('Freelancer');
        (0, vitest_1.expect)(body.monthlyBudget).toBe(50000);
        (0, vitest_1.expect)(body.isPremium).toBe(false);
        (0, vitest_1.expect)(body.premiumPlan).toBeNull();
        (0, vitest_1.expect)(body.selectedCategories).toEqual(['Food & Dining', 'Travel']);
    }));
    (0, vitest_1.it)('returns isPremium=true for pro plan', () => __awaiter(void 0, void 0, void 0, function* () {
        mockQuery.mockResolvedValueOnce({
            rows: [Object.assign(Object.assign({}, MOCK_PROFILE_ROW), { plan: 'pro' })],
            rowCount: 1,
        });
        const app = yield (0, buildTestApp_1.buildTestApp)(user_1.default);
        const res = yield app.inject({ method: 'GET', url: '/api/user/profile' });
        (0, vitest_1.expect)(res.statusCode).toBe(200);
        (0, vitest_1.expect)(res.json().isPremium).toBe(true);
        (0, vitest_1.expect)(res.json().premiumPlan).toBe('pro');
    }));
    (0, vitest_1.it)('returns 404 when profile not found', () => __awaiter(void 0, void 0, void 0, function* () {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        const app = yield (0, buildTestApp_1.buildTestApp)(user_1.default);
        const res = yield app.inject({ method: 'GET', url: '/api/user/profile' });
        (0, vitest_1.expect)(res.statusCode).toBe(404);
    }));
});
(0, vitest_1.describe)('PUT /api/user/profile', () => {
    (0, vitest_1.it)('updates profile fields', () => __awaiter(void 0, void 0, void 0, function* () {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
        const app = yield (0, buildTestApp_1.buildTestApp)(user_1.default);
        const res = yield app.inject({
            method: 'PUT',
            url: '/api/user/profile',
            payload: { name: 'New Name', currency: 'USD', language: 'hi' },
        });
        (0, vitest_1.expect)(res.statusCode).toBe(200);
        (0, vitest_1.expect)(res.json().success).toBe(true);
        (0, vitest_1.expect)(mockQuery).toHaveBeenCalledWith(vitest_1.expect.stringContaining('UPDATE user_profiles'), vitest_1.expect.arrayContaining(['New Name', 'USD', 'hi']));
    }));
    (0, vitest_1.it)('returns 400 when no fields provided', () => __awaiter(void 0, void 0, void 0, function* () {
        const app = yield (0, buildTestApp_1.buildTestApp)(user_1.default);
        const res = yield app.inject({
            method: 'PUT',
            url: '/api/user/profile',
            payload: {},
        });
        (0, vitest_1.expect)(res.statusCode).toBe(400);
        (0, vitest_1.expect)(res.json().error).toBe('No fields to update');
    }));
    (0, vitest_1.it)('returns 400 for invalid currency (not 3 chars)', () => __awaiter(void 0, void 0, void 0, function* () {
        const app = yield (0, buildTestApp_1.buildTestApp)(user_1.default);
        const res = yield app.inject({
            method: 'PUT',
            url: '/api/user/profile',
            payload: { currency: 'RUPEE' },
        });
        (0, vitest_1.expect)(res.statusCode).toBe(400);
    }));
    (0, vitest_1.it)('returns 400 for invalid photoUrl', () => __awaiter(void 0, void 0, void 0, function* () {
        const app = yield (0, buildTestApp_1.buildTestApp)(user_1.default);
        const res = yield app.inject({
            method: 'PUT',
            url: '/api/user/profile',
            payload: { photoUrl: 'not-a-url' },
        });
        (0, vitest_1.expect)(res.statusCode).toBe(400);
    }));
});
