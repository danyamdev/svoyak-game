import { describe, expect, it } from 'vitest'

import {
  type PersistedGameState,
  migratePersistedGameState,
  restorePersistedGameState,
} from './persisted-state'

const fallbackState: PersistedGameState = {
  schemaVersion: 4,
  mode: 'individual',
  participants: [
    { type: 'individual', id: 'player-1', name: 'Анна' },
    { type: 'individual', id: 'player-2', name: 'Марк' },
  ],
  scores: {},
  status: 'draft',
  roundIndex: 0,
  phase: 'setup',
  usedQuestionIds: [],
  activeQuestion: null,
  selectorParticipantId: null,
  history: [],
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

  it('migrates a version 1 session without losing scores or the round', () => {
    const legacyState = {
      schemaVersion: 1,
      mode: 'individual',
      participants: fallbackState.participants,
      scores: { 'player-1': 500, 'player-2': -100 },
      status: 'active',
      roundIndex: 1,
      phase: 'board',
    }

    expect(migratePersistedGameState(legacyState, 1)).toMatchObject({
      schemaVersion: 4,
      scores: legacyState.scores,
      roundIndex: 1,
      usedQuestionIds: [],
      history: [],
    })
  })

  it('migrates a version 2 question in progress as a regular question', () => {
    const legacyState = {
      ...fallbackState,
      schemaVersion: 2,
      status: 'active',
      phase: 'question',
      activeQuestion: {
        questionId: 'question-1',
        price: 300,
        eligibleParticipantIds: ['player-1', 'player-2'],
        activeParticipantId: null,
        attempts: [],
      },
    }

    expect(migratePersistedGameState(legacyState, 2)).toMatchObject({
      schemaVersion: 4,
      activeQuestion: {
        questionId: 'question-1',
        type: 'regular',
        catPriceOptions: null,
        auctionBidRange: null,
      },
    })
  })

  it('migrates a version 3 cat setup without losing its recipient', () => {
    const legacyState = {
      ...fallbackState,
      schemaVersion: 3,
      status: 'active',
      phase: 'catSetup',
      activeQuestion: {
        questionId: 'cat-1',
        type: 'cat',
        price: 300,
        catPriceOptions: [100, 500],
        eligibleParticipantIds: ['player-1', 'player-2'],
        activeParticipantId: 'player-2',
        attempts: [],
      },
    }

    expect(migratePersistedGameState(legacyState, 3)).toMatchObject({
      schemaVersion: 4,
      phase: 'catSetup',
      activeQuestion: {
        type: 'cat',
        activeParticipantId: 'player-2',
        auctionBidRange: null,
      },
    })
  })
})
