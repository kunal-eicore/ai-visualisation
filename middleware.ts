import { next } from '@vercel/functions'
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'

/**
 * Vercel Routing Middleware — every file (app bundle, seed data, sample files)
 * is served only to a request carrying a valid Supabase session cookie.
 * Anything else is sent to the standalone login build at /auth/, which shares
 * no chunks with the app. The JWT is verified locally against the project's
 * published ES256 key (getClaims), refreshing it first if it has expired.
 */
export const config = {
  matcher: ['/((?!auth|robots\\.txt|favicon\\.png).*)'],
}

// Repeated here so a matcher quirk can never open up the app.
const PUBLIC = /^\/(auth(\/|$)|robots\.txt$|favicon\.png$)/

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url)
  if (PUBLIC.test(url.pathname)) return next()

  const setCookies: string[] = []
  const supabase = createServerClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => parseCookieHeader(request.headers.get('cookie') ?? ''),
      setAll: (cookies) =>
        cookies.forEach(({ name, value, options }) => setCookies.push(serializeCookieHeader(name, value, options))),
    },
  })

  const { data } = await supabase.auth.getClaims()

  const headers = new Headers()
  setCookies.forEach((c) => headers.append('set-cookie', c))

  if (data?.claims) return next({ headers })

  const login = new URL('/auth/', url)
  login.searchParams.set('next', url.pathname + url.search)
  headers.set('location', login.toString())
  headers.set('cache-control', 'no-store')
  return new Response(null, { status: 302, headers })
}
