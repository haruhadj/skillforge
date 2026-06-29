const ALLOWED_HOSTNAMES = [
  // Google (OAuth + user-uploaded via Firebase Storage CDN)
  'lh3.googleusercontent.com',
  'lh4.googleusercontent.com',
  'lh5.googleusercontent.com',
  'lh6.googleusercontent.com',
  // GitHub
  'avatars.githubusercontent.com',
  // Twitter / X
  'pbs.twimg.com',
  // Facebook
  'graph.facebook.com',
  // Facebook CDN suffixes
]

const ALLOWED_HOSTNAME_SUFFIXES = [
  '.googleusercontent.com',
  '.twimg.com',
  '.fbcdn.net',
  '.fbsbx.com',
  '.tiktokcdn.com',
  '.tiktokcdn-eu.com',
]

export function sanitizePhotoURL(url: string | null | undefined): string | null {
  if (!url) return null
  // Base64 data-URL uploads are self-contained and safe — pass through.
  if (url.startsWith('data:image/')) return url
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:') return null
  const h = parsed.hostname
  if (ALLOWED_HOSTNAMES.includes(h)) return url
  if (ALLOWED_HOSTNAME_SUFFIXES.some((s) => h.endsWith(s))) return url
  return null
}
