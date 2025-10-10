export const runtime = "nodejs"

import { NextResponse } from "next/server"

// Returns the server's VAPID public key for client subscription
export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY || null
  if (!publicKey) return NextResponse.json({ ok: false, publicKey: null }, { status: 200 })
  return NextResponse.json({ ok: true, publicKey }, { status: 200 })
}
