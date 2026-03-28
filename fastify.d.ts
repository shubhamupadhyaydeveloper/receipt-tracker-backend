import 'fastify'
import { User } from '@supabase/supabase-js'
import { UserProfile } from './src/db/types'

declare module 'fastify' {
    interface FastifyRequest {
        supabaseUser: User
        neonUser:     UserProfile | null
    }
}
