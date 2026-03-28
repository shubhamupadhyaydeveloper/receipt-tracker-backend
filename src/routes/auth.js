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
const db_1 = require("../db");
const authRoutes = (app) => {
    app.post("/auth/sync", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        const { supabaseUser } = request;
        if (!supabaseUser) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
        const { rows } = yield db_1.db.query(`
            INSERT INTO user_profiles
              (supabase_uid, full_name, email, avatar_url)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (supabase_uid)
            DO UPDATE SET
              full_name  = EXCLUDED.full_name,
              email      = EXCLUDED.email,
              avatar_url = EXCLUDED.avatar_url,
              updated_at = NOW()
            RETURNING *
  `, [
            supabaseUser.id,
            (_b = (_a = supabaseUser.user_metadata) === null || _a === void 0 ? void 0 : _a.full_name) !== null && _b !== void 0 ? _b : null,
            supabaseUser.email,
            (_d = (_c = supabaseUser.user_metadata) === null || _c === void 0 ? void 0 : _c.avatar_url) !== null && _d !== void 0 ? _d : null
        ]);
        if (!rows[0]) {
            return reply.status(500).send({ error: 'Failed to create or retrieve user profile' });
        }
        return { user: rows[0] };
    }));
};
exports.default = authRoutes;
