import { describe, it, expect } from 'vitest'
import { pickPublicProfileFields } from '@/app/lib/publicProfileFields'

describe('pickPublicProfileFields', () => {
  it('keeps only the four display fields', () => {
    const out = pickPublicProfileFields({
      username: 'alice',
      usernameNormalized: 'alice',
      photoURL: 'https://lh3.googleusercontent.com/a/x',
      photoThumbURL: 'data:image/png;base64,abc',
    })
    expect(out).toEqual({
      username: 'alice',
      usernameNormalized: 'alice',
      photoURL: 'https://lh3.googleusercontent.com/a/x',
      photoThumbURL: 'data:image/png;base64,abc',
    })
  })

  it('strips PII even when handed a full user profile', () => {
    const out = pickPublicProfileFields({
      uid: 'u1',
      username: 'bob',
      email: 'bob@example.com',
      role: 'admin',
      authProvider: 'google',
      linkedProviders: { google: { email: 'bob@example.com' } },
      deviceType: 'mobile',
      deviceOs: 'iOS',
      deviceBrowser: 'Safari',
      deviceLastSeen: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      profileCompleted: true,
    })
    expect(out).toEqual({ username: 'bob' })
    // explicit: none of the sensitive keys survive
    for (const k of ['email', 'role', 'authProvider', 'linkedProviders', 'deviceType', 'deviceOs', 'deviceBrowser', 'deviceLastSeen', 'createdAt', 'updatedAt', 'uid', 'profileCompleted']) {
      expect(out).not.toHaveProperty(k)
    }
  })

  it('drops undefined / non-string / empty values', () => {
    const out = pickPublicProfileFields({
      username: 'carol',
      usernameNormalized: undefined,
      photoURL: '',
      photoThumbURL: null,
    })
    expect(out).toEqual({ username: 'carol' })
  })

  it('returns an empty object for an empty source', () => {
    expect(pickPublicProfileFields({})).toEqual({})
  })
})
