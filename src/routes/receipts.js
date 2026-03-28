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
const GetReceiptsQuery = zod_1.z.object({
    month: zod_1.z.coerce.number().int().min(1).max(12).optional(),
    year: zod_1.z.coerce.number().int().min(2000).max(2100).optional(),
    category: zod_1.z.string().max(100).optional(),
    isBusiness: zod_1.z.enum(['true', 'false']).optional(),
    search: zod_1.z.string().max(200).optional(),
    page: zod_1.z.coerce.number().int().min(1).optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(200).optional(),
});
const UpdateReceiptBody = zod_1.z.object({
    vendor: zod_1.z.string().max(200).optional(),
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD').optional(),
    time: zod_1.z.string().optional(),
    category: zod_1.z.string().max(100).optional(),
    emoji: zod_1.z.string().max(10).optional(),
    amount: zod_1.z.number().nonnegative().optional(),
    tax: zod_1.z.number().nonnegative().optional(),
    isBusiness: zod_1.z.boolean().optional(),
    isBillable: zod_1.z.boolean().optional(),
    notes: zod_1.z.string().max(2000).optional(),
    items: zod_1.z.array(zod_1.z.object({ name: zod_1.z.string(), price: zod_1.z.number() })).optional(),
});
const receiptsRoute = (app) => __awaiter(void 0, void 0, void 0, function* () {
    // ─── GET /api/receipts ───────────────────────────────────────────────────────
    app.get('/receipts', (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        const { neonUser } = request;
        if (!neonUser)
            return reply.status(401).send({ error: 'Unauthorized' });
        const parsed = GetReceiptsQuery.safeParse(request.query);
        if (!parsed.success) {
            return reply.status(400).send({ error: parsed.error.issues.map(i => i.message).join('; ') });
        }
        const q = parsed.data;
        const page = (_a = q.page) !== null && _a !== void 0 ? _a : 1;
        const limit = (_b = q.limit) !== null && _b !== void 0 ? _b : 50;
        const offset = (page - 1) * limit;
        const conditions = ['user_id = $1'];
        const params = [neonUser.id];
        let idx = 2;
        if (q.month !== undefined) {
            conditions.push(`EXTRACT(MONTH FROM receipt_date) = $${idx++}`);
            params.push(q.month);
        }
        if (q.year !== undefined) {
            conditions.push(`EXTRACT(YEAR FROM receipt_date) = $${idx++}`);
            params.push(q.year);
        }
        if (q.category) {
            conditions.push(`category = $${idx++}`);
            params.push(q.category);
        }
        if (q.isBusiness !== undefined) {
            conditions.push(`is_business = $${idx++}`);
            params.push(q.isBusiness === 'true');
        }
        if (q.search) {
            conditions.push(`(vendor_name ILIKE $${idx} OR notes ILIKE $${idx})`);
            params.push(`%${q.search}%`);
            idx++;
        }
        const where = conditions.join(' AND ');
        const [countResult, dataResult] = yield Promise.all([
            db_1.db.query(`SELECT COUNT(*) FROM receipts WHERE ${where}`, params),
            db_1.db.query(`SELECT * FROM receipts WHERE ${where} ORDER BY receipt_date DESC, created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`, [...params, limit, offset]),
        ]);
        const total = parseInt(countResult.rows[0].count);
        return {
            receipts: dataResult.rows.map(mapReceipt_1.mapReceipt),
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }));
    // ─── GET /api/receipts/:id ───────────────────────────────────────────────────
    app.get('/receipts/:id', (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const { neonUser } = request;
        if (!neonUser)
            return reply.status(401).send({ error: 'Unauthorized' });
        const { id } = request.params;
        if (!id)
            return reply.status(400).send({ error: 'id is required' });
        const { rows } = yield db_1.db.query(`SELECT * FROM receipts WHERE id = $1 AND user_id = $2`, [id, neonUser.id]);
        if (!rows[0])
            return reply.status(404).send({ error: 'Receipt not found' });
        return { receipt: (0, mapReceipt_1.mapReceipt)(rows[0]) };
    }));
    // ─── PUT /api/receipts/:id ───────────────────────────────────────────────────
    app.put('/receipts/:id', (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const { neonUser } = request;
        if (!neonUser)
            return reply.status(401).send({ error: 'Unauthorized' });
        const parsed = UpdateReceiptBody.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: parsed.error.issues.map(i => i.message).join('; ') });
        }
        const { id } = request.params;
        const body = parsed.data;
        const fieldMap = {
            vendor: 'vendor_name',
            date: 'receipt_date',
            time: 'receipt_time',
            category: 'category',
            emoji: 'emoji',
            amount: 'total_amount',
            tax: 'tax_amount',
            isBusiness: 'is_business',
            isBillable: 'is_billable',
            notes: 'notes',
            items: 'items',
        };
        const sets = [];
        const params = [];
        let idx = 1;
        const bodyRecord = body;
        for (const [key, col] of Object.entries(fieldMap)) {
            if (bodyRecord[key] !== undefined) {
                sets.push(`${col} = $${idx++}`);
                params.push(key === 'items' ? JSON.stringify(bodyRecord[key]) : bodyRecord[key]);
            }
        }
        if (sets.length === 0)
            return reply.status(400).send({ error: 'No fields to update' });
        sets.push(`updated_at = NOW()`);
        params.push(id, neonUser.id);
        const { rows } = yield db_1.db.query(`UPDATE receipts SET ${sets.join(', ')} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`, params);
        if (!rows[0])
            return reply.status(404).send({ error: 'Receipt not found' });
        return { success: true, receipt: (0, mapReceipt_1.mapReceipt)(rows[0]) };
    }));
    // ─── DELETE /api/receipts/:id ────────────────────────────────────────────────
    app.delete('/receipts/:id', (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const { neonUser } = request;
        if (!neonUser)
            return reply.status(401).send({ error: 'Unauthorized' });
        const { id } = request.params;
        const result = yield db_1.db.query(`DELETE FROM receipts WHERE id = $1 AND user_id = $2`, [id, neonUser.id]);
        if (!result.rowCount)
            return reply.status(404).send({ error: 'Receipt not found' });
        return { success: true };
    }));
});
exports.default = receiptsRoute;
