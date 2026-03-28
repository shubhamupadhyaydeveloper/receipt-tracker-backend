"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatCurrency = formatCurrency;
exports.mapReceipt = mapReceipt;
function formatCurrency(amount, currency = 'INR') {
    const n = Number(amount) || 0;
    const formatted = n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return currency === 'INR' ? `₹${formatted}` : `${currency} ${formatted}`;
}
// Maps a raw DB row to the Receipt shape the frontend expects
function mapReceipt(row) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    return {
        id: row.id,
        vendor: (_a = row.vendor_name) !== null && _a !== void 0 ? _a : null,
        date: row.receipt_date ? new Date(row.receipt_date).toISOString().split('T')[0] : null,
        time: (_b = row.receipt_time) !== null && _b !== void 0 ? _b : null,
        category: (_c = row.category) !== null && _c !== void 0 ? _c : null,
        emoji: (_d = row.emoji) !== null && _d !== void 0 ? _d : null,
        amount: Number(row.total_amount) || 0,
        amountFormatted: formatCurrency(Number(row.total_amount) || 0, row.currency),
        tax: Number(row.tax_amount) || 0,
        taxFormatted: formatCurrency(Number(row.tax_amount) || 0, row.currency),
        isBusiness: (_e = row.is_business) !== null && _e !== void 0 ? _e : false,
        isBillable: (_f = row.is_billable) !== null && _f !== void 0 ? _f : false,
        notes: (_g = row.notes) !== null && _g !== void 0 ? _g : null,
        items: (_h = row.items) !== null && _h !== void 0 ? _h : [],
        receiptImageUrl: (_j = row.image_url) !== null && _j !== void 0 ? _j : null,
    };
}
