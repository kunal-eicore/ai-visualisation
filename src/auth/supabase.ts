import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser Supabase client — auth only; app data stays in localStorage.
 * The session lives in a cookie (not localStorage) so `middleware.ts` can check
 * it before serving any file. Both values are public by design (publishable
 * key), so the VITE_ prefix is intended. Set them in `.env.local` locally and
 * in Vercel's env vars.
 */
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createBrowserClient(url, key)
