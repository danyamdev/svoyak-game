export type RuntimePhase = 'board' | 'question' | 'judging' | 'answerReveal' | 'roundComplete'

export interface AnswerAttempt {
  participantId: string
  result: 'correct' | 'incorrect'
  scoreDelta: number
}

export interface ActiveQuestionState {
  questionId: string
  price: number
  eligibleParticipantIds: string[]
  activeParticipantId: string | null
  attempts: AnswerAttempt[]
}

export interface GameRuntimeState {
  scores: Record<string, number>
  roundIndex: number
  phase: RuntimePhase
  usedQuestionIds: string[]
  activeQuestion: ActiveQuestionState | null
  selectorParticipantId: string | null
}

export type GameCommand =
  | { type: 'scoreAdjusted'; participantId: string; delta: number }
  | { type: 'questionSelected'; questionId: string; price: number; participantIds: string[] }
  | { type: 'answererChosen'; participantId: string }
  | { type: 'answerMarkedCorrect' }
  | { type: 'answerMarkedIncorrect' }
  | { type: 'questionSkipped' }
  | { type: 'answerClosed'; roundQuestionIds: string[] }
  | { type: 'nextRoundStarted'; totalRounds: number }

/**
 * Выполняет одну игровую команду без привязки к React, Zustand или хранилищу.
 * Недопустимая для текущей фазы команда возвращает исходный объект состояния.
 */
export function transitionGame(state: GameRuntimeState, command: GameCommand): GameRuntimeState {
  switch (command.type) {
    case 'scoreAdjusted':
      return adjustScore(state, command.participantId, command.delta)
    case 'questionSelected':
      return selectQuestion(state, command.questionId, command.price, command.participantIds)
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
  price: number,
  participantIds: string[],
) {
  if (state.phase !== 'board' || state.usedQuestionIds.includes(questionId)) return state
  if (!Number.isInteger(price) || price <= 0 || participantIds.length === 0) return state

  return {
    ...state,
    phase: 'question' as const,
    activeQuestion: {
      questionId,
      price,
      eligibleParticipantIds: participantIds,
      activeParticipantId: null,
      attempts: [],
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
