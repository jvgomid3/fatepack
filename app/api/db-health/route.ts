import { NextResponse } from "next/server"
import { getPool } from "../../lib/db"

export async function GET() {
  try {
    const client = await getPool().connect()
    try {
      const r = await client.query("select 1 as ok")
      return NextResponse.json({ ok: r.rows[0].ok === 1 })
    } finally {
      client.release()
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message, code: e?.code }, { status: 500 })
  }
}