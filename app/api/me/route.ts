import { NextRequest, NextResponse } from "next/server"

// Garante que essa rota rode no Node.js (evita Edge quando houver libs nativas no projeto)
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Rota mínima para destravar o build na Vercel.
// Substitua pela lógica real de autenticação quando tiver sessão/token.
export async function GET(_req: NextRequest) {
	return NextResponse.json({ ok: true }, { status: 200 })
}