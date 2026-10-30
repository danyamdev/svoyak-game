import { describe, expect, it } from 'vitest'

import { getContentText } from '../content'
import { gameDefinitionSchema } from '../model'
import { DEFAULT_GAME_DEFINITION } from './default-game'

describe('DEFAULT_GAME_DEFINITION', () => {
  it('matches the canonical game definition schema', () => {
    expect(gameDefinitionSchema.safeParse(DEFAULT_GAME_DEFINITION).success).toBe(true)
  })

  it('contains one cat and one auction in every round', () => {
    const specialQuestionCounts = DEFAULT_GAME_DEFINITION.rounds.map((round) => {
      const questions = round.categories.flatMap(({ questions }) => questions)

      return {
        cats: questions.filter(({ type }) => type === 'cat').length,
        auctions: questions.filter(({ type }) => type === 'auction').length,
      }
    })

    expect(specialQuestionCounts).toEqual([
      { cats: 1, auctions: 1 },
      { cats: 1, auctions: 1 },
      { cats: 1, auctions: 1 },
    ])
  })

  it('contains 75 unique questions without demo markers', () => {
    const prompts = DEFAULT_GAME_DEFINITION.rounds.flatMap(({ categories }) =>
      categories.flatMap(({ questions }) => questions.map(({ prompt }) => getContentText(prompt))),
    )

    expect(prompts).toHaveLength(75)
    expect(new Set(prompts).size).toBe(75)
    expect(prompts.every((prompt) => !prompt.toLowerCase().includes('демонстрацион'))).toBe(true)
  })
})
