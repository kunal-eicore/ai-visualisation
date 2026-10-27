import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

/**
 * Email + password sign-in. `captchaToken` is the Turnstile token, checked by
 * Supabase once CAPTCHA protection is on (ignored while it is off). Resolves
 * with Supabase's error message on failure.
 */
export async function signIn(
  email: string,
  password: string,
  captchaToken?: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } })
  return { error: error?.message ?? null }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

/** True only for a session whose JWT verifies (refreshing it first if it expired). */
export async function hasVerifiedSession(): Promise<boolean> {
  const { data } = await supabase.auth.getClaims()
  return !!data?.claims
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  return data.session
}

/** Subscribe to sign-in / sign-out / token refresh. Returns the unsubscribe. */
export function onSessionChange(cb: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session))
  return () => data.subscription.unsubscribe()
}
