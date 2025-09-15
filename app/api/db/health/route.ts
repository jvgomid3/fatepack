export const runtime = "nodejs"
import { NextResponse } from "next/server"
import { pool } from "../../../../lib/server/db" // <-- corrigido (4 níveis)

export async function GET() {
  try {
    const r = await pool.query("SELECT 1 as ok")
    return NextResponse.json({ ok: true, result: r.rows[0] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}