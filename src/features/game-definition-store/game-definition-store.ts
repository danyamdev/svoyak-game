import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import {
  DEFAULT_GAME_DEFINITION,
  gameDefinitionSchema,
  getContentText,
  normalizeAcceptedAnswers,
  type GameDefinition,
  type Question,
} from '../../domain/game'

const STORAGE_KEY = 'svoyak-game-definition'

type QuestionTextField = 'prompt' | 'answer'
type FinalThemeField = 'title' | 'prompt' | 'answer'

interface GameDefinitionActions {
  renameGame: (title: string) => void
  renameRound: (roundId: string, title: string) => void
  renameCategory: (categoryId: string, title: string) => void
  updateQuestionText: (questionId: string, field: QuestionTextField, text: string) => void
  updateQuestionPrice: (questionId: string, price: number) => void
  updateQuestionType: (questionId: string, type: Question['type']) => void
  updateQuestionAcceptedAnswers: (questionId: string, alternatives: string[]) => void
  updateFinalTheme: (themeId: string, field: FinalThemeField, value: string) => void
  updateFinalThemeAcceptedAnswers: (themeId: string, alternatives: string[]) => void
  updateTieBreaker: (field: 'prompt' | 'answer', value: string) => void
  updateTieBreakerAcceptedAnswers: (alternatives: string[]) => void
  replaceDefinition: (definition: GameDefinition) => boolean
  resetDefinition: () => void
}

interface GameDefinitionStore extends GameDefinitionActions {
  definition: GameDefinition
  definitionRevision: number
}

function cloneDefaultDefinition() {
  return structuredClone(DEFAULT_GAME_DEFINITION)
}

function isLegacyDemoDefinition(definition: GameDefinition) {
  const demoQuestionCount = definition.rounds
    .slice(1)
    .flatMap(({ categories }) => categories)
    .flatMap(({ questions }) => questions)
    .filter(({ prompt }) =>
      getContentText(prompt).includes('демонстрационный вопрос раунда'),
    ).length

  // В предыдущем стартовом пакете маркер содержали ровно все 50 вопросов раундов 2 и 3.
  return definition.id === DEFAULT_GAME_DEFINITION.id && demoQuestionCount === 50
}

export function migrateGameDefinitionState(persistedState: unknown, version: number) {
  if (version >= 2 || !persistedState || typeof persistedState !== 'object') {
    return persistedState
  }

  const definition = gameDefinitionSchema.safeParse(
    (persistedState as { definition?: unknown }).definition,
  )

  if (!definition.success || !isLegacyDemoDefinition(definition.data)) {
    return persistedState
  }

  // Обновляем только неизменённый демопакет: пользовательские пакеты миграция не перезаписывает.
  return { ...persistedState, definition: cloneDefaultDefinition() }
}

function updateQuestion(
  definition: GameDefinition,
  questionId: string,
  updater: (question: Question) => Question,
): GameDefinition {
  return {
    ...definition,
    rounds: definition.rounds.map((round) => ({
      ...round,
      categories: round.categories.map((category) => ({
        ...category,
        questions: category.questions.map((question) =>
          question.id === questionId ? updater(question) : question,
        ),
      })),
    })),
  }
}

