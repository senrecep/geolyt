import type { AuditResult } from '@geolyt/shared'
import { relations } from 'drizzle-orm'
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionItemId: text('stripe_subscription_item_id'),
  plan: text('plan').default('free'),
  monthlyQuota: integer('monthly_quota').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const sites = pgTable(
  'sites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: uuid('client_id').references(() => clients.id),
    url: text('url').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('site_client_idx').on(table.clientId)],
)

export const audits = pgTable(
  'audits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: uuid('client_id').references(() => clients.id),
    siteId: uuid('site_id').references(() => sites.id),
    url: text('url').notNull(),
    status: text('status').notNull().default('pending'),
    reportFormat: text('report_format').notNull().default('pdf'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('audit_status_idx').on(table.status),
    index('audit_site_idx').on(table.siteId),
    index('audit_client_idx').on(table.clientId),
  ],
)

export const auditResults = pgTable('audit_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  auditId: uuid('audit_id')
    .references(() => audits.id)
    .notNull()
    .unique(),
  data: jsonb('data').$type<AuditResult>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  auditId: uuid('audit_id')
    .references(() => audits.id)
    .notNull()
    .unique(),
  format: text('format').notNull(),
  storageKey: text('storage_key'),
  publicUrl: text('public_url'),
  shareToken: text('share_token'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const usage = pgTable(
  'usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: uuid('client_id').references(() => clients.id),
    period: text('period').notNull(),
    audits: integer('audits').notNull().default(0),
    aiTokensCached: integer('ai_tokens_cached').default(0),
    aiTokensUncached: integer('ai_tokens_uncached').default(0),
    aiTokensOutput: integer('ai_tokens_output').default(0),
  },
  (table) => [index('usage_client_period_idx').on(table.clientId, table.period)],
)

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: uuid('client_id').references(() => clients.id),
    name: text('name').notNull(),
    keyHash: text('key_hash').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('api_key_client_idx').on(table.clientId)],
)

export const clientsRelations = relations(clients, ({ many }) => ({
  sites: many(sites),
  apiKeys: many(apiKeys),
  usage: many(usage),
}))

export const sitesRelations = relations(sites, ({ one, many }) => ({
  client: one(clients, { fields: [sites.clientId], references: [clients.id] }),
  audits: many(audits),
}))

export const auditsRelations = relations(audits, ({ one, many }) => ({
  site: one(sites, { fields: [audits.siteId], references: [sites.id] }),
  result: one(auditResults),
  reports: many(reports),
}))
