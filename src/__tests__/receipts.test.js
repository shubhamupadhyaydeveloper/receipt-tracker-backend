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
const receipts_1 = __importDefault(require("../routes/receipts"));
const db_1 = require("../db");
vitest_1.vi.mock('../db', () => ({ db: { query: vitest_1.vi.fn() } }));
const mockQuery = vitest_1.vi.mocked(db_1.db.query);
(0, vitest_1.describe)('GET /api/receipts', () => {
    (0, vitest_1.it)('returns paginated receipts', () => __awaiter(void 0, void 0, void 0, function* () {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [mockData_1.MOCK_RECEIPT_ROW, mockData_1.MOCK_RECEIPT_ROW], rowCount: 2 });
        const app = yield (0, buildTestApp_1.buildTestApp)(receipts_1.default);
        const res = yield app.inject({ method: 'GET', url: '/api/receipts' });
        (0, vitest_1.expect)(res.statusCode).toBe(200);
        const body = res.json();
        (0, vitest_1.expect)(body.receipts).toHaveLength(2);
        (0, vitest_1.expect)(body.total).toBe(2);
        (0, vitest_1.expect)(body.page).toBe(1);
        (0, vitest_1.expect)(body.totalPages).toBe(1);
        (0, vitest_1.expect)(body.receipts[0].vendor).toBe('Test Vendor');
    }));
    (0, vitest_1.it)('returns 400 for invalid month', () => __awaiter(void 0, void 0, void 0, function* () {
        const app = yield (0, buildTestApp_1.buildTestApp)(receipts_1.default);
        const res = yield app.inject({ method: 'GET', url: '/api/receipts?month=13' });
        (0, vitest_1.expect)(res.statusCode).toBe(400);
    }));
    (0, vitest_1.it)('filters by search query', () => __awaiter(void 0, void 0, void 0, function* () {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [mockData_1.MOCK_RECEIPT_ROW], rowCount: 1 });
        const app = yield (0, buildTestApp_1.buildTestApp)(receipts_1.default);
        const res = yield app.inject({ method: 'GET', url: '/api/receipts?search=Test' });
        (0, vitest_1.expect)(res.statusCode).toBe(200);
        (0, vitest_1.expect)(mockQuery).toHaveBeenCalledWith(vitest_1.expect.stringContaining('ILIKE'), vitest_1.expect.arrayContaining(['%Test%']));
    }));
});
(0, vitest_1.describe)('GET /api/receipts/:id', () => {
    (0, vitest_1.it)('returns a single receipt', () => __awaiter(void 0, void 0, void 0, function* () {
        mockQuery.mockResolvedValueOnce({ rows: [mockData_1.MOCK_RECEIPT_ROW], rowCount: 1 });
        const app = yield (0, buildTestApp_1.buildTestApp)(receipts_1.default);
        const res = yield app.inject({ method: 'GET', url: '/api/receipts/receipt-uuid-1' });
        (0, vitest_1.expect)(res.statusCode).toBe(200);
        (0, vitest_1.expect)(res.json().receipt.id).toBe('receipt-uuid-1');
    }));
    (0, vitest_1.it)('returns 404 when receipt not found', () => __awaiter(void 0, void 0, void 0, function* () {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        const app = yield (0, buildTestApp_1.buildTestApp)(receipts_1.default);
        const res = yield app.inject({ method: 'GET', url: '/api/receipts/nonexistent-id' });
        (0, vitest_1.expect)(res.statusCode).toBe(404);
        (0, vitest_1.expect)(res.json().error).toBe('Receipt not found');
    }));
});
(0, vitest_1.describe)('PUT /api/receipts/:id', () => {
    (0, vitest_1.it)('updates a receipt', () => __awaiter(void 0, void 0, void 0, function* () {
        const updated = Object.assign(Object.assign({}, mockData_1.MOCK_RECEIPT_ROW), { vendor_name: 'Updated Vendor' });
        mockQuery.mockResolvedValueOnce({ rows: [updated], rowCount: 1 });
        const app = yield (0, buildTestApp_1.buildTestApp)(receipts_1.default);
        const res = yield app.inject({
            method: 'PUT',
            url: '/api/receipts/receipt-uuid-1',
            payload: { vendor: 'Updated Vendor' },
        });
        (0, vitest_1.expect)(res.statusCode).toBe(200);
        (0, vitest_1.expect)(res.json().success).toBe(true);
        (0, vitest_1.expect)(res.json().receipt.vendor).toBe('Updated Vendor');
    }));
    (0, vitest_1.it)('returns 400 when no fields provided', () => __awaiter(void 0, void 0, void 0, function* () {
        const app = yield (0, buildTestApp_1.buildTestApp)(receipts_1.default);
        const res = yield app.inject({
            method: 'PUT',
            url: '/api/receipts/receipt-uuid-1',
            payload: {},
        });
        (0, vitest_1.expect)(res.statusCode).toBe(400);
        (0, vitest_1.expect)(res.json().error).toBe('No fields to update');
    }));
    (0, vitest_1.it)('returns 400 for invalid date format', () => __awaiter(void 0, void 0, void 0, function* () {
        const app = yield (0, buildTestApp_1.buildTestApp)(receipts_1.default);
        const res = yield app.inject({
            method: 'PUT',
            url: '/api/receipts/receipt-uuid-1',
            payload: { date: '15-03-2026' },
        });
        (0, vitest_1.expect)(res.statusCode).toBe(400);
    }));
    (0, vitest_1.it)('returns 404 when receipt not found', () => __awaiter(void 0, void 0, void 0, function* () {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        const app = yield (0, buildTestApp_1.buildTestApp)(receipts_1.default);
        const res = yield app.inject({
            method: 'PUT',
            url: '/api/receipts/nonexistent-id',
            payload: { vendor: 'X' },
        });
        (0, vitest_1.expect)(res.statusCode).toBe(404);
    }));
});
(0, vitest_1.describe)('DELETE /api/receipts/:id', () => {
    (0, vitest_1.it)('deletes a receipt', () => __awaiter(void 0, void 0, void 0, function* () {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
        const app = yield (0, buildTestApp_1.buildTestApp)(receipts_1.default);
        const res = yield app.inject({ method: 'DELETE', url: '/api/receipts/receipt-uuid-1' });
        (0, vitest_1.expect)(res.statusCode).toBe(200);
        (0, vitest_1.expect)(res.json().success).toBe(true);
    }));
    (0, vitest_1.it)('returns 404 when receipt not found', () => __awaiter(void 0, void 0, void 0, function* () {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        const app = yield (0, buildTestApp_1.buildTestApp)(receipts_1.default);
        const res = yield app.inject({ method: 'DELETE', url: '/api/receipts/nonexistent-id' });
        (0, vitest_1.expect)(res.statusCode).toBe(404);
    }));
});
