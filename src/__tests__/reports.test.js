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
const reports_1 = __importDefault(require("../routes/reports"));
const db_1 = require("../db");
vitest_1.vi.mock('../db', () => ({ db: { query: vitest_1.vi.fn() } }));
const mockQuery = vitest_1.vi.mocked(db_1.db.query);
// ─── GET /api/reports/summary ─────────────────────────────────────────────────
(0, vitest_1.describe)('GET /api/reports/summary', () => {
    (0, vitest_1.it)('returns summary for view=all', () => __awaiter(void 0, void 0, void 0, function* () {
        mockQuery
            .mockResolvedValueOnce({
            rows: [{
                    total_spent: '12400.50',
                    business_total: '8200.00',
                    personal_total: '4200.50',
                    receipt_count: '34',
                    avg_per_receipt: '364.72',
                    billable_amount: '5400.00',
                    billable_count: '12',
                }],
            rowCount: 1,
        })
            .mockResolvedValueOnce({
            rows: [{ category: 'Food & Dining', emoji: '🍕', total: '4200.00', count: '12' }],
            rowCount: 1,
        });
        const app = yield (0, buildTestApp_1.buildTestApp)(reports_1.default);
        const res = yield app.inject({ method: 'GET', url: '/api/reports/summary?view=all' });
        (0, vitest_1.expect)(res.statusCode).toBe(200);
        const body = res.json();
        (0, vitest_1.expect)(body.totalSpent).toBe(12400.5);
        (0, vitest_1.expect)(body.businessTotal).toBe(8200);
        (0, vitest_1.expect)(body.receiptCount).toBe(34);
        (0, vitest_1.expect)(body.billableCount).toBe(12);
        (0, vitest_1.expect)(body.categories).toHaveLength(1);
        (0, vitest_1.expect)(body.categories[0].percent).toBeGreaterThan(0);
    }));
    (0, vitest_1.it)('returns 400 when view is missing', () => __awaiter(void 0, void 0, void 0, function* () {
        const app = yield (0, buildTestApp_1.buildTestApp)(reports_1.default);
        const res = yield app.inject({ method: 'GET', url: '/api/reports/summary' });
        (0, vitest_1.expect)(res.statusCode).toBe(400);
    }));
    (0, vitest_1.it)('returns 400 for view=month without month param', () => __awaiter(void 0, void 0, void 0, function* () {
        const app = yield (0, buildTestApp_1.buildTestApp)(reports_1.default);
        const res = yield app.inject({ method: 'GET', url: '/api/reports/summary?view=month&year=2026' });
        (0, vitest_1.expect)(res.statusCode).toBe(400);
        (0, vitest_1.expect)(res.json().error).toContain('month and year are required');
    }));
    (0, vitest_1.it)('returns 400 for view=year without year param', () => __awaiter(void 0, void 0, void 0, function* () {
        const app = yield (0, buildTestApp_1.buildTestApp)(reports_1.default);
        const res = yield app.inject({ method: 'GET', url: '/api/reports/summary?view=year' });
        (0, vitest_1.expect)(res.statusCode).toBe(400);
        (0, vitest_1.expect)(res.json().error).toContain('year is required');
    }));
});
// ─── GET /api/reports/monthly-trend ──────────────────────────────────────────
(0, vitest_1.describe)('GET /api/reports/monthly-trend', () => {
    (0, vitest_1.it)('returns all 12 months including zeroes', () => __awaiter(void 0, void 0, void 0, function* () {
        // Only March and June have data
        mockQuery.mockResolvedValueOnce({
            rows: [{ month: 3, total: '9100.00' }, { month: 6, total: '4500.00' }],
            rowCount: 2,
        });
        const app = yield (0, buildTestApp_1.buildTestApp)(reports_1.default);
        const res = yield app.inject({ method: 'GET', url: '/api/reports/monthly-trend?year=2026' });
        (0, vitest_1.expect)(res.statusCode).toBe(200);
        const { months } = res.json();
        (0, vitest_1.expect)(months).toHaveLength(12);
        (0, vitest_1.expect)(months[0].label).toBe('Jan');
        (0, vitest_1.expect)(months[0].total).toBe(0);
        (0, vitest_1.expect)(months[2].total).toBe(9100); // March
        (0, vitest_1.expect)(months[5].total).toBe(4500); // June
        (0, vitest_1.expect)(months[11].label).toBe('Dec');
    }));
    (0, vitest_1.it)('returns 400 when year is missing', () => __awaiter(void 0, void 0, void 0, function* () {
        const app = yield (0, buildTestApp_1.buildTestApp)(reports_1.default);
        const res = yield app.inject({ method: 'GET', url: '/api/reports/monthly-trend' });
        (0, vitest_1.expect)(res.statusCode).toBe(400);
    }));
});
// ─── GET /api/reports/gst ────────────────────────────────────────────────────
(0, vitest_1.describe)('GET /api/reports/gst', () => {
    (0, vitest_1.it)('returns GST breakdown', () => __awaiter(void 0, void 0, void 0, function* () {
        mockQuery.mockResolvedValueOnce({
            rows: [{
                    category: 'Food & Dining',
                    emoji: '🍕',
                    base_amount: '3780.00',
                    tax_total: '420.00',
                }],
            rowCount: 1,
        });
        const app = yield (0, buildTestApp_1.buildTestApp)(reports_1.default);
        const res = yield app.inject({ method: 'GET', url: '/api/reports/gst?view=all' });
        (0, vitest_1.expect)(res.statusCode).toBe(200);
        const body = res.json();
        (0, vitest_1.expect)(body.totalTax).toBe(420);
        (0, vitest_1.expect)(body.items).toHaveLength(1);
        (0, vitest_1.expect)(body.items[0].gstRate).toBe(11); // 420/3780 * 100 ≈ 11
    }));
    (0, vitest_1.it)('returns 400 when view is missing', () => __awaiter(void 0, void 0, void 0, function* () {
        const app = yield (0, buildTestApp_1.buildTestApp)(reports_1.default);
        const res = yield app.inject({ method: 'GET', url: '/api/reports/gst' });
        (0, vitest_1.expect)(res.statusCode).toBe(400);
    }));
});
