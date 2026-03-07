import 'fastify'
import { DecodedIdToken } from 'firebase-admin/auth'
import { UserProfile } from './src/db/types'

declare module 'fastify' {
    interface FastifyRequest {
        firebaseUser: DecodedIdToken
        neonUser:     UserProfile | null
    }
}
