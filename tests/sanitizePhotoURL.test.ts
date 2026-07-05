import { describe, it, expect } from 'vitest'
import { sanitizePhotoURL } from '@/app/lib/sanitizePhotoURL'

describe('sanitizePhotoURL', () => {
  it('returns null for null, undefined, empty string', () => {
    expect(sanitizePhotoURL(null)).toBeNull()
    expect(sanitizePhotoURL(undefined)).toBeNull()
    expect(sanitizePhotoURL('')).toBeNull()
  })

  it('passes through data:image/ URLs (base64 uploads)', () => {
    const b64 = 'data:image/png;base64,abc123=='
    expect(sanitizePhotoURL(b64)).toBe(b64)
  })

  it('accepts valid Google photo URLs', () => {
    const url = 'https://lh3.googleusercontent.com/a/AItbvmlkjhg=s96-c'
    expect(sanitizePhotoURL(url)).toBe(url)
  })

  it('accepts *.googleusercontent.com subdomains', () => {
    const url = 'https://lh5.googleusercontent.com/photo.jpg'
    expect(sanitizePhotoURL(url)).toBe(url)
  })

  it('accepts GitHub avatar URLs', () => {
    const url = 'https://avatars.githubusercontent.com/u/12345678?v=4'
    expect(sanitizePhotoURL(url)).toBe(url)
  })

  it('accepts Twitter/X photo URLs', () => {
    const url = 'https://pbs.twimg.com/profile_images/123/photo_400x400.jpg'
    expect(sanitizePhotoURL(url)).toBe(url)
  })

  it('accepts *.twimg.com subdomains', () => {
    const url = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png'
    expect(sanitizePhotoURL(url)).toBe(url)
  })

  it('rejects Facebook graph/CDN URLs (provider removed)', () => {
    expect(sanitizePhotoURL('https://graph.facebook.com/12345/picture?type=large')).toBeNull()
    expect(sanitizePhotoURL('https://static.xx.fbcdn.net/rsrc.php/photo.jpg')).toBeNull()
  })

  it('rejects TikTok CDN URLs (provider removed)', () => {
    expect(sanitizePhotoURL('https://p16-sign-sg.tiktokcdn.com/aweme/720x720/avatar.jpg')).toBeNull()
    expect(sanitizePhotoURL('https://p16-sign.tiktokcdn-eu.com/aweme/avatar.jpg')).toBeNull()
  })

  it('rejects http:// URLs', () => {
    expect(sanitizePhotoURL('http://lh3.googleusercontent.com/photo.jpg')).toBeNull()
  })

  it('rejects javascript: scheme', () => {
    expect(sanitizePhotoURL('javascript:alert(1)')).toBeNull()
  })

  it('rejects data: non-image URLs', () => {
    expect(sanitizePhotoURL('data:text/html,<script>alert(1)</script>')).toBeNull()
  })

  it('rejects arbitrary external domains', () => {
    expect(sanitizePhotoURL('https://evil.example.com/photo.jpg')).toBeNull()
    expect(sanitizePhotoURL('https://attacker.com/photo.jpg')).toBeNull()
  })

  it('rejects lookalike domains', () => {
    expect(sanitizePhotoURL('https://notgoogleusercontent.com/photo.jpg')).toBeNull()
    expect(sanitizePhotoURL('https://evil.googleusercontent.com.attacker.com/photo.jpg')).toBeNull()
  })

  it('rejects malformed URLs', () => {
    expect(sanitizePhotoURL('not a url at all')).toBeNull()
    expect(sanitizePhotoURL('://missing-scheme')).toBeNull()
  })
})
