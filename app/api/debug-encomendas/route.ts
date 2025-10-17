import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/server/auth'
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
    // Test user authentication
    const user = getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        debug: {
          hasAuth: !!req.headers.get("authorization"),
          authHeader: req.headers.get("authorization")?.substring(0, 20) + "..."
        }
      }, { status: 401 })
    }

    const userId = Number(user.id)
    const admin = getSupabaseAdmin()
    
    // 1. Get user vinculos
    const { data: vinculos, error: vinculosError } = await admin
      .from('usuario_apartamento')
      .select('id_apartamento, data_entrada, data_saida')
      .eq('id_usuario', userId)
      .order('data_entrada', { ascending: false })

    if (vinculosError) {
      return NextResponse.json({ 
        error: 'Vinculos query failed', 
        detail: vinculosError.message,
        userId 
      })
    }

    const aptoIds = vinculos?.map(v => v.id_apartamento) || []

    // 2. Get encomendas for those apartments
    const { data: encomendas, error: encomendaError } = await admin
      .from('encomenda')
      .select(`
        id_encomenda,
        data_recebimento,
        empresa_entrega,
        id_apartamento,
        apartamento:apartamento!inner (
          numero,
          bloco:bloco!inner (
            nome
          )
        )
      `)
      .in('id_apartamento', aptoIds)
      .order('data_recebimento', { ascending: false })
      .limit(20) // Limit for debugging

    if (encomendaError) {
      return NextResponse.json({ 
        error: 'Encomendas query failed', 
        detail: encomendaError.message,
        aptoIds 
      })
    }

    // 3. Apply temporal filtering
    const now = new Date()
    const parseDate = (v: any) => {
      try { return v ? new Date(v) : null } catch { return null }
    }
    
    const filteredEncomendas = (encomendas || []).map(e => {
      const dr = parseDate(e.data_recebimento)
      if (!dr) return { ...e, visible: false, reason: 'No data_recebimento' }
      
      const vForApto = vinculos?.filter(v => v.id_apartamento === e.id_apartamento) || []
      let visible = false
      let reason = 'No matching vinculos'
      
      for (const v of vForApto) {
        const de = parseDate(v.data_entrada)
        const ds = parseDate(v.data_saida)
        if (!de) continue
        
        if (dr >= de && (ds ? dr <= ds : dr <= now)) {
          visible = true
          reason = `In window: ${v.data_entrada} to ${v.data_saida || 'now'}`
          break
        } else {
          reason = `Outside window: ${v.data_entrada} to ${v.data_saida || 'now'} (received: ${e.data_recebimento})`
        }
      }
      
      return {
        ...e,
        visible,
        reason,
        bloco: e.apartamento?.bloco?.nome,
        apartamento: e.apartamento?.numero
      }
    })

    return NextResponse.json({
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        tipo: user.tipo
      },
      vinculos,
      aptoIds,
      totalEncomendas: encomendas?.length || 0,
      visibleEncomendas: filteredEncomendas.filter(e => e.visible).length,
      encomendas: filteredEncomendas
    })

  } catch (error: any) {
    console.error('Debug encomendas error:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      detail: error.message 
    }, { status: 500 })
  }
}