import { useEffect, useState, type FormEvent } from 'react'
import { ChevronRight, Eye, EyeOff, Loader2 } from 'lucide-react'
import logomark from '@/assets/logomark.png'
import { Button } from '@/components/ui/Button'
import { FIELD } from '@/components/workspace/field'
import { cn } from '@/lib/cn'
import { hasVerifiedSession, signIn } from '@/auth/authService'
import { Turnstile } from './Turnstile'

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

/**
 * Where to go after sign-in: the `?next=` path the middleware sent us from,
 * only if it is a same-site path (no `//host` or `/\host` open redirects).
 */
function nextPath(): string {
  const raw = new URLSearchParams(window.location.search).get('next') ?? ''
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\') || raw.startsWith('/auth')) {
    return '/dashboard'
  }
  return raw
}

/**
 * Standalone login page — its own build at /auth/ (vite.login.config.ts), the
 * only page served without a session. No router: success is a full page load
 * into the app, which middleware.ts then lets through.
 */
export function LoginPage() {
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaReset, setCaptchaReset] = useState(0)

  // Already signed in (or the session only needed a refresh): go straight back.
  useEffect(() => {
    hasVerifiedSession().then((ok) => (ok ? window.location.replace(nextPath()) : setChecking(false)))
  }, [])

  if (checking) return null

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error: message } = await signIn(email.trim(), password, captchaToken ?? undefined)
    if (message) {
      setSubmitting(false)
      setError(message)
      // The token was spent on this attempt; get a fresh one.
      setCaptchaToken(null)
      setCaptchaReset((n) => n + 1)
      return
    }
    // Keep the spinner up while the app loads.
    window.location.replace(nextPath())
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-page px-4 py-10 text-default">
      <div className="w-full max-w-[518px] rounded-lg border border-default bg-surface-card p-8 shadow-card sm:p-10">
        <img src={logomark} alt="" aria-hidden className="h-6 w-6" />
        <h1 className="mt-5 text-xl font-bold text-default">Welcome back</h1>
        <p className="mt-1.5 text-base text-muted">Sign in to your onebuzz account to continue</p>

        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-default">
              Work Email<span className="ml-0.5 text-danger">*</span>
            </span>
            <input
              className={FIELD}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-default">
              Password<span className="ml-0.5 text-danger">*</span>
            </span>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(FIELD, 'pr-11')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-lg text-muted transition-colors duration-base hover:text-default focus-visible:outline-none focus-visible:shadow-focus"
              >
                {showPassword ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {TURNSTILE_SITE_KEY && (
            <Turnstile siteKey={TURNSTILE_SITE_KEY} onToken={setCaptchaToken} resetKey={captchaReset} />
          )}

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <div className="pt-1">
            <Button type="submit" disabled={submitting || (!!TURNSTILE_SITE_KEY && !captchaToken)}>
              Sign In
              {submitting ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <ChevronRight aria-hidden className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
