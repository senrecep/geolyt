import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as authSchema from './auth-schema.js'
import * as schema from './schema.js'

const connectionString =
  process.env.POSTGRES_URL ?? 'postgres://geolyt:geolyt@localhost:5432/geolyt'

export const queryClient = postgres(connectionString, { max: 10 })
export const db = drizzle(queryClient, { schema: { ...schema, ...authSchema } })
