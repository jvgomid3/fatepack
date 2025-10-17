const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function debugUser() {
  // Use ANON key para debug (cuidado com RLS)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('Missing Supabase env vars')
    return
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const email = 'felipe@email.com'
    
    console.log('=== DEBUG USUARIO ===')
    
    // 1. Usuario atual
    const { data: userData, error: userError } = await supabase
      .from('usuario')
      .select('id_usuario, nome, email, bloco, apto')
      .eq('email', email)
      .single()
    
    if (userError) {
      console.log('Erro ao buscar usuario:', userError.message)
      return
    }
    
    console.log('Usuario:', userData)
    
    if (!userData) {
      console.log('Usuario não encontrado!')
      return
    }
    
    const userId = userData.id_usuario
    
    console.log('\n=== TODOS OS VINCULOS (HISTÓRICO COMPLETO) ===')
    const { data: allVinculos, error: allVinculosError } = await supabase
      .from('usuario_apartamento')
      .select(`
        *,
        apartamento:apartamento!inner (
          numero,
          bloco:bloco!inner (
            nome
          )
        )
      `)
      .eq('id_usuario', userId)
      .order('data_entrada', { ascending: true }) // Cronológico
    
    if (allVinculosError) {
      console.log('Erro ao buscar todos vinculos:', allVinculosError.message)
    } else {
      allVinculos.forEach((v, i) => {
        console.log(`${i+1}. Bloco ${v.apartamento.bloco.nome} Apto ${v.apartamento.numero}`)
        console.log(`   Entrada: ${v.data_entrada}`)
        console.log(`   Saida: ${v.data_saida || 'ATIVO'}`)
        console.log(`   ID Apartamento: ${v.id_apartamento}`)
        console.log('')
      })
    }
    
    // 2. Vinculos usuario_apartamento (apenas ativos para comparar)
    const { data: vinculosData, error: vinculosError } = await supabase
      .from('usuario_apartamento')
      .select(`
        *,
        apartamento:apartamento!inner (
          numero,
          bloco:bloco!inner (
            nome
          )
        )
      `)
      .eq('id_usuario', userId)
      .order('data_entrada', { ascending: false })
    
    if (vinculosError) {
      console.log('Erro ao buscar vinculos:', vinculosError.message)
      return
    }
    
    console.log('\n=== VINCULOS ===')
    vinculosData.forEach((v, i) => {
      console.log(`${i+1}. Bloco ${v.apartamento.bloco.nome} Apto ${v.apartamento.numero}`)
      console.log(`   Entrada: ${v.data_entrada}`)
      console.log(`   Saida: ${v.data_saida || 'ATIVO'}`)
      console.log(`   ID Apartamento: ${v.id_apartamento}`)
    })
    
    // 3. Apartamentos únicos dos vinculos
    const aptoIds = vinculosData.map(v => v.id_apartamento)
    console.log('\n=== APARTAMENTO IDs ===')
    console.log('IDs:', aptoIds)
    
    if (aptoIds.length > 0) {
      // 4. Encomendas desses apartamentos
      const { data: encomendaData, error: encomendaError } = await supabase
        .from('encomenda')
        .select(`
          *,
          apartamento:apartamento!inner (
            numero,
            bloco:bloco!inner (
              nome
            )
          )
        `)
        .in('id_apartamento', aptoIds)
        .order('data_recebimento', { ascending: false })
      
      if (encomendaError) {
        console.log('Erro ao buscar encomendas:', encomendaError.message)
        return
      }
      
      console.log('\n=== ENCOMENDAS ===')
      encomendaData.forEach((e, i) => {
        console.log(`${i+1}. ${e.empresa_entrega} - Bloco ${e.apartamento.bloco.nome} Apto ${e.apartamento.numero}`)
        console.log(`   Recebida: ${e.data_recebimento}`)
        console.log(`   ID Apartamento: ${e.id_apartamento}`)
        
        // Verificar se esta encomenda está dentro de alguma janela
        const vinculosDoApto = vinculosData.filter(v => v.id_apartamento === e.id_apartamento)
        let dentroJanela = false
        
        vinculosDoApto.forEach(v => {
          const dataEntrada = new Date(v.data_entrada)
          const dataSaida = v.data_saida ? new Date(v.data_saida) : new Date()
          const dataRecebimento = new Date(e.data_recebimento)
          
          if (dataRecebimento >= dataEntrada && dataRecebimento <= dataSaida) {
            dentroJanela = true
            console.log(`   ✅ VISIVEL (janela: ${v.data_entrada} até ${v.data_saida || 'agora'})`)
          }
        })
        
        if (!dentroJanela) {
          console.log(`   ❌ OCULTA (fora das janelas de vinculo)`)
        }
      })
    }
    
  } catch (error) {
    console.error('Erro:', error.message)
  }
}

debugUser()