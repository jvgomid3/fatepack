import "server-only"
import pkg from "pg"
const { Pool } = pkg

declare global {
  // eslint-disable-next-line no-var
  var __pgPool__: any | undefined
}

export const pool: pkg.Pool = global.__pgPool__ || new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
})

if (!global.__pgPool__) global.__pgPool__ = pool