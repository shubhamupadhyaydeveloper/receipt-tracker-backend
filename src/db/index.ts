import {Pool} from 'pg'

export const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false, // Neon requires this for secure connections
    },
})
