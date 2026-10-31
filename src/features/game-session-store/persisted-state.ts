import { z } from 'zod'

const personDraftSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
})

const individualDraftSchema = z.object({
  type: z.literal('individual'),
  id: z.string().min(1),
  name: z.string(),
})

const teamDraftSchema = z.object({
  type: z.literal('team'),
  id: z.string().min(1),
  name: z.string(),
  members: z.array(personDraftSchema).min(1).max(5),
})

export const participantDraftSchema = z.discriminatedUnion('type', [
  individualDraftSchema,
  teamDraftSchema,
])

const attemptSchema = z.object({
  participantId: z.string().min(1),
  result: z.enum(['correct', 'accepted', 'incorrect']),
  scoreDelta: z.number().int(),
})

const legacyActiveQuestionV2Schema = z.object({
  questionId: z.string().min(1),
  price: z.number().int().positive(),
  eligibleParticipantIds: z.array(z.string().min(1)),
  activeParticipantId: z.string().min(1).nullable(),
  attempts: z.array(attemptSchema),
})

const legacyActiveQuestionV3Schema = legacyActiveQuestionV2Schema.extend({
  type: z.enum(['regular', 'cat']),
  catPriceOptions: z.tuple([z.number().int().positive(), z.number().int().positive()]).nullable(),
})

const activeQuestionSchema = legacyActiveQuestionV3Schema.extend({
  type: z.enum(['regular', 'cat', 'auction']),
  auctionBidRange: z
    .object({
      minimum: z.number().int().positive(),
      maximum: z.number().int().positive(),
    })
    .nullable(),
  attempts: z.array(attemptSchema),
  acceptedAnswerScores: z.array(z.number().int().nonnegative()).default([]),
  pendingOutcome: z
    .object({
      result: z.enum(['correct', 'accepted', 'incorrect']),
      scoreDelta: z.number().int(),
    })
    .nullable()
    .default(null),
})

const questionTimerSchema = z.object({
  durationSeconds: z.number().int().min(5).max(300),
  status: z.enum(['idle', 'running', 'paused', 'expired']),
  remainingMs: z.number().int().nonnegative(),
  endsAt: z.number().int().positive().nullable(),
})

const finalStateSchema = z.object({
  themeIds: z.array(z.string().min(1)),
  eliminatedThemeIds: z.array(z.string().min(1)),
  selectedThemeId: z.string().min(1).nullable(),
  eligibleParticipantIds: z.array(z.string().min(1)),
  wagers: z.record(z.string(), z.number().int().positive()),
  judgedParticipantIds: z.array(z.string().min(1)),
  tieParticipantIds: z.array(z.string().min(1)),
  winnerParticipantIds: z.array(z.string().min(1)),
})

const runtimePhaseSchema = z.enum([
  'board',
  'catSetup',
  'auctionSetup',
  'question',
  'judging',
  'answerReveal',
  'roundComplete',
  'finalThemeSelection',
  'finalWager',
  'finalQuestion',
  'finalJudging',
  'tieBreakerQuestion',
  'tieBreakerJudging',
  'results',
])

const runtimeSnapshotSchema = z.object({
  scores: z.record(z.string(), z.number().int()),
  roundIndex: z.number().int().min(0).max(2),
  phase: runtimePhaseSchema,
  usedQuestionIds: z.array(z.string().min(1)),
  activeQuestion: activeQuestionSchema.nullable(),
  selectorParticipantId: z.string().min(1).nullable(),
  finalState: finalStateSchema.nullable(),
})

export const persistedGameStateSchema = z.object({
  schemaVersion: z.literal(5),
  mode: z.enum(['individual', 'team']),
  participants: z.array(participantDraftSchema).min(2).max(5),
  scores: z.record(z.string(), z.number().int()),
  status: z.enum(['draft', 'active']),
  roundIndex: z.number().int().min(0).max(2),
  phase: z.union([z.literal('setup'), runtimePhaseSchema]),
  usedQuestionIds: z.array(z.string().min(1)),
  activeQuestion: activeQuestionSchema.nullable(),
  selectorParticipantId: z.string().min(1).nullable(),
  finalState: finalStateSchema.nullable(),
  history: z.array(runtimeSnapshotSchema).max(50),
  areScoresVisible: z.boolean().default(false),
  questionTimer: questionTimerSchema.default({
    durationSeconds: 30,
    status: 'idle',
    remainingMs: 30_000,
    endsAt: null,
  }),
})

