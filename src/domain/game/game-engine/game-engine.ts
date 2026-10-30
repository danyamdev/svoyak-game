import { getAuctionBidRange } from '../rules'

export type RuntimePhase =
  | 'board'
  | 'catSetup'
  | 'auctionSetup'
  | 'question'
  | 'judging'
  | 'answerReveal'
  | 'roundComplete'
  | 'finalThemeSelection'
  | 'finalWager'
  | 'finalQuestion'
  | 'finalJudging'
  | 'tieBreakerQuestion'
  | 'tieBreakerJudging'
  | 'results'

export type RuntimeQuestionType = 'regular' | 'cat' | 'auction'

export interface RuntimeBidRange {
  minimum: number
  maximum: number
}

export interface AnswerAttempt {
  participantId: string
  result: 'correct' | 'incorrect'
  scoreDelta: number
}

export interface ActiveQuestionState {
  questionId: string
  type: RuntimeQuestionType
  price: number
  catPriceOptions: [number, number] | null
  auctionBidRange: RuntimeBidRange | null
  eligibleParticipantIds: string[]
  activeParticipantId: string | null
  attempts: AnswerAttempt[]
}

export interface FinalState {
  themeIds: string[]
  eliminatedThemeIds: string[]
  selectedThemeId: string | null
  eligibleParticipantIds: string[]
  wagers: Record<string, number>
  judgedParticipantIds: string[]
  tieParticipantIds: string[]
  winnerParticipantIds: string[]
}

export interface GameRuntimeState {
  scores: Record<string, number>
  roundIndex: number
  phase: RuntimePhase
  usedQuestionIds: string[]
  activeQuestion: ActiveQuestionState | null
  selectorParticipantId: string | null
  finalState: FinalState | null
}

export type GameCommand =
  | { type: 'scoreAdjusted'; participantId: string; delta: number }
  | {
      type: 'questionSelected'
      questionId: string
      questionType: RuntimeQuestionType
      price: number
      catPriceOptions: [number, number] | null
      participantIds: string[]
    }
  | { type: 'catRecipientChosen'; participantId: string }
  | { type: 'catPriceChosen'; price: number }
  | { type: 'auctionWinnerChosen'; participantId: string }
  | { type: 'auctionBidChosen'; bid: number }
  | { type: 'answererChosen'; participantId: string }
  | { type: 'answerMarkedCorrect' }
  | { type: 'answerMarkedIncorrect' }
  | { type: 'questionSkipped' }
  | { type: 'answerClosed'; roundQuestionIds: string[] }
  | { type: 'nextRoundStarted'; totalRounds: number }
  | { type: 'finalStarted'; themeIds: string[]; participantIds: string[] }
  | { type: 'finalThemeEliminated'; themeId: string }
  | { type: 'finalWagersSubmitted'; wagers: Record<string, number> }
  | { type: 'finalQuestionOpened' }
  | { type: 'finalAnswerRevealed' }
  | { type: 'finalParticipantJudged'; participantId: string; result: 'correct' | 'incorrect' }
  | { type: 'tieBreakerAnswerRevealed' }
  | { type: 'tieBreakerWinnerChosen'; participantId: string }

/**
 * Выполняет одну игровую команду без привязки к React, Zustand или хранилищу.
 * Недопустимая для текущей фазы команда возвращает исходный объект состояния.
 */
