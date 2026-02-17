import { createBrowserClient } from '@supabase/ssr'

// 🔐 Custom cookie storage para persistir PKCE code_verifier através do redirect OAuth
// Isso resolve o erro "pkce_code_verifier_not_found"
const cookieStorage = {
  getItem: (key: string): string | null => {
    if (typeof document === 'undefined') return null
    const cookies = document.cookie.split('; ')
    const cookie = cookies.find(c => c.startsWith(`${key}=`))
    if (!cookie) return null
    try {
      return decodeURIComponent(cookie.split('=')[1])
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof document === 'undefined') return
    // Cookie com 7 dias de expiração, SameSite=Lax para permitir OAuth redirects
    const maxAge = 60 * 60 * 24 * 7 // 7 dias
    const secure = window.location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`
  },
  removeItem: (key: string): void => {
    if (typeof document === 'undefined') return
    document.cookie = `${key}=; path=/; max-age=0`
  },
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: cookieStorage,
      },
    }
  )
}