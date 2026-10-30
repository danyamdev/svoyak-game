import { z } from 'zod'

const idSchema = z.string().trim().min(1)

const textContentSchema = z.object({
  type: z.literal('text'),
  text: z.string().trim().min(1),
})

const imageContentSchema = z.object({
  type: z.literal('image'),
  src: z.string().trim().min(1),
  alt: z.string().trim(),
})

const timedMediaContentSchema = z.object({
  type: z.enum(['audio', 'video']),
  src: z.string().trim().min(1),
  title: z.string().trim().min(1),
})

export const contentBlockSchema = z.discriminatedUnion('type', [
  textContentSchema,
  imageContentSchema,
  timedMediaContentSchema,
])

const questionBaseSchema = z.object({
  id: idSchema,
  price: z.number().int().positive(),
  prompt: z.array(contentBlockSchema).min(1),
  answer: z.array(contentBlockSchema).min(1),
  acceptedAnswers: z.array(z.string().trim().min(1)).default([]),
  note: z.string().trim().optional(),
})

const regularQuestionSchema = questionBaseSchema.extend({
  type: z.literal('regular'),
})

const catQuestionSchema = questionBaseSchema.extend({
  type: z.literal('cat'),
  priceMode: z.literal('roundMinMax'),
})

const auctionQuestionSchema = questionBaseSchema.extend({
  type: z.literal('auction'),
})

export const questionSchema = z.discriminatedUnion('type', [
  regularQuestionSchema,
  catQuestionSchema,
  auctionQuestionSchema,
])

export const categorySchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1),
  questions: z.array(questionSchema).length(5),
})

export const roundSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1),
  categories: z.array(categorySchema).length(5),
})

export const finalThemeSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1),
  prompt: z.array(contentBlockSchema).min(1),
  answer: z.array(contentBlockSchema).min(1),
  acceptedAnswers: z.array(z.string().trim().min(1)).default([]),
})

export const gameRulesSchema = z.object({
  allowNegativeScores: z.literal(true),
  allowReboundAnswers: z.literal(true),
  maxIndividualPlayers: z.literal(5),
  maxTeams: z.literal(5),
  maxTeamMembers: z.literal(5),
  finalMinimumWager: z.literal(1),
  finalRequiresPositiveScore: z.literal(true),
  tieBreakerEnabled: z.literal(true),
})

export const gameDefinitionSchema = z.object({
  schemaVersion: z.literal(1),
  id: idSchema,
  title: z.string().trim().min(1),
  rules: gameRulesSchema,
  rounds: z.array(roundSchema).length(3),
  finalThemes: z.array(finalThemeSchema).length(7),
  tieBreakers: z.array(finalThemeSchema).min(1),
})

export type ContentBlock = z.infer<typeof contentBlockSchema>
export type Question = z.infer<typeof questionSchema>
export type Category = z.infer<typeof categorySchema>
export type GameRound = z.infer<typeof roundSchema>
export type FinalTheme = z.infer<typeof finalThemeSchema>
export type GameRules = z.infer<typeof gameRulesSchema>
export type GameDefinition = z.infer<typeof gameDefinitionSchema>