const legacyStateV1Schema = z.object({
  schemaVersion: z.literal(1),
  mode: z.enum(['individual', 'team']),
  participants: z.array(participantDraftSchema).min(2).max(5),
  scores: z.record(z.string(), z.number().int()),
  status: z.enum(['draft', 'active']),
  roundIndex: z.number().int().min(0).max(2),
  phase: z.enum(['setup', 'board']),
})

const legacyRuntimeSnapshotV2Schema = runtimeSnapshotSchema.extend({
  phase: z.enum(['board', 'question', 'judging', 'answerReveal', 'roundComplete']),
  activeQuestion: legacyActiveQuestionV2Schema.nullable(),
  finalState: z.null().optional(),
})

const legacyStateV2Schema = persistedGameStateSchema.extend({
  schemaVersion: z.literal(2),
  phase: z.enum(['setup', 'board', 'question', 'judging', 'answerReveal', 'roundComplete']),
  activeQuestion: legacyActiveQuestionV2Schema.nullable(),
  finalState: z.null().optional(),
  history: z.array(legacyRuntimeSnapshotV2Schema).max(50),
})

const legacyRuntimeSnapshotV3Schema = runtimeSnapshotSchema.extend({
  phase: z.enum(['board', 'catSetup', 'question', 'judging', 'answerReveal', 'roundComplete']),
  activeQuestion: legacyActiveQuestionV3Schema.nullable(),
  finalState: z.null().optional(),
})

const legacyStateV3Schema = persistedGameStateSchema.extend({
  schemaVersion: z.literal(3),
  phase: z.enum([
    'setup',
    'board',
    'catSetup',
    'question',
    'judging',
    'answerReveal',
    'roundComplete',
  ]),
  activeQuestion: legacyActiveQuestionV3Schema.nullable(),
  finalState: z.null().optional(),
  history: z.array(legacyRuntimeSnapshotV3Schema).max(50),
})

const legacyRuntimeSnapshotV4Schema = runtimeSnapshotSchema.extend({
  phase: z.enum([
    'board',
    'catSetup',
    'auctionSetup',
    'question',
    'judging',
    'answerReveal',
    'roundComplete',
  ]),
  finalState: z.null().optional(),
})

const legacyStateV4Schema = persistedGameStateSchema.extend({
  schemaVersion: z.literal(4),
  phase: z.enum([
    'setup',
    'board',
    'catSetup',
    'auctionSetup',
    'question',
    'judging',
    'answerReveal',
    'roundComplete',
  ]),
  finalState: z.null().optional(),
  history: z.array(legacyRuntimeSnapshotV4Schema).max(50),
})

export type GameMode = z.infer<typeof persistedGameStateSchema.shape.mode>
export type ParticipantDraft = z.infer<typeof participantDraftSchema>
export type PersistedGameState = z.infer<typeof persistedGameStateSchema>
export type RuntimeSnapshot = z.infer<typeof runtimeSnapshotSchema>
export type QuestionTimerState = z.infer<typeof questionTimerSchema>

const QUESTION_PHASES = new Set<RuntimeSnapshot['phase']>([
  'catSetup',
  'auctionSetup',
  'question',
  'judging',
  'answerReveal',
])

const FINAL_PHASES = new Set<RuntimeSnapshot['phase']>([
  'finalThemeSelection',
  'finalWager',
  'finalQuestion',
  'finalJudging',
  'tieBreakerQuestion',
  'tieBreakerJudging',
  'results',
])

function hasKnownParticipantIds(ids: string[], participantIds: Set<string>) {
  return ids.every((id) => participantIds.has(id))
}

function isRuntimeSnapshotCoherent(snapshot: RuntimeSnapshot, participantIds: Set<string>) {
  const requiresQuestion = QUESTION_PHASES.has(snapshot.phase)
  const requiresFinalState = FINAL_PHASES.has(snapshot.phase)

  if (requiresQuestion !== Boolean(snapshot.activeQuestion)) return false
  if (requiresFinalState !== Boolean(snapshot.finalState)) return false
  if (snapshot.selectorParticipantId && !participantIds.has(snapshot.selectorParticipantId)) {
    return false
  }

  if (!Object.keys(snapshot.scores).every((id) => participantIds.has(id))) return false
  if (![...participantIds].every((id) => id in snapshot.scores)) return false

  const question = snapshot.activeQuestion
  if (question) {
    if (!hasKnownParticipantIds(question.eligibleParticipantIds, participantIds)) return false
    if (question.activeParticipantId && !participantIds.has(question.activeParticipantId)) {
      return false
    }
    if (
      !hasKnownParticipantIds(
        question.attempts.map(({ participantId }) => participantId),
        participantIds,
      )
    ) {
      return false
    }
    if (snapshot.phase === 'catSetup' && question.type !== 'cat') return false
    if (snapshot.phase === 'auctionSetup' && question.type !== 'auction') return false
    if (snapshot.phase === 'question' && question.type !== 'regular') return false
  }

  const finalState = snapshot.finalState
  if (finalState) {
    const referencedParticipantIds = [
      ...finalState.eligibleParticipantIds,
      ...finalState.judgedParticipantIds,
      ...finalState.tieParticipantIds,
      ...finalState.winnerParticipantIds,
      ...Object.keys(finalState.wagers),
    ]
    if (!hasKnownParticipantIds(referencedParticipantIds, participantIds)) return false
  }

  return true
}

