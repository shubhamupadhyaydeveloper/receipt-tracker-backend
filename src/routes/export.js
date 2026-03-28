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
const zod_1 = require("zod");
const imagekit_1 = __importDefault(require("imagekit"));
const db_1 = require("../db");
const imagekit = new imagekit_1.default({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});
const ExportBody = zod_1.z.object({
    format: zod_1.z.enum(['excel', 'csv', 'pdf']),
    period: zod_1.z.enum(['this_month', 'last_month', 'this_year', 'custom']),
    month: zod_1.z.number().int().min(1).max(12).optional(),
    year: zod_1.z.number().int().min(2000).max(2100).optional(),
    dateFrom: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateFrom must be YYYY-MM-DD').optional(),
    dateTo: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateTo must be YYYY-MM-DD').optional(),
    isBusiness: zod_1.z.boolean().optional(),
    groupByCategory: zod_1.z.boolean().optional(),
    includeImages: zod_1.z.boolean().optional(),
});
function resolveDateRange(body) {
    const { period, month, year, dateFrom, dateTo } = body;
    if (period === 'custom') {
        if (!dateFrom || !dateTo)
            throw new Error('dateFrom and dateTo are required for custom period');
        return { from: dateFrom, to: dateTo };
    }
    const now = new Date();
    const y = year || now.getFullYear();
    const m = month || (now.getMonth() + 1);
    const pad = (n) => String(n).padStart(2, '0');
    if (period === 'this_month') {
        const lastDay = new Date(y, m, 0).getDate();
        return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${lastDay}` };
    }
    if (period === 'last_month') {
        const lm = m === 1 ? 12 : m - 1;
        const ly = m === 1 ? y - 1 : y;
        const lastDay = new Date(ly, lm, 0).getDate();
        return { from: `${ly}-${pad(lm)}-01`, to: `${ly}-${pad(lm)}-${lastDay}` };
    }
    // this_year
    return { from: `${y}-01-01`, to: `${y}-12-31` };
}
function buildCsv(rows, groupByCategory) {
    const headers = ['Date', 'Vendor', 'Category', 'Amount', 'Tax', 'Business', 'Billable', 'Notes'];
    const escape = (v) => `"${String(v !== null && v !== void 0 ? v : '').replace(/"/g, '""')}"`;
    const toRow = (r) => {
        var _a, _b, _c, _d, _e;
        return [
            r.receipt_date ? new Date(r.receipt_date).toISOString().split('T')[0] : '',
            (_a = r.vendor_name) !== null && _a !== void 0 ? _a : '',
            (_b = r.category) !== null && _b !== void 0 ? _b : '',
            (_c = r.total_amount) !== null && _c !== void 0 ? _c : 0,
            (_d = r.tax_amount) !== null && _d !== void 0 ? _d : 0,
            r.is_business ? 'Yes' : 'No',
            r.is_billable ? 'Yes' : 'No',
            (_e = r.notes) !== null && _e !== void 0 ? _e : '',
        ].map(escape).join(',');
    };
    const sorted = groupByCategory
        ? [...rows].sort((a, b) => { var _a, _b; return ((_a = a.category) !== null && _a !== void 0 ? _a : '').localeCompare((_b = b.category) !== null && _b !== void 0 ? _b : ''); })
        : rows;
    return [headers.join(','), ...sorted.map(toRow)].join('\n');
}
const exportRoute = (app) => __awaiter(void 0, void 0, void 0, function* () {
    // ─── POST /api/export ────────────────────────────────────────────────────────
    app.post('/export', (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const { neonUser } = request;
        if (!neonUser)
            return reply.status(401).send({ error: 'Unauthorized' });
        const parsed = ExportBody.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: parsed.error.issues.map(i => i.message).join('; ') });
        }
        const body = parsed.data;
        if (body.format === 'pdf') {
            return reply.status(422).send({ error: 'PDF export is not yet supported' });
        }
        let dateRange;
        try {
            dateRange = resolveDateRange(body);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Invalid date range';
            return reply.status(400).send({ error: message });
        }
        const conditions = ['user_id = $1', 'receipt_date >= $2', 'receipt_date <= $3'];
        const params = [neonUser.id, dateRange.from, dateRange.to];
        if (body.isBusiness === true) {
            conditions.push(`is_business = $${params.length + 1}`);
            params.push(true);
        }
        const EXPORT_LIMIT = 5000;
        const { rows } = yield db_1.db.query(`SELECT * FROM receipts WHERE ${conditions.join(' AND ')} ORDER BY receipt_date ASC LIMIT ${EXPORT_LIMIT + 1}`, params);
        const truncated = rows.length > EXPORT_LIMIT;
        const exportRows = truncated ? rows.slice(0, EXPORT_LIMIT) : rows;
        const csvContent = buildCsv(exportRows, (_a = body.groupByCategory) !== null && _a !== void 0 ? _a : false);
        const fileBuffer = Buffer.from(csvContent, 'utf-8');
        const label = body.period === 'custom' ? `${dateRange.from}_to_${dateRange.to}` : body.period.replace(/_/g, '-');
        const ext = body.format === 'excel' ? 'xlsx' : 'csv';
        const fileName = `BillSnap_${label}.${ext}`;
        try {
            const uploadResult = yield imagekit.upload({ file: fileBuffer, fileName, folder: '/exports' });
            const fileUrl = imagekit.url({ path: uploadResult.filePath, signed: true, expireSeconds: 3600 });
            const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
            if (truncated)
                reply.header('X-Export-Truncated', 'true');
            return { success: true, fileUrl, fileName, expiresAt };
        }
        catch (err) {
            request.log.error({ err }, 'ImageKit export upload failed');
            return reply.status(502).send({ error: 'Export upload failed. Please try again.' });
        }
    }));
});
exports.default = exportRoute;