export function transitionGame(state: GameRuntimeState, command: GameCommand): GameRuntimeState {
  switch (command.type) {
    case 'scoreAdjusted':
      return adjustScore(state, command.participantId, command.delta)
    case 'questionSelected':
      return selectQuestion(
        state,
        command.questionId,
        command.questionType,
        command.price,
        command.catPriceOptions,
        command.participantIds,
      )
    case 'catRecipientChosen':
      return chooseCatRecipient(state, command.participantId)
    case 'catPriceChosen':
      return chooseCatPrice(state, command.price)
    case 'auctionWinnerChosen':
      return chooseAuctionWinner(state, command.participantId)
    case 'auctionBidChosen':
      return chooseAuctionBid(state, command.bid)
    case 'answererChosen':
      return chooseAnswerer(state, command.participantId)
    case 'answerMarkedCorrect':
      return markCorrect(state)
    case 'answerMarkedIncorrect':
      return markIncorrect(state)
    case 'questionSkipped':
      return skipQuestion(state)
    case 'answerClosed':
      return closeAnswer(state, command.roundQuestionIds)
    case 'nextRoundStarted':
      return startNextRound(state, command.totalRounds)
    case 'finalStarted':
      return startFinal(state, command.themeIds, command.participantIds)
    case 'finalThemeEliminated':
      return eliminateFinalTheme(state, command.themeId)
    case 'finalWagersSubmitted':
      return submitFinalWagers(state, command.wagers)
    case 'finalQuestionOpened':
      return openFinalQuestion(state)
    case 'finalAnswerRevealed':
      return revealFinalAnswer(state)
    case 'finalParticipantJudged':
      return judgeFinalParticipant(state, command.participantId, command.result)
    case 'tieBreakerAnswerRevealed':
      return revealTieBreakerAnswer(state)
    case 'tieBreakerWinnerChosen':
      return chooseTieBreakerWinner(state, command.participantId)
  }
}

function adjustScore(state: GameRuntimeState, participantId: string, delta: number) {
  if (!Number.isInteger(delta) || !(participantId in state.scores)) return state

  return {
    ...state,
    scores: {
      ...state.scores,
      [participantId]: state.scores[participantId] + delta,
    },
  }
}

function selectQuestion(
  state: GameRuntimeState,
  questionId: string,
  questionType: RuntimeQuestionType,
  price: number,
  catPriceOptions: [number, number] | null,
  participantIds: string[],
) {
  if (state.phase !== 'board' || state.usedQuestionIds.includes(questionId)) return state
  if (!Number.isInteger(price) || price <= 0 || participantIds.length === 0) return state

  return {
    ...state,
    phase:
      questionType === 'cat'
        ? ('catSetup' as const)
        : questionType === 'auction'
          ? ('auctionSetup' as const)
          : ('question' as const),
    activeQuestion: {
      questionId,
      type: questionType,
      price,
      catPriceOptions,
      auctionBidRange: null,
      eligibleParticipantIds: participantIds,
      activeParticipantId: null,
      attempts: [],
    },
  }
}

function chooseAuctionWinner(state: GameRuntimeState, participantId: string) {
  const question = state.activeQuestion
  if (state.phase !== 'auctionSetup' || question?.type !== 'auction') return state
  if (!question.eligibleParticipantIds.includes(participantId)) return state

  const score = state.scores[participantId] ?? 0
  const { minimum, maximum } = getAuctionBidRange(score, question.price)

  return {
    ...state,
    activeQuestion: {
      ...question,
      activeParticipantId: participantId,
      auctionBidRange: { minimum, maximum },
    },
  }
}

function chooseAuctionBid(state: GameRuntimeState, bid: number) {
  const question = state.activeQuestion
  const participantId = question?.activeParticipantId
  const range = question?.auctionBidRange
  if (state.phase !== 'auctionSetup' || question?.type !== 'auction') return state
  if (!participantId || !range || !Number.isInteger(bid)) return state
  if (bid < range.minimum || bid > range.maximum) return state

  return {
    ...state,
    phase: 'judging' as const,
    activeQuestion: {
      ...question,
      price: bid,
      eligibleParticipantIds: [participantId],
    },
  }
}

function chooseCatRecipient(state: GameRuntimeState, participantId: string) {
  const question = state.activeQuestion
  if (state.phase !== 'catSetup' || question?.type !== 'cat') return state
  if (!question.eligibleParticipantIds.includes(participantId)) return state

  return {
    ...state,
    activeQuestion: { ...question, activeParticipantId: participantId },
  }
}

function chooseCatPrice(state: GameRuntimeState, price: number) {
  const question = state.activeQuestion
  const participantId = question?.activeParticipantId
  if (state.phase !== 'catSetup' || question?.type !== 'cat' || !participantId) return state
  if (!question.catPriceOptions?.includes(price)) return state

  return {
    ...state,
    phase: 'judging' as const,
    activeQuestion: {
      ...question,
      price,
      eligibleParticipantIds: [participantId],
    },
  }
}

