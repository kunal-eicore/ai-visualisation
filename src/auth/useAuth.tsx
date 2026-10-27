import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSession, onSessionChange, signIn, signOut } from './authService'

type AuthContextValue = {
  session: Session | null
  /** True until the stored session has been read on first load. */
  loading: boolean
  signIn: typeof signIn
  signOut: typeof signOut
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    getSession().then((s) => {
      if (!active) return
      setSession(s)
      setLoading(false)
    })
    const unsubscribe = onSessionChange((s) => {
      setSession(s)
      setLoading(false)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signOut }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/**
 * The signed-in user's name and initials for the shell. Name comes from the
 * Supabase `display_name` metadata, falling back to the email.
 */
export function useCurrentUser() {
  const { session } = useAuth()
  const user = session?.user
  const displayName = user?.user_metadata?.display_name
  const name = typeof displayName === 'string' && displayName.trim() ? displayName.trim() : user?.email ?? ''
  const words = name.split('@')[0].split(/[\s._-]+/).filter(Boolean)
  const initials = (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? '').slice(0, 2)).toUpperCase()
  return { name, initials }
}
