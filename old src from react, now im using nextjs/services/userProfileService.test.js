import { describe, expect, it, vi } from 'vitest'

vi.mock('../firebase', () => ({
  db: { __type: 'mock-db' },
}))

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(() => 'mock-server-time'),
  setDoc: vi.fn(),
}))

import {
  createSuggestedUsername,
  isValidUsername,
  normalizeUsername,
  sanitizeUsername,
} from './userProfileService'

describe('userProfileService helpers', () => {
  it('normalizes usernames to lowercase and trims spaces', () => {
    expect(normalizeUsername('  Player_ONE  ')).toBe('player_one')
  })

  it('accepts valid usernames', () => {
    expect(isValidUsername('abc')).toBe(true)
    expect(isValidUsername('player_123')).toBe(true)
    expect(isValidUsername('A1_b2_C3')).toBe(true)
  })

  it('rejects invalid usernames', () => {
    expect(isValidUsername('ab')).toBe(false)
    expect(isValidUsername('player name')).toBe(false)
    expect(isValidUsername('player-name')).toBe(false)
    expect(isValidUsername('this_username_is_way_too_long_for_rule')).toBe(false)
  })

  it('sanitizes mixed characters into valid underscore format', () => {
    expect(sanitizeUsername('John Doe!')).toBe('john_doe')
    expect(sanitizeUsername('___Hi___There___')).toBe('hi_there')
  })

  it('creates a stable fallback suggestion', () => {
    expect(createSuggestedUsername('**')).toBe('player')
    expect(createSuggestedUsername('@@', 'Alt Name')).toBe('alt_name')
  })
})
