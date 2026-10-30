import { z } from 'zod'

const personSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
})

const individualParticipantSchema = z.object({
  type: z.literal('individual'),
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
})

const teamParticipantSchema = z.object({
  type: z.literal('team'),
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  members: z.array(personSchema).min(1).max(5),
})

export const participantSchema = z.discriminatedUnion('type', [
  individualParticipantSchema,
  teamParticipantSchema,
])

export const participantsSchema = z
  .array(participantSchema)
  .min(2)
  .max(5)
  .superRefine((participants, context) => {
    const modes = new Set(participants.map(({ type }) => type))

    if (modes.size > 1) {
      context.addIssue({
        code: 'custom',
        message: 'В одной партии нельзя смешивать команды и отдельных игроков',
      })
    }

    const ids = participants.map(({ id }) => id)
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: 'custom',
        message: 'Идентификаторы участников должны быть уникальными',
      })
    }
  })

export type Participant = z.infer<typeof participantSchema>