export const useGameDefinitionStore = create<GameDefinitionStore>()(
  persist(
    (set) => ({
      definition: cloneDefaultDefinition(),
      definitionRevision: 0,
      renameGame: (title) => {
        if (!title.trim()) return
        set(({ definition }) => ({ definition: { ...definition, title } }))
      },
      renameRound: (roundId, title) => {
        if (!title.trim()) return
        set(({ definition }) => ({
          definition: {
            ...definition,
            rounds: definition.rounds.map((round) =>
              round.id === roundId ? { ...round, title } : round,
            ),
          },
        }))
      },
      renameCategory: (categoryId, title) => {
        if (!title.trim()) return
        set(({ definition }) => ({
          definition: {
            ...definition,
            rounds: definition.rounds.map((round) => ({
              ...round,
              categories: round.categories.map((category) =>
                category.id === categoryId ? { ...category, title } : category,
              ),
            })),
          },
        }))
      },
      updateQuestionText: (questionId, field, text) => {
        if (!text.trim()) return
        set(({ definition }) => ({
          definition: updateQuestion(definition, questionId, (question) => {
            const previousAnswer = getContentText(question.answer)
            const alternatives = question.acceptedAnswers.filter(
              (answer) => answer !== previousAnswer,
            )

            return {
              ...question,
              [field]: [{ type: 'text', text }],
              ...(field === 'answer'
                ? { acceptedAnswers: normalizeAcceptedAnswers(text, alternatives) }
                : {}),
            }
          }),
        }))
      },
      updateQuestionPrice: (questionId, price) => {
        if (!Number.isInteger(price) || price <= 0) return
        set(({ definition }) => ({
          definition: updateQuestion(definition, questionId, (question) => ({
            ...question,
            price,
          })),
        }))
      },
      updateQuestionType: (questionId, type) =>
        set(({ definition }) => ({
          definition: updateQuestion(definition, questionId, (question) => {
            if (type === 'cat') return { ...question, type, priceMode: 'roundMinMax' }
            const baseQuestion = {
              id: question.id,
              price: question.price,
              prompt: question.prompt,
              answer: question.answer,
              acceptedAnswers: question.acceptedAnswers,
              note: question.note,
            }
            return type === 'auction'
              ? { ...baseQuestion, type: 'auction' }
              : { ...baseQuestion, type: 'regular' }
          }),
        })),
      updateQuestionAcceptedAnswers: (questionId, alternatives) =>
        set(({ definition }) => ({
          definition: updateQuestion(definition, questionId, (question) => ({
            ...question,
            acceptedAnswers: normalizeAcceptedAnswers(
              getContentText(question.answer),
              alternatives,
            ),
          })),
        })),
      updateFinalTheme: (themeId, field, value) => {
        if (!value.trim()) return
        set(({ definition }) => ({
          definition: {
            ...definition,
            finalThemes: definition.finalThemes.map((theme) => {
              if (theme.id !== themeId) return theme
              if (field === 'title') return { ...theme, title: value }

              return {
                ...theme,
                [field]: [{ type: 'text', text: value }],
                ...(field === 'answer'
                  ? {
                      acceptedAnswers: normalizeAcceptedAnswers(
                        value,
                        theme.acceptedAnswers.filter(
                          (answer) => answer !== getContentText(theme.answer),
                        ),
                      ),
                    }
                  : {}),
              }
            }),
          },
        }))
      },
      updateFinalThemeAcceptedAnswers: (themeId, alternatives) =>
        set(({ definition }) => ({
          definition: {
            ...definition,
            finalThemes: definition.finalThemes.map((theme) =>
              theme.id === themeId
                ? {
                    ...theme,
                    acceptedAnswers: normalizeAcceptedAnswers(
                      getContentText(theme.answer),
                      alternatives,
                    ),
                  }
                : theme,
            ),
          },
        })),
      updateTieBreaker: (field, value) => {
        if (!value.trim()) return
        set(({ definition }) => ({
          definition: {
            ...definition,
            tieBreakers: definition.tieBreakers.map((question, index) =>
              index === 0
                ? {
                    ...question,
                    [field]: [{ type: 'text', text: value }],
                    ...(field === 'answer'
                      ? {
                          acceptedAnswers: normalizeAcceptedAnswers(
                            value,
                            question.acceptedAnswers.filter(
                              (answer) => answer !== getContentText(question.answer),
                            ),
                          ),
                        }
                      : {}),
                  }
                : question,
            ),
          },
        }))
      },
      updateTieBreakerAcceptedAnswers: (alternatives) =>
        set(({ definition }) => ({
          definition: {
            ...definition,
            tieBreakers: definition.tieBreakers.map((question, index) =>
              index === 0
                ? {
                    ...question,
                    acceptedAnswers: normalizeAcceptedAnswers(
                      getContentText(question.answer),
                      alternatives,
                    ),
                  }
                : question,
            ),
          },
        })),
      replaceDefinition: (definition) => {
        const result = gameDefinitionSchema.safeParse(definition)
        if (!result.success) return false

        set(({ definitionRevision }) => ({
          definition: result.data,
          definitionRevision: definitionRevision + 1,
        }))
        return true
      },
      resetDefinition: () =>
        set(({ definitionRevision }) => ({
          definition: cloneDefaultDefinition(),
          definitionRevision: definitionRevision + 1,
        })),
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ definition }) => ({ definition }),
      migrate: migrateGameDefinitionState,
      merge: (persistedState, currentState) => {
        const definition = gameDefinitionSchema.safeParse(
          (persistedState as { definition?: unknown } | undefined)?.definition,
        )

        return {
          ...currentState,
          definition: definition.success ? definition.data : currentState.definition,
        }
      },
    },
  ),
)

export function getGameDefinition() {
  return useGameDefinitionStore.getState().definition
}
