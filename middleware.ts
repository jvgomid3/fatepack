import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const PUBLIC_API = new Set(["/api/auth/verificar-email", "/api/redefinir-senha", "/api/login"])

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (pathname.startsWith("/api")) {
    if ([...PUBLIC_API].some(p => pathname === p)) return NextResponse.next()
    // se tiver verificação de token aqui, mantenha; mas não bloqueie as públicas acima
  }
  return NextResponse.next()
}

export const config = { matcher: ["/api/:path*"] }
