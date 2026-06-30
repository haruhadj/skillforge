import { describe, it, expect } from 'vitest'
import { buildCsp, generateNonce } from '@/app/lib/csp'

// Pull a single directive (e.g. "script-src") out of the joined CSP string.
function directive(csp: string, name: string): string {
  const found = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(`${name} `) || d === name)
  if (!found) throw new Error(`directive ${name} not found in CSP`)
  return found
}

describe('buildCsp', () => {
  const nonce = 'TESTNONCE=='
  const csp = buildCsp(nonce)

  it('keys script-src to the nonce and drops unsafe-inline/unsafe-eval', () => {
    const scriptSrc = directive(csp, 'script-src')
    expect(scriptSrc).toBe(`script-src 'self' 'nonce-${nonce}'`)
    expect(scriptSrc).not.toContain("'unsafe-inline'")
    expect(scriptSrc).not.toContain("'unsafe-eval'")
  })

  it('keeps the required non-script directives', () => {
    expect(directive(csp, 'default-src')).toBe("default-src 'self'")
    expect(directive(csp, 'object-src')).toBe("object-src 'none'")
    expect(directive(csp, 'base-uri')).toBe("base-uri 'self'")
    expect(directive(csp, 'frame-ancestors')).toBe("frame-ancestors 'self'")
    // style-src intentionally retains 'unsafe-inline' (nonces don't cover style="" attrs)
    expect(directive(csp, 'style-src')).toContain("'unsafe-inline'")
  })

  it('preserves the Firebase/Google connect + frame allowlists', () => {
    const connectSrc = directive(csp, 'connect-src')
    expect(connectSrc).toContain('https://*.googleapis.com')
    expect(connectSrc).toContain('wss://*.firebaseio.com')
    expect(connectSrc).toContain('https://accounts.google.com')
    expect(directive(csp, 'frame-src')).toContain('https://*.firebaseapp.com')
  })

  it('preserves the avatar/photo img-src allowlist', () => {
    const imgSrc = directive(csp, 'img-src')
    expect(imgSrc).toContain('https://*.googleusercontent.com')
    expect(imgSrc).toContain('https://avatars.githubusercontent.com')
    expect(imgSrc).toContain('data:')
    expect(imgSrc).toContain('blob:')
  })
})

describe('generateNonce', () => {
  it('returns distinct, non-empty base64 values', () => {
    const a = generateNonce()
    const b = generateNonce()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThan(0)
    expect(a).toMatch(/^[A-Za-z0-9+/]+=*$/)
  })
})
