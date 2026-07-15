import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { db } from '@geolyt/db'
import { betterAuth } from 'better-auth'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  emailAndPassword: {
    enabled: true,
  },
})
