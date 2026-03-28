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
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const db_1 = require("../db");
const mapReceipt_1 = require("../lib/mapReceipt");
const DashboardQuery = zod_1.z.object({
    month: zod_1.z.coerce.number().int().min(1, 'month must be 1–12').max(12, 'month must be 1–12'),
    year: zod_1.z.coerce.number().int().min(2000, 'invalid year').max(2100, 'invalid year'),
});
const dashboardRoute = (app) => __awaiter(void 0, void 0, void 0, function* () {
    // ─── GET /api/dashboard?month=&year= ────────────────────────────────────────
    app.get('/dashboard', (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const { neonUser } = request;
        if (!neonUser)
            return reply.status(401).send({ error: 'Unauthorized' });
        const parsed = DashboardQuery.safeParse(request.query);
        if (!parsed.success) {
            return reply.status(400).send({ error: parsed.error.issues.map(i => i.message).join('; ') });
        }
        const { month, year } = parsed.data;
        const userId = neonUser.id;
        const lastMonth = month === 1 ? 12 : month - 1;
        const lastYear = month === 1 ? year - 1 : year;
        // Use date-range comparisons so the (user_id, receipt_date) index is used
        const pad = (n) => String(n).padStart(2, '0');
        const start = `${year}-${pad(month)}-01`;
        const end = month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`;
        const lastStart = `${lastYear}-${pad(lastMonth)}-01`;
        const lastEnd = lastMonth === 12 ? `${lastYear + 1}-01-01` : `${lastYear}-${pad(lastMonth + 1)}-01`;
        const [thisMonthRow, lastMonthRow, overallRow, categoriesRows, recentRows] = yield Promise.all([
            db_1.db.query(`SELECT COALESCE(SUM(total_amount), 0) AS total, COUNT(*) AS count
         FROM receipts
         WHERE user_id = $1
           AND receipt_date >= $2
           AND receipt_date < $3`, [userId, start, end]),
            db_1.db.query(`SELECT COALESCE(SUM(total_amount), 0) AS total
         FROM receipts
         WHERE user_id = $1
           AND receipt_date >= $2
           AND receipt_date < $3`, [userId, lastStart, lastEnd]),
            db_1.db.query(`SELECT COALESCE(SUM(total_amount), 0) AS total FROM receipts WHERE user_id = $1`, [userId]),
            db_1.db.query(`SELECT
           category,
           (array_agg(emoji ORDER BY created_at DESC) FILTER (WHERE emoji IS NOT NULL))[1] AS emoji,
           COALESCE(SUM(total_amount), 0) AS total
         FROM receipts
         WHERE user_id = $1
           AND receipt_date >= $2
           AND receipt_date < $3
           AND category IS NOT NULL
         GROUP BY category
         ORDER BY total DESC
         LIMIT 6`, [userId, start, end]),
            db_1.db.query(`SELECT * FROM receipts WHERE user_id = $1 ORDER BY receipt_date DESC, created_at DESC LIMIT 5`, [userId]),
        ]);
        const thisMonthTotal = Number(thisMonthRow.rows[0].total);
        const lastMonthTotal = Number(lastMonthRow.rows[0].total);
        const thisMonthCount = Number(thisMonthRow.rows[0].count);
        const overallTotal = Number(overallRow.rows[0].total);
        let trendPercent = 0;
        let trendDirection = 'same';
        if (lastMonthTotal > 0) {
            trendPercent = Math.abs(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100);
            trendDirection = thisMonthTotal > lastMonthTotal ? 'up' : thisMonthTotal < lastMonthTotal ? 'down' : 'same';
        }
        else if (thisMonthTotal > 0) {
            trendPercent = 100;
            trendDirection = 'up';
        }
        const categorySum = categoriesRows.rows.reduce((s, r) => s + Number(r.total), 0) || 1;
        return {
            thisMonthTotal,
            lastMonthTotal,
            trendPercent: Math.round(trendPercent * 10) / 10,
            trendDirection,
            overallTotal,
            thisMonthCount,
            categories: categoriesRows.rows.map((r) => {
                var _a;
                return ({
                    name: r.category,
                    emoji: (_a = r.emoji) !== null && _a !== void 0 ? _a : null,
                    total: Number(r.total),
                    percent: Math.round((Number(r.total) / categorySum) * 1000) / 10,
                });
            }),
            recentReceipts: recentRows.rows.map(mapReceipt_1.mapReceipt),
        };
    }));
});
exports.default = dashboardRoute;
