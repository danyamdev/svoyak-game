import { z } from 'zod'

import { participantsSchema } from './participants'

export const gamePhaseSchema = z.enum([
  'setup',
  'board',
  'catSetup',
  'auctionSetup',
  'question',
  'judging',
  'answerReveal',
  'roundComplete',
  'finalCategorySelection',
  'finalWager',
  'finalQuestion',
  'finalJudging',
  'tieBreaker',
  'results',
])

const attemptSchema = z.object({
  participantId: z.string().trim().min(1),
  result: z.enum(['correct', 'incorrect']),
  scoreDelta: z.number().int(),
})

const activeQuestionSchema = z.object({
  questionId: z.string().trim().min(1),
  type: z.enum(['regular', 'cat', 'auction']),
  price: z.number().int().positive(),
  catPriceOptions: z.tuple([z.number().int().positive(), z.number().int().positive()]).nullable(),
  auctionBidRange: z
    .object({
      minimum: z.number().int().positive(),
      maximum: z.number().int().positive(),
    })
    .nullable(),
  eligibleParticipantIds: z.array(z.string().trim().min(1)),
  activeParticipantId: z.string().trim().min(1).nullable(),
  attempts: z.array(attemptSchema),
})

export const gameSessionSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().trim().min(1),
  definitionId: z.string().trim().min(1),
  phase: gamePhaseSchema,
  participants: participantsSchema,
  scores: z.record(z.string(), z.number().int()),
  roundIndex: z.number().int().min(0).max(2),
  selectorParticipantId: z.string().trim().min(1),
  usedQuestionIds: z.array(z.string().trim().min(1)),
  activeQuestion: activeQuestionSchema.nullable(),
  updatedAt: z.string().datetime(),
})

export type GamePhase = z.infer<typeof gamePhaseSchema>
export type GameSession = z.infer<typeof gameSessionSchema>
