import { describe, expect, it } from 'vitest'

import { type PersistedGameState, restorePersistedGameState } from './persisted-state'

const fallbackState: PersistedGameState = {
  schemaVersion: 1,
  mode: 'individual',
  participants: [
    { type: 'individual', id: 'player-1', name: 'Анна' },
    { type: 'individual', id: 'player-2', name: 'Марк' },
  ],
  scores: {},
  status: 'draft',
  roundIndex: 0,
  phase: 'setup',
}

describe('restorePersistedGameState', () => {
  it('restores a valid active session with scores and the current round', () => {
    const persistedState: PersistedGameState = {
      ...fallbackState,
      scores: { 'player-1': 700, 'player-2': -200 },
      status: 'active',
      roundIndex: 1,
      phase: 'board',
    }

    expect(restorePersistedGameState(persistedState, fallbackState)).toEqual(persistedState)
  })

  it('uses a safe fallback when localStorage contains invalid data', () => {
    expect(
      restorePersistedGameState({ schemaVersion: 99, scores: 'broken' }, fallbackState),
    ).toEqual(fallbackState)
  })
})
