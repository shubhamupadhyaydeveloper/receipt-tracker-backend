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
const export_1 = __importDefault(require("../routes/export"));
const db_1 = require("../db");
vitest_1.vi.mock('../db', () => ({ db: { query: vitest_1.vi.fn() } }));
vitest_1.vi.mock('imagekit', () => {
    return {
        default: class {
            constructor() {
                this.upload = vitest_1.vi.fn().mockResolvedValue({ filePath: '/exports/BillSnap_test.csv', url: 'https://ik.test/test.csv' });
                this.url = vitest_1.vi.fn().mockReturnValue('https://ik.test/signed/BillSnap_test.csv');
            }
        },
    };
});
const mockQuery = vitest_1.vi.mocked(db_1.db.query);
const MOCK_ROWS = [
    {
        receipt_date: new Date('2026-03-10'),
        vendor_name: 'Swiggy',
        category: 'Food & Dining',
        total_amount: '450.00',
        tax_amount: '45.00',
        is_business: false,
        is_billable: false,
        notes: '',
    },
];
(0, vitest_1.describe)('POST /api/export', () => {
    (0, vitest_1.it)('exports CSV for this_month period', () => __awaiter(void 0, void 0, void 0, function* () {
        mockQuery.mockResolvedValueOnce({ rows: MOCK_ROWS, rowCount: 1 });
        const app = yield (0, buildTestApp_1.buildTestApp)(export_1.default);
        const res = yield app.inject({
            method: 'POST',
            url: '/api/export',
            payload: { format: 'csv', period: 'this_month', month: 3, year: 2026 },
        });
        (0, vitest_1.expect)(res.statusCode).toBe(200);
        const body = res.json();
        (0, vitest_1.expect)(body.success).toBe(true);
        (0, vitest_1.expect)(body.fileUrl).toBeTruthy();
        (0, vitest_1.expect)(body.fileName).toMatch(/\.csv$/);
        (0, vitest_1.expect)(body.expiresAt).toBeTruthy();
    }));
    (0, vitest_1.it)('exports with excel format (returns xlsx filename)', () => __awaiter(void 0, void 0, void 0, function* () {
        mockQuery.mockResolvedValueOnce({ rows: MOCK_ROWS, rowCount: 1 });
        const app = yield (0, buildTestApp_1.buildTestApp)(export_1.default);
        const res = yield app.inject({
            method: 'POST',
            url: '/api/export',
            payload: { format: 'excel', period: 'this_year', year: 2026 },
        });
        (0, vitest_1.expect)(res.statusCode).toBe(200);
        (0, vitest_1.expect)(res.json().fileName).toMatch(/\.xlsx$/);
    }));
    (0, vitest_1.it)('returns 422 for PDF format', () => __awaiter(void 0, void 0, void 0, function* () {
        const app = yield (0, buildTestApp_1.buildTestApp)(export_1.default);
        const res = yield app.inject({
            method: 'POST',
            url: '/api/export',
            payload: { format: 'pdf', period: 'this_month' },
        });
        (0, vitest_1.expect)(res.statusCode).toBe(422);
    }));
    (0, vitest_1.it)('returns 400 when format is missing', () => __awaiter(void 0, void 0, void 0, function* () {
        const app = yield (0, buildTestApp_1.buildTestApp)(export_1.default);
        const res = yield app.inject({
            method: 'POST',
            url: '/api/export',
            payload: { period: 'this_month' },
        });
        (0, vitest_1.expect)(res.statusCode).toBe(400);
    }));
    (0, vitest_1.it)('returns 400 when period is missing', () => __awaiter(void 0, void 0, void 0, function* () {
        const app = yield (0, buildTestApp_1.buildTestApp)(export_1.default);
        const res = yield app.inject({
            method: 'POST',
            url: '/api/export',
            payload: { format: 'csv' },
        });
        (0, vitest_1.expect)(res.statusCode).toBe(400);
    }));
    (0, vitest_1.it)('returns 400 for custom period without dateFrom/dateTo', () => __awaiter(void 0, void 0, void 0, function* () {
        const app = yield (0, buildTestApp_1.buildTestApp)(export_1.default);
        const res = yield app.inject({
            method: 'POST',
            url: '/api/export',
            payload: { format: 'csv', period: 'custom' },
        });
        (0, vitest_1.expect)(res.statusCode).toBe(400);
        (0, vitest_1.expect)(res.json().error).toContain('dateFrom and dateTo');
    }));
    (0, vitest_1.it)('filters by isBusiness when provided', () => __awaiter(void 0, void 0, void 0, function* () {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        const app = yield (0, buildTestApp_1.buildTestApp)(export_1.default);
        yield app.inject({
            method: 'POST',
            url: '/api/export',
            payload: { format: 'csv', period: 'this_year', year: 2026, isBusiness: true },
        });
        (0, vitest_1.expect)(mockQuery).toHaveBeenCalledWith(vitest_1.expect.stringContaining('is_business'), vitest_1.expect.arrayContaining([true]));
    }));
});
