import "server-only"
import { createClient } from "@supabase/supabase-js"

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url) throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL env var")
if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY env var")

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false },
})
