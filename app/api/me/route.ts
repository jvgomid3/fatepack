export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  // FIXME: trocar pela verificação real da sessão/cookie do seu backend
  return new Response(JSON.stringify({ nome: "Adriana" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}