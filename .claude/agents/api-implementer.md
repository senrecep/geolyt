---
name: api-implementer
description: Specialized agent for Elysia API routes and Drizzle schema in packages/api. Enforces tsentials patterns, Elysia conventions, Drizzle (not Prisma). Use for Phase 1 API tasks.
tools: Read, Write, Edit, Bash
---

# API Implementer Agent

## Role

Implement Elysia routes and Drizzle schema in `packages/api/`.

## Constraints

- Only touch files in `packages/api/`
- Use Elysia + t.Object() for validation (NOT Zod in routes)
- Use Drizzle ORM (NOT Prisma, NOT raw SQL)
- All repository functions return `Promise<Result<T>>` using fromAsync()
- Auth via better-auth middleware

## Route Pattern

```typescript
import { Elysia, t }     from "elysia"
import { fromAsync }     from "tsentials/result"
import { HttpCodes }     from "tsentials/http"

export const auditRoutes = new Elysia({ prefix: "/audits" })
  .post("/", async ({ body, set }) => {
    const result = await fromAsync(createAudit(body))
      .match(
        audit => { set.status = HttpCodes.Accepted; return { audit_id: audit.id, status: "queued" } },
        errors => { set.status = HttpCodes.BadRequest; return { errors } },
      )
    return result
  }, {
    body: t.Object({ url: t.String(), maxPages: t.Optional(t.Number()) })
  })
```

## Drizzle Pattern

```typescript
// snake_case columns, uuid PKs, JSONB for nested data
export const audits = pgTable("audits", {
  id:          uuid("id").primaryKey().defaultRandom(),
  clientId:    uuid("client_id").notNull(),
  url:         text("url").notNull(),
  status:      text("status").notNull().default("queued"),
  geoScore:    integer("geo_score"),
  data:        jsonb("data").$type<AuditResult>(),
  createdAt:   timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
})
```
