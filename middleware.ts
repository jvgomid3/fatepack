import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const PUBLIC_API = new Set(["/api/usuario", "/api/redefinir-senha", "/api/login"])

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (pathname.startsWith("/api")) {
    if ([...PUBLIC_API].some(p => pathname === p)) return NextResponse.next()
    // se tiver verificação de token aqui, mantenha; mas não bloqueie as públicas acima
  }
  return NextResponse.next()
}

export const config = { matcher: ["/api/:path*"] }

const handleBuscar = async () => {
  setCaMsg(""); setCaFound(null);
  try {
    const res = await fetch(`/api/usuario?email=${encodeURIComponent(caEmail)}`)
    console.log("GET /api/usuario status:", res.status)
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new Error(data?.error || "Usuário não encontrado")
    setCaFound(data)
  } catch (e: any) {
    setCaMsg(e?.message || "Erro ao buscar usuário")
  }
}