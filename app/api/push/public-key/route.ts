export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"

// Returns the server's VAPID public key for client subscription
import { getUserFromRequest } from "../../../../lib/server/auth"

export async function GET(req: NextRequest) {
  // Require authentication to fetch the VAPID public key.
  // This prevents exposing the key on a public URL while still allowing
  // authenticated clients to subscribe.
  const user = getUserFromRequest(req as any)
  if (!user) return NextResponse.json({ ok: false, publicKey: null }, { status: 401 })

  const publicKey = process.env.VAPID_PUBLIC_KEY || null
  if (!publicKey) return NextResponse.json({ ok: false, publicKey: null }, { status: 200 })
  return NextResponse.json({ ok: true, publicKey }, { status: 200 })
}
