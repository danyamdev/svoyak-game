import { describe, expect, it } from 'vitest'

import { type GameRuntimeState, transitionGame } from './game-engine'

const initialState: GameRuntimeState = {
  scores: { player1: 0, player2: 0 },
  roundIndex: 0,
  phase: 'board',
  usedQuestionIds: [],
  activeQuestion: null,
  selectorParticipantId: 'player1',
}

describe('transitionGame', () => {
  it('opens a question and assigns an eligible answerer', () => {
    const questionState = transitionGame(initialState, {
      type: 'questionSelected',
      questionId: 'q1',
      price: 100,
      participantIds: ['player1', 'player2'],
    })
    const judgingState = transitionGame(questionState, {
      type: 'answererChosen',
      participantId: 'player1',
    })

    expect(judgingState).toMatchObject({
      phase: 'judging',
      activeQuestion: { questionId: 'q1', activeParticipantId: 'player1' },
    })
  })

  it('subtracts points and lets another participant answer after a mistake', () => {
    const questionState = transitionGame(initialState, {
      type: 'questionSelected',
      questionId: 'q1',
      price: 100,
      participantIds: ['player1', 'player2'],
    })
    const judgingState = transitionGame(questionState, {
      type: 'answererChosen',
      participantId: 'player1',
    })
    const result = transitionGame(judgingState, { type: 'answerMarkedIncorrect' })

    expect(result.scores.player1).toBe(-100)
    expect(result.phase).toBe('question')
    expect(result.activeQuestion?.eligibleParticipantIds).toEqual(['player2'])
  })

  it('adds points and transfers the right to select a question', () => {
    const questionState = transitionGame(initialState, {
      type: 'questionSelected',
      questionId: 'q1',
      price: 200,
      participantIds: ['player1', 'player2'],
    })
    const judgingState = transitionGame(questionState, {
      type: 'answererChosen',
      participantId: 'player2',
    })
    const result = transitionGame(judgingState, { type: 'answerMarkedCorrect' })

    expect(result.scores.player2).toBe(200)
    expect(result.selectorParticipantId).toBe('player2')
    expect(result.phase).toBe('answerReveal')
  })

  it('finishes a round after its final question is closed', () => {
    const answerState: GameRuntimeState = {
      ...initialState,
      phase: 'answerReveal',
      usedQuestionIds: ['q1'],
      activeQuestion: {
        questionId: 'q2',
        price: 100,
        eligibleParticipantIds: ['player1'],
        activeParticipantId: null,
        attempts: [],
      },
    }

    const result = transitionGame(answerState, {
      type: 'answerClosed',
      roundQuestionIds: ['q1', 'q2'],
    })

    expect(result.phase).toBe('roundComplete')
    expect(result.usedQuestionIds).toEqual(['q1', 'q2'])
  })

  it('starts the next round only from the completion screen', () => {
    const completedState: GameRuntimeState = { ...initialState, phase: 'roundComplete' }
    const result = transitionGame(completedState, { type: 'nextRoundStarted', totalRounds: 3 })

    expect(result.roundIndex).toBe(1)
    expect(result.phase).toBe('board')
  })

  it('ignores a command that is invalid for the current phase', () => {
    expect(transitionGame(initialState, { type: 'answererChosen', participantId: 'player1' })).toBe(
      initialState,
    )
  })
})
