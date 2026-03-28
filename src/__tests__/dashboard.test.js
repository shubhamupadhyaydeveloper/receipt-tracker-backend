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
const mockData_1 = require("./helpers/mockData");
const dashboard_1 = __importDefault(require("../routes/dashboard"));
const db_1 = require("../db");
vitest_1.vi.mock('../db', () => ({ db: { query: vitest_1.vi.fn() } }));
const mockQuery = vitest_1.vi.mocked(db_1.db.query);
function mockDashboardQueries() {
    mockQuery
        // this month total + count
        .mockResolvedValueOnce({ rows: [{ total: '12400.50', count: '34' }], rowCount: 1 })
        // last month total
        .mockResolvedValueOnce({ rows: [{ total: '9800.00' }], rowCount: 1 })
        // overall total
        .mockResolvedValueOnce({ rows: [{ total: '84200.00' }], rowCount: 1 })
        // categories
        .mockResolvedValueOnce({
        rows: [{ category: 'Food & Dining', emoji: '🍕', total: '4200.00' }],
        rowCount: 1,
    })
        // recent receipts
        .mockResolvedValueOnce({ rows: [mockData_1.MOCK_RECEIPT_ROW], rowCount: 1 });
}
(0, vitest_1.describe)('GET /api/dashboard', () => {
    (0, vitest_1.it)('returns dashboard data', () => __awaiter(void 0, void 0, void 0, function* () {
        mockDashboardQueries();
        const app = yield (0, buildTestApp_1.buildTestApp)(dashboard_1.default);
        const res = yield app.inject({ method: 'GET', url: '/api/dashboard?month=3&year=2026' });
        (0, vitest_1.expect)(res.statusCode).toBe(200);
        const body = res.json();
        (0, vitest_1.expect)(body.thisMonthTotal).toBe(12400.5);
        (0, vitest_1.expect)(body.lastMonthTotal).toBe(9800);
        (0, vitest_1.expect)(body.overallTotal).toBe(84200);
        (0, vitest_1.expect)(body.thisMonthCount).toBe(34);
        (0, vitest_1.expect)(body.trendDirection).toBe('up');
        (0, vitest_1.expect)(body.trendPercent).toBeGreaterThan(0);
        (0, vitest_1.expect)(body.categories).toHaveLength(1);
        (0, vitest_1.expect)(body.recentReceipts).toHaveLength(1);
    }));
    (0, vitest_1.it)('calculates trendDirection=down correctly', () => __awaiter(void 0, void 0, void 0, function* () {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ total: '5000.00', count: '10' }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ total: '9800.00' }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ total: '50000.00' }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [], rowCount: 0 })
            .mockResolvedValueOnce({ rows: [], rowCount: 0 });
        const app = yield (0, buildTestApp_1.buildTestApp)(dashboard_1.default);
        const res = yield app.inject({ method: 'GET', url: '/api/dashboard?month=3&year=2026' });
        (0, vitest_1.expect)(res.statusCode).toBe(200);
        (0, vitest_1.expect)(res.json().trendDirection).toBe('down');
    }));
    (0, vitest_1.it)('returns 400 when month is missing', () => __awaiter(void 0, void 0, void 0, function* () {
        const app = yield (0, buildTestApp_1.buildTestApp)(dashboard_1.default);
        const res = yield app.inject({ method: 'GET', url: '/api/dashboard?year=2026' });
        (0, vitest_1.expect)(res.statusCode).toBe(400);
    }));
    (0, vitest_1.it)('returns 400 when year is missing', () => __awaiter(void 0, void 0, void 0, function* () {
        const app = yield (0, buildTestApp_1.buildTestApp)(dashboard_1.default);
        const res = yield app.inject({ method: 'GET', url: '/api/dashboard?month=3' });
        (0, vitest_1.expect)(res.statusCode).toBe(400);
    }));
    (0, vitest_1.it)('returns 400 for invalid month value', () => __awaiter(void 0, void 0, void 0, function* () {
        const app = yield (0, buildTestApp_1.buildTestApp)(dashboard_1.default);
        const res = yield app.inject({ method: 'GET', url: '/api/dashboard?month=13&year=2026' });
        (0, vitest_1.expect)(res.statusCode).toBe(400);
    }));
    (0, vitest_1.it)('handles January rollover for last-month calculation', () => __awaiter(void 0, void 0, void 0, function* () {
        mockDashboardQueries();
        const app = yield (0, buildTestApp_1.buildTestApp)(dashboard_1.default);
        // January: last month should be December of previous year
        const res = yield app.inject({ method: 'GET', url: '/api/dashboard?month=1&year=2026' });
        (0, vitest_1.expect)(res.statusCode).toBe(200);
        // Last month query should use month=12, year=2025
        (0, vitest_1.expect)(mockQuery).toHaveBeenCalledWith(vitest_1.expect.any(String), vitest_1.expect.arrayContaining([12, 2025]));
    }));
});
