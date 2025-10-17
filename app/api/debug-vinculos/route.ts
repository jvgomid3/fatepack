import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supaUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!adminKey || !supaUrl) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL")
  }
  return createClient(supaUrl, adminKey, { auth: { persistSession: false } })
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const email = url.searchParams.get('email')
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    
    // 1. Buscar usuário
    const { data: usuario, error: userError } = await admin
      .from('usuario')
      .select('id_usuario, nome, email, bloco, apto')
      .eq('email', email.toLowerCase().trim())
      .single()
    
    if (userError || !usuario) {
      return NextResponse.json({ error: 'Usuario não encontrado', detail: userError?.message })
    }

    // 2. Buscar vínculos
    const { data: vinculos, error: vinculosError } = await admin
      .from('usuario_apartamento')
      .select(`
        id_usuario,
        id_apartamento,
        data_entrada,
        data_saida,
        apartamento:apartamento!inner (
          id_apartamento,
          numero,
          bloco:bloco!inner (
            id_bloco,
            nome
          )
        )
      `)
      .eq('id_usuario', usuario.id_usuario)
      .order('data_entrada', { ascending: false })

    // 3. Buscar encomendas de todos os apartamentos do usuário
    const aptoIds = vinculos?.map(v => v.id_apartamento) || []
    const { data: encomendas, error: encomendaError } = await admin
      .from('encomenda')
      .select(`
        id_encomenda,
        data_recebimento,
        id_apartamento,
        empresa_entrega,
        apartamento:apartamento!inner (
          numero,
          bloco:bloco!inner (
            nome
          )
        )
      `)
      .in('id_apartamento', aptoIds)
      .order('data_recebimento', { ascending: false })

    return NextResponse.json({
      usuario: {
        id: usuario.id_usuario,
        nome: usuario.nome,
        email: usuario.email,
        bloco_atual: usuario.bloco,
        apto_atual: usuario.apto
      },
      vinculos: vinculos?.map(v => ({
        id_apartamento: v.id_apartamento,
        data_entrada: v.data_entrada,
        data_saida: v.data_saida,
        bloco: v.apartamento?.bloco?.nome,
        apartamento: v.apartamento?.numero,
        ativo: !v.data_saida
      })) || [],
      encomendas: encomendas?.map(e => ({
        id: e.id_encomenda,
        data_recebimento: e.data_recebimento,
        empresa_entrega: e.empresa_entrega,
        bloco: e.apartamento?.bloco?.nome,
        apartamento: e.apartamento?.numero,
        id_apartamento: e.id_apartamento
      })) || [],
      debug: {
        aptoIds,
        vinculos_count: vinculos?.length || 0,
        encomendas_count: encomendas?.length || 0
      }
    })

  } catch (error: any) {
    console.error('Debug vinculos error:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      detail: error.message 
    }, { status: 500 })
  }
}