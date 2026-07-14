import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { db, queryClient } from './client.js'

async function run(): Promise<void> {
  await migrate(db, { migrationsFolder: './drizzle' })
  await queryClient.end()
}

run().catch((error) => {
  console.error('Migration failed:', error)
  process.exit(1)
})
