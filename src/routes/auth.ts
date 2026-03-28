import { FastifyInstance } from "fastify";
import { db } from "../db";

const authRoutes = (app: FastifyInstance) => {
    app.post("/auth/sync", async (request, reply) => {
        const { supabaseUser } = request

        if (!supabaseUser) {
            return reply.status(401).send({ error: 'Unauthorized' })
        }

        const { rows } = await db.query(`
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
            supabaseUser.user_metadata?.full_name ?? null,
            supabaseUser.email,
            supabaseUser.user_metadata?.avatar_url ?? null
        ])

        if (!rows[0]) {
            return reply.status(500).send({ error: 'Failed to create or retrieve user profile' })
        }

        return { user: rows[0] }
    })
}

export default authRoutes

