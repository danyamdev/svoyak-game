import { describe, expect, it } from 'vitest'

import { DEFAULT_GAME_DEFINITION } from '../../domain/game'
import { migrateGameDefinitionState } from './game-definition-store'

function createLegacyDemoDefinition() {
  const definition = structuredClone(DEFAULT_GAME_DEFINITION)

  definition.rounds.slice(1).forEach((round, roundIndex) => {
    round.categories.forEach((category) => {
      category.questions.forEach((question) => {
        const block = question.prompt[0]
        if (block?.type === 'text') {
          block.text += ` (демонстрационный вопрос раунда ${roundIndex + 2})`
        }
      })
    })
  })

  return definition
}

describe('migrateGameDefinitionState', () => {
  it('replaces the untouched legacy demo package with the current default package', () => {
    const migrated = migrateGameDefinitionState({ definition: createLegacyDemoDefinition() }, 1)

    expect(migrated).toEqual({ definition: DEFAULT_GAME_DEFINITION })
  })

  it('preserves a package when at least one legacy question was edited', () => {
    const definition = createLegacyDemoDefinition()
    definition.rounds[1].categories[0].questions[0].prompt = [
      { type: 'text', text: 'Пользовательский вопрос' },
    ]
    const persistedState = { definition }

    expect(migrateGameDefinitionState(persistedState, 1)).toBe(persistedState)
  })
})
