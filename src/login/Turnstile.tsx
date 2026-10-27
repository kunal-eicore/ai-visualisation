import { useEffect, useRef } from 'react'

/* Cloudflare Turnstile, loaded on demand — a ~60-line wrapper instead of a
   React binding library. Supabase verifies the token server-side. */

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string
      theme: 'light' | 'dark'
      callback: (token: string) => void
      'expired-callback': () => void
      'error-callback': () => void
    },
  ) => string
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let loading: Promise<TurnstileApi> | null = null

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT
    s.async = true
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile unavailable')))
    s.onerror = () => {
      loading = null
      reject(new Error('Turnstile failed to load'))
    }
    document.head.appendChild(s)
  })
  return loading
}

type TurnstileProps = {
  siteKey: string
  /** The solved token, or null when it expires or errors. */
  onToken: (token: string | null) => void
  /** Bump to get a fresh challenge — a token is single-use. */
  resetKey: number
}

export function Turnstile({ siteKey, onToken, resetKey }: TurnstileProps) {
  const ref = useRef<HTMLDivElement>(null)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken

  useEffect(() => {
    let id: string | undefined
    let cancelled = false
    loadTurnstile()
      .then((ts) => {
        if (cancelled || !ref.current) return
        id = ts.render(ref.current, {
          sitekey: siteKey,
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
          callback: (token) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
        })
      })
      .catch(() => onTokenRef.current(null))
    return () => {
      cancelled = true
      if (id) window.turnstile?.remove(id)
    }
  }, [siteKey, resetKey])

  return <div ref={ref} className="min-h-[65px]" />
}
