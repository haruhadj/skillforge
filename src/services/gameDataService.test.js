import { describe, expect, it, vi } from 'vitest'
import { saveBestScore } from './gameDataService'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'

vi.mock('../firebase', () => ({
  db: { __type: 'mock-db' },
}))

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'score-doc-ref'),
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => 'mock-server-time'),
  collection: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
}))

describe('gameDataService', () => {
  it('persists best score to Firestore with merge', async () => {
    await saveBestScore('uid-1', '2048', 3000)

    expect(doc).toHaveBeenCalledWith({ __type: 'mock-db' }, 'users', 'uid-1', 'scores', '2048')
    expect(serverTimestamp).toHaveBeenCalledTimes(1)
    expect(setDoc).toHaveBeenCalledWith(
      'score-doc-ref',
      {
        bestScore: 3000,
        updatedAt: 'mock-server-time',
      },
      { merge: true },
    )
  })
})
