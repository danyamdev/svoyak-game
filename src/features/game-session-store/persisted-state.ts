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
  result: z.enum(['correct', 'incorrect']),
  scoreDelta: z.number().int(),
})

const activeQuestionSchema = z.object({
  questionId: z.string().min(1),
  price: z.number().int().positive(),
  eligibleParticipantIds: z.array(z.string().min(1)),
  activeParticipantId: z.string().min(1).nullable(),
  attempts: z.array(attemptSchema),
})

const runtimeSnapshotSchema = z.object({
  scores: z.record(z.string(), z.number().int()),
  roundIndex: z.number().int().min(0).max(2),
  phase: z.enum(['board', 'question', 'judging', 'answerReveal', 'roundComplete']),
  usedQuestionIds: z.array(z.string().min(1)),
  activeQuestion: activeQuestionSchema.nullable(),
  selectorParticipantId: z.string().min(1).nullable(),
})

export const persistedGameStateSchema = z.object({
  schemaVersion: z.literal(2),
  mode: z.enum(['individual', 'team']),
  participants: z.array(participantDraftSchema).min(2).max(5),
  scores: z.record(z.string(), z.number().int()),
  status: z.enum(['draft', 'active']),
  roundIndex: z.number().int().min(0).max(2),
  phase: z.enum(['setup', 'board', 'question', 'judging', 'answerReveal', 'roundComplete']),
  usedQuestionIds: z.array(z.string().min(1)),
  activeQuestion: activeQuestionSchema.nullable(),
  selectorParticipantId: z.string().min(1).nullable(),
  history: z.array(runtimeSnapshotSchema).max(50),
})

const legacyStateSchema = z.object({
  schemaVersion: z.literal(1),
  mode: z.enum(['individual', 'team']),
  participants: z.array(participantDraftSchema).min(2).max(5),
  scores: z.record(z.string(), z.number().int()),
  status: z.enum(['draft', 'active']),
  roundIndex: z.number().int().min(0).max(2),
  phase: z.enum(['setup', 'board']),
})

export type GameMode = z.infer<typeof persistedGameStateSchema.shape.mode>
export type ParticipantDraft = z.infer<typeof participantDraftSchema>
export type PersistedGameState = z.infer<typeof persistedGameStateSchema>
export type RuntimeSnapshot = z.infer<typeof runtimeSnapshotSchema>

export function migratePersistedGameState(persistedState: unknown, version: number): unknown {
  if (version !== 1) return persistedState

  const legacyState = legacyStateSchema.safeParse(persistedState)
  if (!legacyState.success) return persistedState

  return {
    ...legacyState.data,
    schemaVersion: 2,
    usedQuestionIds: [],
    activeQuestion: null,
    selectorParticipantId: legacyState.data.participants[0]?.id ?? null,
    history: [],
  }
}

export function restorePersistedGameState(
  persistedState: unknown,
  fallbackState: PersistedGameState,
): PersistedGameState {
  const result = persistedGameStateSchema.safeParse(persistedState)

  // localStorage может быть изменён вручную или содержать данные старой версии.
  // Возврат к начальному состоянию безопаснее частичного восстановления партии.
  return result.success ? result.data : fallbackState
}
