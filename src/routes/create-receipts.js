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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sharp_1 = __importDefault(require("sharp"));
const db_1 = require("../db");
const storeImage_1 = require("../lib/storeImage");
const REQUIRED_FIELDS = [
    { key: 'vendorName', type: 'string' },
    { key: 'totalAmount', type: 'number' },
    { key: 'currency', type: 'string' },
    { key: 'category', type: 'string' },
    { key: 'receiptDate', type: 'string' },
];
const createReceiptsRoute = (app) => __awaiter(void 0, void 0, void 0, function* () {
    app.post('/create-receipt', (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, e_1, _b, _c;
        var _d, _e, _f, _g;
        const { neonUser } = request;
        if (!neonUser) {
            return reply.status(401).send({ error: 'User not found' });
        }
        // Parse multipart — image file + receipt JSON sent as field 'data'
        const parts = request.parts();
        let imageBuffer = null;
        let receiptData = null;
        try {
            for (var _h = true, parts_1 = __asyncValues(parts), parts_1_1; parts_1_1 = yield parts_1.next(), _a = parts_1_1.done, !_a; _h = true) {
                _c = parts_1_1.value;
                _h = false;
                const part = _c;
                if (part.type === 'file') {
                    imageBuffer = yield part.toBuffer();
                }
                else if (part.fieldname === 'data') {
                    try {
                        receiptData = JSON.parse(part.value);
                    }
                    catch (_j) {
                        return reply.status(400).send({ error: "'data' field must be valid JSON" });
                    }
                }
                else {
                    // Support individual fields like vendorName, totalAmount, etc.
                    receiptData = receiptData !== null && receiptData !== void 0 ? receiptData : {};
                    // multipart values are always strings; REQUIRED_FIELDS loop validates types below
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    receiptData[part.fieldname] = part.value;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_h && !_a && (_b = parts_1.return)) yield _b.call(parts_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (!receiptData) {
            return reply.status(400).send({ error: "'data' field is required" });
        }
        for (const { key, type } of REQUIRED_FIELDS) {
            const value = receiptData[key];
            if (value === undefined || value === null || value === '') {
                return reply.status(400).send({ error: `'${key}' is required` });
            }
            if (typeof value !== type) {
                return reply.status(400).send({ error: `'${key}' must be a ${type}` });
            }
        }
        const data = receiptData;
        // Upload image to ImageKit → get public URL
        let image_url = null;
        let image_path = null;
        if (imageBuffer) {
            try {
                const compressed = yield (0, sharp_1.default)(imageBuffer)
                    .resize({ width: 800, withoutEnlargement: true })
                    .jpeg({ quality: 60, progressive: true })
                    .toBuffer();
                const stored = yield (0, storeImage_1.storeImage)(compressed, `receipt_${Date.now()}.jpg`);
                image_url = stored.url;
                image_path = stored.filePath;
            }
            catch (err) {
                request.log.error({ err }, 'ImageKit upload failed');
                return reply.status(502).send({ error: 'Image upload failed. Please try again or submit without an image.' });
            }
        }
        // Insert receipt and increment usage counter in parallel — both only need neonUser.id
        const [insertResult] = yield Promise.all([
            db_1.db.query(`
                INSERT INTO receipts (
                    user_id, vendor_name, total_amount, tax_amount,
                    currency, receipt_date, category, notes,
                    is_gst_bill, gst_number, image_url, image_path
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
                RETURNING *
            `, [
                neonUser.id,
                data.vendorName,
                data.totalAmount,
                (_d = data.taxAmount) !== null && _d !== void 0 ? _d : null,
                data.currency,
                data.receiptDate,
                data.category,
                (_e = data.notes) !== null && _e !== void 0 ? _e : null,
                (_f = data.isGstBill) !== null && _f !== void 0 ? _f : false,
                (_g = data.gstNumber) !== null && _g !== void 0 ? _g : null,
                image_url,
                image_path,
            ]),
            db_1.db.query(`UPDATE user_profiles SET receipts_scanned_this_month = receipts_scanned_this_month + 1 WHERE id = $1`, [neonUser.id]),
        ]);
        return reply.status(201).send({ receipt: insertResult.rows[0] });
    }));
});
exports.default = createReceiptsRoute;
