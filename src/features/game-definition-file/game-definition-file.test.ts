import { describe, expect, it } from 'vitest'

import { DEFAULT_GAME_DEFINITION, type GameDefinition } from '../../domain/game'
import { parseGameDefinitionFile, serializeGameDefinition } from './game-definition-file'

interface GamePackageFixture {
  version: number
  definition: GameDefinition
}

describe('game definition file', () => {
  it('round-trips a valid game definition', () => {
    const source = serializeGameDefinition(DEFAULT_GAME_DEFINITION)

    expect(parseGameDefinitionFile(source)).toEqual({
      success: true,
      definition: DEFAULT_GAME_DEFINITION,
    })
  })

  it('rejects malformed JSON', () => {
    expect(parseGameDefinitionFile('{not-json')).toEqual({
      success: false,
      message: 'Файл не является корректным JSON.',
    })
  })

  it('rejects a package with an unsupported format version', () => {
    const gamePackage = JSON.parse(
      serializeGameDefinition(DEFAULT_GAME_DEFINITION),
    ) as GamePackageFixture
    gamePackage.version = 2

    expect(parseGameDefinitionFile(JSON.stringify(gamePackage))).toMatchObject({ success: false })
  })

  it('rejects duplicate question identifiers', () => {
    const gamePackage = JSON.parse(
      serializeGameDefinition(DEFAULT_GAME_DEFINITION),
    ) as GamePackageFixture
    const firstCategory = gamePackage.definition.rounds[0].categories[0]
    firstCategory.questions[1].id = firstCategory.questions[0].id

    expect(parseGameDefinitionFile(JSON.stringify(gamePackage))).toEqual({
      success: false,
      message: 'В пакете обнаружены повторяющиеся идентификаторы.',
    })
  })
})
