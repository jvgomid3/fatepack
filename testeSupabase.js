import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Para corrigir caminhos com ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega .env.local da raiz do projeto
dotenv.config({ path: path.join(__dirname, '.env.local') });

// Pega as variáveis
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validação
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Erro: variáveis de ambiente não encontradas!');
  process.exit(1);
}

// Cria cliente Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Teste de conexão
async function testConnection() {
  const { data, error } = await supabase.from('usuario').select('*').limit(5);

  if (error) {
    console.error('❌ Erro ao consultar tabela usuario:', error);
  } else {
    console.log('✅ Dados de teste:', data);
  }
}

testConnection();
