import { createClient } from '@supabase/supabase-js'

// Support both NEXT_PUBLIC_* and non-prefixed envs for local setups
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY

if (!supabaseUrl) {
	throw new Error('Missing SUPABASE URL. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL')
}
if (!supabaseAnonKey) {
	throw new Error('Missing SUPABASE anon key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)