function chooseAnswerer(state: GameRuntimeState, participantId: string) {
  const question = state.activeQuestion
  if (state.phase !== 'question' || !question) return state
  if (!question.eligibleParticipantIds.includes(participantId)) return state

  return {
    ...state,
    phase: 'judging' as const,
    activeQuestion: { ...question, activeParticipantId: participantId },
  }
}

function markCorrect(state: GameRuntimeState) {
  const question = state.activeQuestion
  const participantId = question?.activeParticipantId
  if (state.phase !== 'judging' || !question || !participantId) return state

  return {
    ...state,
    phase: 'answerReveal' as const,
    scores: {
      ...state.scores,
      [participantId]: (state.scores[participantId] ?? 0) + question.price,
    },
    selectorParticipantId: participantId,
    activeQuestion: {
      ...question,
      attempts: [
        ...question.attempts,
        { participantId, result: 'correct' as const, scoreDelta: question.price },
      ],
    },
  }
}

function markIncorrect(state: GameRuntimeState) {
  const question = state.activeQuestion
  const participantId = question?.activeParticipantId
  if (state.phase !== 'judging' || !question || !participantId) return state

  const eligibleParticipantIds = question.eligibleParticipantIds.filter(
    (id) => id !== participantId,
  )

  return {
    ...state,
    // Если отвечать больше некому, движок сразу переводит игру к показу ответа.
    phase: eligibleParticipantIds.length > 0 ? ('question' as const) : ('answerReveal' as const),
    scores: {
      ...state.scores,
      [participantId]: (state.scores[participantId] ?? 0) - question.price,
    },
    activeQuestion: {
      ...question,
      eligibleParticipantIds,
      activeParticipantId: null,
      attempts: [
        ...question.attempts,
        { participantId, result: 'incorrect' as const, scoreDelta: -question.price },
      ],
    },
  }
}

function skipQuestion(state: GameRuntimeState) {
  if (state.phase !== 'question' || !state.activeQuestion) return state
  return { ...state, phase: 'answerReveal' as const }
}

function closeAnswer(state: GameRuntimeState, roundQuestionIds: string[]) {
  if (state.phase !== 'answerReveal' || !state.activeQuestion) return state

  const usedQuestionIds = [...state.usedQuestionIds, state.activeQuestion.questionId]
  const isRoundComplete = roundQuestionIds.every((questionId) =>
    usedQuestionIds.includes(questionId),
  )

  return {
    ...state,
    phase: isRoundComplete ? ('roundComplete' as const) : ('board' as const),
    usedQuestionIds,
    activeQuestion: null,
  }
}

function startNextRound(state: GameRuntimeState, totalRounds: number) {
  if (state.phase !== 'roundComplete') return state
  if (state.roundIndex + 1 >= totalRounds) return state

  return {
    ...state,
    roundIndex: state.roundIndex + 1,
    phase: 'board' as const,
  }
}

function startFinal(
  state: GameRuntimeState,
  themeIds: string[],
  participantIds: string[],
): GameRuntimeState {
  if (state.phase !== 'roundComplete' || themeIds.length === 0) return state

  const eligibleParticipantIds = participantIds.filter((id) => (state.scores[id] ?? 0) > 0)
  const finalState: FinalState = {
    themeIds,
    eliminatedThemeIds: [],
    selectedThemeId: null,
    eligibleParticipantIds,
    wagers: {},
    judgedParticipantIds: [],
    tieParticipantIds: [],
    winnerParticipantIds: [],
  }

  if (eligibleParticipantIds.length === 0) {
    return finishByScores({ ...state, finalState }, participantIds)
  }

  return { ...state, phase: 'finalThemeSelection', finalState }
}

