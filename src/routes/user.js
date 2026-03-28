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
const UpdateProfileBody = zod_1.z.object({
    name: zod_1.z.string().max(200).optional(),
    photoUrl: zod_1.z.string().url('photoUrl must be a valid URL').optional(),
    currency: zod_1.z.string().length(3, 'currency must be a 3-letter code').optional(),
    userType: zod_1.z.string().max(100).optional(),
    monthlyBudget: zod_1.z.number().nonnegative().optional(),
    language: zod_1.z.string().max(10).optional(),
    selectedCategories: zod_1.z.array(zod_1.z.string().max(100)).max(50).optional(),
});
const userRoute = (app) => __awaiter(void 0, void 0, void 0, function* () {
    // ─── GET /api/user/profile ───────────────────────────────────────────────────
    app.get('/user/profile', (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g;
        const { neonUser } = request;
        if (!neonUser)
            return reply.status(401).send({ error: 'Unauthorized' });
        const { rows } = yield db_1.db.query(`SELECT * FROM user_profiles WHERE id = $1`, [neonUser.id]);
        if (!rows[0])
            return reply.status(404).send({ error: 'Profile not found' });
        const u = rows[0];
        return {
            name: (_a = u.full_name) !== null && _a !== void 0 ? _a : null,
            email: (_b = u.email) !== null && _b !== void 0 ? _b : null,
            photoUrl: (_c = u.avatar_url) !== null && _c !== void 0 ? _c : null,
            currency: (_d = u.currency) !== null && _d !== void 0 ? _d : 'INR',
            userType: (_e = u.user_type) !== null && _e !== void 0 ? _e : null,
            monthlyBudget: u.monthly_budget ? Number(u.monthly_budget) : null,
            isPremium: u.plan === 'pro',
            premiumPlan: u.plan === 'pro' ? u.plan : null,
            language: (_f = u.language) !== null && _f !== void 0 ? _f : 'en',
            selectedCategories: (_g = u.selected_categories) !== null && _g !== void 0 ? _g : [],
        };
    }));
    // ─── PUT /api/user/profile ───────────────────────────────────────────────────
    app.put('/user/profile', (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const { neonUser } = request;
        if (!neonUser)
            return reply.status(401).send({ error: 'Unauthorized' });
        const parsed = UpdateProfileBody.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: parsed.error.issues.map(i => i.message).join('; ') });
        }
        const body = parsed.data;
        const fieldMap = {
            name: 'full_name',
            photoUrl: 'avatar_url',
            currency: 'currency',
            userType: 'user_type',
            monthlyBudget: 'monthly_budget',
            language: 'language',
            selectedCategories: 'selected_categories',
        };
        const sets = [];
        const params = [];
        let idx = 1;
        const bodyRecord = body;
        for (const [key, col] of Object.entries(fieldMap)) {
            if (bodyRecord[key] !== undefined) {
                sets.push(`${col} = $${idx++}`);
                params.push(bodyRecord[key]);
            }
        }
        if (sets.length === 0)
            return reply.status(400).send({ error: 'No fields to update' });
        sets.push(`updated_at = NOW()`);
        params.push(neonUser.id);
        yield db_1.db.query(`UPDATE user_profiles SET ${sets.join(', ')} WHERE id = $${idx}`, params);
        return { success: true };
    }));
});
exports.default = userRoute;
