import { Pool } from 'pg'

export const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false, // Neon requires this for secure connections
    },
    max: 10,                   // max pool size (Neon free tier: keep low)
    idleTimeoutMillis: 30_000, // close idle clients after 30s
    connectionTimeoutMillis: 5_000, // fail fast if DB unreachable
})
