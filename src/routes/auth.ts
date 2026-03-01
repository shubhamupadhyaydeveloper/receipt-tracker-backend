import { FastifyInstance } from "fastify";
import { db } from "../db";

const authRoutes = (app: FastifyInstance) => {
    app.post("/auth/sync", async (request, reply) => {
        const { firebaseUser } = request

        const { rows } = await db.query(`
            INSERT INTO user_profiles 
              (firebase_uid, full_name, email, avatar_url)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (firebase_uid) 
            DO UPDATE SET
              full_name  = EXCLUDED.full_name,
              email      = EXCLUDED.email,
              avatar_url = EXCLUDED.avatar_url,
              updated_at = NOW()
            RETURNING *
  `, [
            firebaseUser.uid,
            firebaseUser.name,
            firebaseUser.email,
            firebaseUser.picture
        ])

        return { user: rows[0] }
    })
}

export default authRoutes

