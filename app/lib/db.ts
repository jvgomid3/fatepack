import { Pool, PoolConfig } from "pg"

let pool: Pool | null = null

function makePgConfig(): PoolConfig {
  if (process.env.PGHOST || process.env.PGUSER || process.env.PGDATABASE) {
    return {
      host: process.env.PGHOST || "127.0.0.1",
      port: Number(process.env.PGPORT || 5432),
      user: process.env.PGUSER || "postgres",
      password: process.env.PGPASSWORD || undefined,
      database: process.env.PGDATABASE || "fatepack",
      // ssl: { rejectUnauthorized: false }, // use se precisar
    }
  }
  const url = process.env.POSTGRES_URL
  if (!url) {
    throw new Error("POSTGRES_URL não configurado")
  }
  return { connectionString: url }
}

export function getPool(): Pool {
  if (!pool) pool = new Pool(makePgConfig())
  return pool
}