function eliminateFinalTheme(state: GameRuntimeState, themeId: string): GameRuntimeState {
  const finalState = state.finalState
  if (state.phase !== 'finalThemeSelection' || !finalState) return state
  if (!finalState.themeIds.includes(themeId) || finalState.eliminatedThemeIds.includes(themeId)) {
    return state
  }

  const remainingThemeIds = finalState.themeIds.filter(
    (id) => id !== themeId && !finalState.eliminatedThemeIds.includes(id),
  )
  if (remainingThemeIds.length === 0) return state

  const eliminatedThemeIds = [...finalState.eliminatedThemeIds, themeId]
  return {
    ...state,
    phase: remainingThemeIds.length === 1 ? ('finalWager' as const) : state.phase,
    finalState: {
      ...finalState,
      eliminatedThemeIds,
      selectedThemeId: remainingThemeIds.length === 1 ? remainingThemeIds[0] : null,
    },
  }
}

function submitFinalWagers(
  state: GameRuntimeState,
  wagers: Record<string, number>,
): GameRuntimeState {
  const finalState = state.finalState
  if (state.phase !== 'finalWager' || !finalState) return state

  const areWagersValid = finalState.eligibleParticipantIds.every((participantId) => {
    const wager = wagers[participantId]
    return Number.isInteger(wager) && wager >= 1 && wager <= (state.scores[participantId] ?? 0)
  })
  if (!areWagersValid) return state

  return { ...state, finalState: { ...finalState, wagers } }
}

function openFinalQuestion(state: GameRuntimeState): GameRuntimeState {
  const finalState = state.finalState
  if (state.phase !== 'finalWager' || !finalState) return state
  if (Object.keys(finalState.wagers).length !== finalState.eligibleParticipantIds.length)
    return state

  return { ...state, phase: 'finalQuestion' as const }
}

function revealFinalAnswer(state: GameRuntimeState): GameRuntimeState {
  if (state.phase !== 'finalQuestion' || !state.finalState) return state
  return { ...state, phase: 'finalJudging' as const }
}

function judgeFinalParticipant(
  state: GameRuntimeState,
  participantId: string,
  result: 'correct' | 'incorrect',
): GameRuntimeState {
  const finalState = state.finalState
  if (state.phase !== 'finalJudging' || !finalState) return state
  if (!finalState.eligibleParticipantIds.includes(participantId)) return state
  if (finalState.judgedParticipantIds.includes(participantId)) return state

  const wager = finalState.wagers[participantId]
  if (!wager) return state

  const judgedParticipantIds = [...finalState.judgedParticipantIds, participantId]
  const nextState = {
    ...state,
    scores: {
      ...state.scores,
      [participantId]: (state.scores[participantId] ?? 0) + (result === 'correct' ? wager : -wager),
    },
    finalState: { ...finalState, judgedParticipantIds },
  }

  if (judgedParticipantIds.length < finalState.eligibleParticipantIds.length) return nextState
  return finishByScores(nextState, finalState.eligibleParticipantIds)
}

function finishByScores(state: GameRuntimeState, participantIds: string[]): GameRuntimeState {
  const finalState = state.finalState
  if (!finalState || participantIds.length === 0) return state

  const highestScore = Math.max(...participantIds.map((id) => state.scores[id] ?? 0))
  const leaders = participantIds.filter((id) => (state.scores[id] ?? 0) === highestScore)

  return {
    ...state,
    phase: leaders.length > 1 ? 'tieBreakerQuestion' : 'results',
    finalState: {
      ...finalState,
      tieParticipantIds: leaders.length > 1 ? leaders : [],
      winnerParticipantIds: leaders.length === 1 ? leaders : [],
    },
  }
}

function revealTieBreakerAnswer(state: GameRuntimeState): GameRuntimeState {
  if (state.phase !== 'tieBreakerQuestion' || !state.finalState) return state
  return { ...state, phase: 'tieBreakerJudging' as const }
}

function chooseTieBreakerWinner(state: GameRuntimeState, participantId: string): GameRuntimeState {
  const finalState = state.finalState
  if (state.phase !== 'tieBreakerJudging' || !finalState) return state
  if (!finalState.tieParticipantIds.includes(participantId)) return state

  return {
    ...state,
    phase: 'results' as const,
    finalState: { ...finalState, winnerParticipantIds: [participantId] },
  }
}
