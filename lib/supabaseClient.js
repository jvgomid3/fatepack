import { createClient } from '@supabase/supabase-js'

let cached = null

// Lazy initializer to avoid build-time crashes on Vercel when envs are missing
export function getSupabaseClient() {
	if (cached) return cached
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY
	if (!supabaseUrl) {
		throw new Error('Missing SUPABASE URL. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL')
	}
	if (!supabaseAnonKey) {
		throw new Error('Missing SUPABASE anon key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_KEY')
	}
	cached = createClient(supabaseUrl, supabaseAnonKey)
	return cached
}