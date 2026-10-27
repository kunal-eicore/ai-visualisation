import { useEffect, type ReactNode } from 'react'
import { useAuth } from './useAuth'

/**
 * Client-side half of the gate (middleware.ts is the server half): once the
 * session is gone — signed out, or expired while the app is open — hand over
 * to the standalone login page, which returns here after sign-in.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const signedOut = !loading && !session

  useEffect(() => {
    if (!signedOut) return
    const here = window.location.pathname + window.location.search
    window.location.replace(`/auth/?next=${encodeURIComponent(here)}`)
  }, [signedOut])

  if (loading || signedOut) return null
  return <>{children}</>
}
