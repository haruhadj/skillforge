import { NextRequest, NextResponse } from 'next/server'
import { buildCsp, generateNonce } from '@/app/lib/csp'

// Nonce-based CSP (audit round 16). Mints a per-request nonce, sets it on the
// request's Content-Security-Policy header so Next.js stamps it onto every
// framework <script> during SSR, and echoes the policy on the response for the
// browser. The matcher excludes /games/* so the pre-built game iframes stay
// CSP-free, exactly as the old `(?!games/)` next.config.js scoping did.
export function middleware(request: NextRequest) {
  const nonce = generateNonce()
  const csp = buildCsp(nonce, process.env.NODE_ENV !== 'production')

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|games|favicon.ico).*)',
      // Skip prefetches so a cached prefetch response can't pin a stale nonce.
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
