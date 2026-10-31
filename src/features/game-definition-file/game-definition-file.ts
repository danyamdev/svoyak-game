import { z } from 'zod'

import { gameDefinitionSchema, type GameDefinition } from '../../domain/game'

const GAME_PACKAGE_FORMAT = 'svoyak-game-package'
const GAME_PACKAGE_VERSION = 1

const gameDefinitionFileSchema = z.object({
  format: z.literal(GAME_PACKAGE_FORMAT),
  version: z.literal(GAME_PACKAGE_VERSION),
  definition: gameDefinitionSchema,
})

export type GameDefinitionImportResult =
  { success: true; definition: GameDefinition } | { success: false; message: string }

function hasUniqueIds(definition: GameDefinition) {
  const roundIds = definition.rounds.map(({ id }) => id)
  const categoryIds = definition.rounds.flatMap(({ categories }) => categories.map(({ id }) => id))
  const questionIds = definition.rounds.flatMap(({ categories }) =>
    categories.flatMap(({ questions }) => questions.map(({ id }) => id)),
  )
  const finalThemeIds = definition.finalThemes.map(({ id }) => id)
  const tieBreakerIds = definition.tieBreakers.map(({ id }) => id)

  return [roundIds, categoryIds, questionIds, finalThemeIds, tieBreakerIds].every(
    (ids) => new Set(ids).size === ids.length,
  )
}

/** Создаёт версионированный JSON-файл, не зависящий от внутреннего формата localStorage. */
export function serializeGameDefinition(definition: GameDefinition) {
  const gamePackage = gameDefinitionFileSchema.parse({
    format: GAME_PACKAGE_FORMAT,
    version: GAME_PACKAGE_VERSION,
    definition,
  })

  return JSON.stringify(gamePackage, null, 2)
}

/** Проверяет внешний JSON до того, как он сможет заменить текущий пакет в хранилище. */
export function parseGameDefinitionFile(source: string): GameDefinitionImportResult {
  let value: unknown

  try {
    value = JSON.parse(source)
  } catch {
    return { success: false, message: 'Файл не является корректным JSON.' }
  }

  const gamePackage = gameDefinitionFileSchema.safeParse(value)
  if (!gamePackage.success) {
    return {
      success: false,
      message: 'Файл не соответствует формату пакета «Своей игры» версии 1.',
    }
  }

  if (!hasUniqueIds(gamePackage.data.definition)) {
    return { success: false, message: 'В пакете обнаружены повторяющиеся идентификаторы.' }
  }

  return { success: true, definition: gamePackage.data.definition }
}
