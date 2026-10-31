import { describe, expect, it } from 'vitest'

import {
  type PersistedGameState,
  migratePersistedGameState,
  restorePersistedGameState,
} from './persisted-state'

const fallbackState: PersistedGameState = {
  schemaVersion: 5,
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
  finalState: null,
  history: [],
  areScoresVisible: false,
  questionTimer: {
    durationSeconds: 30,
    status: 'idle',
    remainingMs: 30_000,
    endsAt: null,
  },
}

const regularQuestion = {
  questionId: 'question-1',
  type: 'regular' as const,
  price: 300,
  catPriceOptions: null,
  auctionBidRange: null,
  eligibleParticipantIds: ['player-1', 'player-2'],
  activeParticipantId: null,
  attempts: [],
  acceptedAnswerScores: [],
  pendingOutcome: null,
}

const catQuestion = {
  ...regularQuestion,
  questionId: 'cat-1',
  type: 'cat' as const,
  catPriceOptions: [100, 500] as [number, number],
}

const auctionQuestion = {
  ...regularQuestion,
  questionId: 'auction-1',
  type: 'auction' as const,
}

const finalState = {
  themeIds: ['theme-1'],
  eliminatedThemeIds: [],
  selectedThemeId: null,
  eligibleParticipantIds: ['player-1', 'player-2'],
  wagers: {},
  judgedParticipantIds: [],
  tieParticipantIds: [],
  winnerParticipantIds: [],
}

const runtimePhaseCases: [
  PersistedGameState['phase'],
  PersistedGameState['activeQuestion'],
  PersistedGameState['finalState'],
][] = [
  ['board', null, null],
  ['catSetup', catQuestion, null],
  ['auctionSetup', auctionQuestion, null],
  ['question', regularQuestion, null],
  ['judging', regularQuestion, null],
  ['answerReveal', regularQuestion, null],
  ['roundComplete', null, null],
  ['finalThemeSelection', null, finalState],
  ['finalWager', null, finalState],
  ['finalQuestion', null, finalState],
  ['finalJudging', null, finalState],
  ['tieBreakerQuestion', null, finalState],
  ['tieBreakerJudging', null, finalState],
  ['results', null, finalState],
]

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

  it.each(runtimePhaseCases)(
    'restores a coherent %s phase',
    (phase, activeQuestion, finalState) => {
      const persistedState: PersistedGameState = {
        ...fallbackState,
        scores: { 'player-1': 700, 'player-2': -200 },
        status: 'active',
        phase,
        activeQuestion,
        selectorParticipantId: 'player-1',
        finalState,
      }

      expect(restorePersistedGameState(persistedState, fallbackState)).toEqual(persistedState)
    },
  )

  it('uses a safe fallback when localStorage contains invalid data', () => {
    expect(
      restorePersistedGameState({ schemaVersion: 99, scores: 'broken' }, fallbackState),
    ).toEqual(fallbackState)
  })

  it('rejects a question phase without an active question', () => {
    const inconsistentState = {
      ...fallbackState,
      status: 'active',
      phase: 'judging',
      scores: { 'player-1': 0, 'player-2': 0 },
      selectorParticipantId: 'player-1',
    }

    expect(restorePersistedGameState(inconsistentState, fallbackState)).toEqual(fallbackState)
  })

  it('rejects participant references absent from the session', () => {
    const inconsistentState = {
      ...fallbackState,
      status: 'active',
      phase: 'question',
      scores: { 'player-1': 0, 'player-2': 0 },
      selectorParticipantId: 'player-1',
      activeQuestion: {
        ...regularQuestion,
        activeParticipantId: 'missing-player',
      },
    }

    expect(restorePersistedGameState(inconsistentState, fallbackState)).toEqual(fallbackState)
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
      schemaVersion: 5,
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
      schemaVersion: 5,
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
      schemaVersion: 5,
      phase: 'catSetup',
      activeQuestion: {
        type: 'cat',
        activeParticipantId: 'player-2',
        auctionBidRange: null,
      },
    })
  })

  it('migrates a version 4 game by adding an empty final state', () => {
    const legacyState = { ...fallbackState, schemaVersion: 4 }

    expect(migratePersistedGameState(legacyState, 4)).toMatchObject({
      schemaVersion: 5,
      finalState: null,
    })
  })
})
