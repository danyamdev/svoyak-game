import { describe, expect, it } from 'vitest'

import { categorySchema, gameDefinitionSchema } from './model'
import { participantsSchema } from './participants'

const question = {
  id: 'question-1',
  type: 'regular',
  price: 100,
  prompt: [{ type: 'text', text: 'Вопрос' }],
  answer: [{ type: 'text', text: 'Ответ' }],
  acceptedAnswers: ['Ответ'],
} as const

describe('gameDefinitionSchema', () => {
  it('allows a configurable number of questions while requiring a non-empty category', () => {
    const validCategory = {
      id: 'category-1',
      title: 'Категория',
      questions: Array.from({ length: 5 }, (_, index) => ({
        ...question,
        id: `question-${index}`,
      })),
    }

    expect(categorySchema.safeParse(validCategory).success).toBe(true)
    expect(
      categorySchema.safeParse({ ...validCategory, questions: validCategory.questions.slice(1) })
        .success,
    ).toBe(true)
    expect(categorySchema.safeParse({ ...validCategory, questions: [] }).success).toBe(false)
  })

  it('rejects alternative-answer points outside the question value', () => {
    expect(
      categorySchema.safeParse({
        id: 'category-1',
        title: 'Категория',
        questions: [
          {
            ...question,
            acceptedAnswers: ['Ответ', 'Почти ответ'],
            acceptedAnswerScores: { 'Почти ответ': 101 },
          },
        ],
      }).success,
    ).toBe(false)
  })

  it('requires three rounds and seven final themes', () => {
    const result = gameDefinitionSchema.safeParse({
      schemaVersion: 1,
      id: 'game',
      title: 'Своя игра',
      rules: {
        allowNegativeScores: true,
        allowReboundAnswers: true,
        maxIndividualPlayers: 5,
        maxTeams: 5,
        maxTeamMembers: 5,
        finalMinimumWager: 1,
        finalRequiresPositiveScore: true,
        tieBreakerEnabled: true,
      },
      rounds: [],
      finalThemes: [],
      tieBreakers: [],
    })

    expect(result.success).toBe(false)
  })
})

describe('participantsSchema', () => {
  it('accepts up to five individual players', () => {
    const players = Array.from({ length: 5 }, (_, index) => ({
      type: 'individual' as const,
      id: `player-${index}`,
      name: `Игрок ${index + 1}`,
    }))

    expect(participantsSchema.safeParse(players).success).toBe(true)
  })

  it('accepts up to five members in a team', () => {
    const teams = [
      {
        type: 'team' as const,
        id: 'team-1',
        name: 'Тыквы',
        members: Array.from({ length: 5 }, (_, index) => ({
          id: `member-${index}`,
          name: `Участник ${index + 1}`,
        })),
      },
      {
        type: 'team' as const,
        id: 'team-2',
        name: 'Привидения',
        members: [{ id: 'member-6', name: 'Участник 6' }],
      },
    ]

    expect(participantsSchema.safeParse(teams).success).toBe(true)
  })

  it('does not mix teams and individual players in one session', () => {
    const result = participantsSchema.safeParse([
      { type: 'individual', id: 'player-1', name: 'Игрок' },
      {
        type: 'team',
        id: 'team-1',
        name: 'Команда',
        members: [{ id: 'member-1', name: 'Участник' }],
      },
    ])

    expect(result.success).toBe(false)
  })
})
