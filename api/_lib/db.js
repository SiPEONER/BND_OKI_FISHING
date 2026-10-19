import { neon } from '@neondatabase/serverless'
import { makePgStore } from './store.js'

// Vercel's Neon (Postgres) integration sets one of these automatically.
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED

export const store = url ? makePgStore(neon(url)) : null
export const env = process.env
