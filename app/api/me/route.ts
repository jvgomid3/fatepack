export const dynamic = "force-dynamic"

// Rota mínima para destravar o build na Vercel.
// Substitua pela lógica real de autenticação quando tiver sessão/token.
export async function GET(_req: Request) {
	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	})
}