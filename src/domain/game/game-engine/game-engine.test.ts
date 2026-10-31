import { describe, expect, it } from 'vitest'

import { type GameRuntimeState, transitionGame } from './game-engine'

const initialState: GameRuntimeState = {
  scores: { player1: 0, player2: 0 },
  roundIndex: 0,
  phase: 'board',
  usedQuestionIds: [],
  activeQuestion: null,
  selectorParticipantId: 'player1',
  finalState: null,
}

describe('transitionGame', () => {
  it('applies an arbitrary integer score correction', () => {
    const result = transitionGame(initialState, {
      type: 'scoreAdjusted',
      participantId: 'player1',
      delta: -250,
    })

    expect(result.scores.player1).toBe(-250)
  })

  it('ignores an empty score correction', () => {
    expect(
      transitionGame(initialState, {
        type: 'scoreAdjusted',
        participantId: 'player1',
        delta: 0,
      }),
    ).toBe(initialState)
  })

  it('opens a question and assigns an eligible answerer', () => {
    const questionState = transitionGame(initialState, {
      type: 'questionSelected',
      questionId: 'q1',
      questionType: 'regular',
      price: 100,
      catPriceOptions: null,
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
      questionType: 'regular',
      price: 100,
      catPriceOptions: null,
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
      questionType: 'regular',
      price: 200,
      catPriceOptions: null,
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
        type: 'regular',
        price: 100,
        catPriceOptions: null,
        auctionBidRange: null,
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

  it('assigns a cat recipient and uses one of the round edge prices', () => {
    const catState = transitionGame(initialState, {
      type: 'questionSelected',
      questionId: 'cat-1',
      questionType: 'cat',
      price: 300,
      catPriceOptions: [100, 500],
      participantIds: ['player1', 'player2'],
    })
    const recipientState = transitionGame(catState, {
      type: 'catRecipientChosen',
      participantId: 'player2',
    })
    const result = transitionGame(recipientState, { type: 'catPriceChosen', price: 500 })

    expect(result).toMatchObject({
      phase: 'judging',
      activeQuestion: {
        price: 500,
        activeParticipantId: 'player2',
        eligibleParticipantIds: ['player2'],
      },
    })
  })

  it('rejects a cat price outside the configured min/max pair', () => {
    const catState = transitionGame(initialState, {
      type: 'questionSelected',
      questionId: 'cat-1',
      questionType: 'cat',
      price: 300,
      catPriceOptions: [100, 500],
      participantIds: ['player1', 'player2'],
    })
    const recipientState = transitionGame(catState, {
      type: 'catRecipientChosen',
      participantId: 'player1',
    })

    expect(transitionGame(recipientState, { type: 'catPriceChosen', price: 300 })).toBe(
      recipientState,
    )
  })

  it('accepts the final auction bid within the winner score', () => {
    const auctionState = transitionGame(
      { ...initialState, scores: { player1: 1200, player2: 0 } },
      {
        type: 'questionSelected',
        questionId: 'auction-1',
        questionType: 'auction',
        price: 500,
        catPriceOptions: null,
        participantIds: ['player1', 'player2'],
      },
    )
    const winnerState = transitionGame(auctionState, {
      type: 'auctionWinnerChosen',
      participantId: 'player1',
    })
    const result = transitionGame(winnerState, { type: 'auctionBidChosen', bid: 900 })

    expect(result).toMatchObject({
      phase: 'judging',
      activeQuestion: {
        price: 900,
        activeParticipantId: 'player1',
        eligibleParticipantIds: ['player1'],
      },
    })
  })

  it('limits a non-positive auction winner to the nominal price', () => {
    const auctionState = transitionGame(
      { ...initialState, scores: { player1: 0, player2: -200 } },
      {
        type: 'questionSelected',
        questionId: 'auction-1',
        questionType: 'auction',
        price: 500,
        catPriceOptions: null,
        participantIds: ['player1', 'player2'],
      },
    )
    const winnerState = transitionGame(auctionState, {
      type: 'auctionWinnerChosen',
      participantId: 'player2',
    })

    expect(winnerState.activeQuestion?.auctionBidRange).toEqual({ minimum: 500, maximum: 500 })
    expect(transitionGame(winnerState, { type: 'auctionBidChosen', bid: 600 })).toBe(winnerState)
  })

  it('plays the final and resolves equal scores with a tie-breaker', () => {
    let state: GameRuntimeState = {
      ...initialState,
      phase: 'roundComplete',
      scores: { player1: 1000, player2: 800 },
    }

    state = transitionGame(state, {
      type: 'finalStarted',
      themeIds: ['t1', 't2', 't3', 't4', 't5', 't6', 't7'],
      participantIds: ['player1', 'player2'],
    })
    for (const themeId of ['t1', 't2', 't3', 't4', 't5', 't6']) {
      state = transitionGame(state, { type: 'finalThemeEliminated', themeId })
    }

    expect(state.phase).toBe('finalWager')
    expect(state.finalState?.selectedThemeId).toBe('t7')

    state = transitionGame(state, {
      type: 'finalWagersSubmitted',
      wagers: { player1: 500, player2: 700 },
    })
    state = transitionGame(state, { type: 'finalQuestionOpened' })
    state = transitionGame(state, { type: 'finalAnswerRevealed' })
    state = transitionGame(state, {
      type: 'finalParticipantJudged',
      participantId: 'player1',
      result: 'correct',
    })
    state = transitionGame(state, {
      type: 'finalParticipantJudged',
      participantId: 'player2',
      result: 'correct',
    })

    expect(state.phase).toBe('tieBreakerQuestion')
    expect(state.scores).toEqual({ player1: 1500, player2: 1500 })

    state = transitionGame(state, { type: 'tieBreakerAnswerRevealed' })
    state = transitionGame(state, {
      type: 'tieBreakerWinnerChosen',
      participantId: 'player2',
    })

    expect(state.phase).toBe('results')
    expect(state.finalState?.winnerParticipantIds).toEqual(['player2'])
  })

  it('does not admit a participant with a non-positive score to the final', () => {
    const result = transitionGame(
      {
        ...initialState,
        phase: 'roundComplete',
        scores: { player1: 500, player2: 0 },
      },
      {
        type: 'finalStarted',
        themeIds: ['t1'],
        participantIds: ['player1', 'player2'],
      },
    )

    expect(result.finalState?.eligibleParticipantIds).toEqual(['player1'])
  })

  it('ignores a command that is invalid for the current phase', () => {
    expect(transitionGame(initialState, { type: 'answererChosen', participantId: 'player1' })).toBe(
      initialState,
    )
  })
})
