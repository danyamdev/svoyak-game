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

export const persistedGameStateSchema = z.object({
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

export function restorePersistedGameState(
  persistedState: unknown,
  fallbackState: PersistedGameState,
): PersistedGameState {
  const result = persistedGameStateSchema.safeParse(persistedState)

  // localStorage может быть изменён вручную или содержать данные старой версии.
  // Возврат к начальному состоянию безопаснее частичного восстановления партии.
  return result.success ? result.data : fallbackState
}
