// Minimal in-memory sliding-window rate limiter for Next API routes.
//
// SkillForge prod is a single long-lived Next container on one Raspberry Pi
// (docker-compose.prod.yml) serving a single-school deployment — it is never run as
// multiple replicas. A process-local map is therefore the correct, sufficient throttle
// here; a distributed store (Redis) would be unnecessary infrastructure for this scale.
// (Only revisit that if the app is ever fanned out across multiple instances.)
// Buckets self-expire, so memory stays bounded.

type Hit = { count: number; resetAt: number }

const buckets = new Map<string, Hit>()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

// Allow `limit` events per `windowMs` for a given key. Each distinct key (e.g.
// `forgot-pw:ip:1.2.3.4`) gets its own window.
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 }
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    }
  }

  existing.count += 1
  return { allowed: true, remaining: limit - existing.count, retryAfterSeconds: 0 }
}

// Best-effort client IP from the proxy chain. nginx forwards the real client as the
// first hop of X-Forwarded-For; fall back to a constant so a missing header collapses
// to a single shared bucket rather than throwing.
export function clientIpFrom(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

// Opportunistically drop expired buckets so an attacker can't grow the map unboundedly
// by rotating keys. Called from limited routes; cheap and bounded by a scan cap.
export function sweepExpired(max = 1000): void {
  const now = Date.now()
  let scanned = 0
  for (const [key, hit] of buckets) {
    if (now >= hit.resetAt) buckets.delete(key)
    if (++scanned >= max) break
  }
}