function isPersistedStateCoherent(state: PersistedGameState) {
  if (state.status === 'draft') {
    return (
      state.phase === 'setup' &&
      state.activeQuestion === null &&
      state.finalState === null &&
      state.history.length === 0
    )
  }

  const phase = state.phase
  if (phase === 'setup') return false

  const participantIds = new Set(state.participants.map(({ id }) => id))
  return (
    isRuntimeSnapshotCoherent({ ...state, phase }, participantIds) &&
    state.history.every((snapshot) => isRuntimeSnapshotCoherent(snapshot, participantIds))
  )
}

export function migratePersistedGameState(persistedState: unknown, version: number): unknown {
  if (version === 4) {
    const legacyState = legacyStateV4Schema.safeParse(persistedState)
    if (!legacyState.success) return persistedState

    return {
      ...legacyState.data,
      schemaVersion: 5,
      finalState: null,
      history: legacyState.data.history.map((snapshot) => ({ ...snapshot, finalState: null })),
    }
  }

  if (version === 3) {
    const legacyState = legacyStateV3Schema.safeParse(persistedState)
    if (!legacyState.success) return persistedState

    return {
      ...legacyState.data,
      schemaVersion: 5,
      activeQuestion: upgradeV3ActiveQuestion(legacyState.data.activeQuestion),
      finalState: null,
      history: legacyState.data.history.map((snapshot) => ({
        ...snapshot,
        activeQuestion: upgradeV3ActiveQuestion(snapshot.activeQuestion),
        finalState: null,
      })),
    }
  }

  if (version === 2) {
    const legacyState = legacyStateV2Schema.safeParse(persistedState)
    if (!legacyState.success) return persistedState

    return {
      ...legacyState.data,
      schemaVersion: 5,
      activeQuestion: upgradeV2ActiveQuestion(legacyState.data.activeQuestion),
      finalState: null,
      history: legacyState.data.history.map((snapshot) => ({
        ...snapshot,
        activeQuestion: upgradeV2ActiveQuestion(snapshot.activeQuestion),
        finalState: null,
      })),
    }
  }

  if (version !== 1) return persistedState

  const legacyState = legacyStateV1Schema.safeParse(persistedState)
  if (!legacyState.success) return persistedState

  return {
    ...legacyState.data,
    schemaVersion: 5,
    usedQuestionIds: [],
    activeQuestion: null,
    selectorParticipantId: legacyState.data.participants[0]?.id ?? null,
    finalState: null,
    history: [],
  }
}

function upgradeV2ActiveQuestion(
  question: z.infer<typeof legacyActiveQuestionV2Schema> | null,
): z.infer<typeof activeQuestionSchema> | null {
  if (!question) return null

  // До версии 3 все активные вопросы были обычными, поэтому миграция не меняет их ход.
  return {
    ...question,
    type: 'regular',
    catPriceOptions: null,
    auctionBidRange: null,
    acceptedAnswerScores: [],
    pendingOutcome: null,
  }
}

function upgradeV3ActiveQuestion(
  question: z.infer<typeof legacyActiveQuestionV3Schema> | null,
): z.infer<typeof activeQuestionSchema> | null {
  if (!question) return null

  return {
    ...question,
    auctionBidRange: null,
    acceptedAnswerScores: [],
    pendingOutcome: null,
  }
}

export function restorePersistedGameState(
  persistedState: unknown,
  fallbackState: PersistedGameState,
): PersistedGameState {
  const result = persistedGameStateSchema.safeParse(persistedState)

  // Одной проверки формы недостаточно: фаза вопроса без вопроса формально валидна,
  // но после восстановления заблокирует UI. В таком случае безопаснее начать с fallback.
  return result.success && isPersistedStateCoherent(result.data) ? result.data : fallbackState
}
