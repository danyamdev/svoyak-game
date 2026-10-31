import { useState } from 'react'
import { Link } from 'react-router-dom'

import { getContentText, type Question } from '../../domain/game'
import { useGameDefinitionStore } from '../../features/game-definition-store'
import { ConfirmationDialog } from '../../shared/ui/confirmation-dialog'
import { RequiredTextField } from '../../shared/ui/required-text-field'
import { PackageTransfer } from '../../widgets/package-transfer'
import styles from './editor-page.module.scss'

const QUESTION_TYPE_LABELS: Record<Question['type'], string> = {
  regular: 'Обычный',
  cat: 'Кот в мешке',
  auction: 'Аукцион',
}

function getAlternativeAnswers(primaryAnswer: string, acceptedAnswers: string[]) {
  return acceptedAnswers.filter((answer) => answer !== primaryAnswer).join('\n')
}

function splitAlternativeAnswers(value: string) {
  return value.split('\n')
}

export function EditorPage() {
  const [roundIndex, setRoundIndex] = useState(0)
  const [isResetConfirmationOpen, setResetConfirmationOpen] = useState(false)
  const {
    definition,
    definitionRevision,
    renameGame,
    renameRound,
    renameCategory,
    updateQuestionText,
    updateQuestionPrice,
    updateQuestionType,
    updateQuestionAcceptedAnswers,
    updateFinalTheme,
    updateFinalThemeAcceptedAnswers,
    updateTieBreaker,
    updateTieBreakerAcceptedAnswers,
    resetDefinition,
  } = useGameDefinitionStore()
  const round = definition.rounds[roundIndex]

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link to="/setup">← К участникам</Link>
        <div>
          <span aria-hidden="true" />
          Сохраняется автоматически
        </div>
        <button type="button" onClick={() => setResetConfirmationOpen(true)}>
          Сбросить пакет
        </button>
      </header>

      <section className={styles.intro}>
        <p>Редактор пакета</p>
        <h1>Вопросы и темы</h1>
        <RequiredTextField
          key={`game-title-${definitionRevision}`}
          label="Название игры"
          value={definition.title}
          onCommit={renameGame}
        />
      </section>

      <PackageTransfer />

      <nav className={styles.roundTabs} aria-label="Раунды">
        {definition.rounds.map((item, index) => (
          <button
            type="button"
            aria-pressed={roundIndex === index}
            key={item.id}
            onClick={() => setRoundIndex(index)}
          >
            Раунд {index + 1}
          </button>
        ))}
      </nav>

      <section className={styles.roundEditor}>
        <RequiredTextField
          key={`${round.id}-${definitionRevision}`}
          className={styles.roundTitle}
          label="Название раунда"
          value={round.title}
          onCommit={(value) => renameRound(round.id, value)}
        />

        {round.categories.map((category, categoryIndex) => (
          <article className={styles.categoryCard} key={`${category.id}-${definitionRevision}`}>
            <RequiredTextField
              className={styles.categoryTitle}
              label={`Категория ${categoryIndex + 1}`}
              value={category.title}
              onCommit={(value) => renameCategory(category.id, value)}
            />

            <div className={styles.questionList}>
              {category.questions.map((question, questionIndex) => (
                <section className={styles.questionCard} key={question.id}>
                  <div className={styles.questionMeta}>
                    <strong>Вопрос {questionIndex + 1}</strong>
                    <label>
                      Стоимость
                      <input
                        type="number"
                        min="1"
                        step="1"
                        defaultValue={question.price}
                        onBlur={(event) =>
                          updateQuestionPrice(question.id, Number(event.currentTarget.value))
                        }
                      />
                    </label>
                    <label>
                      Тип
                      <select
                        value={question.type}
                        onChange={(event) =>
                          updateQuestionType(
                            question.id,
                            event.currentTarget.value as Question['type'],
                          )
                        }
                      >
                        {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                          <option value={value} key={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <RequiredTextField
                    label="Текст вопроса"
                    value={getContentText(question.prompt)}
                    multiline
                    rows={3}
                    onCommit={(value) => updateQuestionText(question.id, 'prompt', value)}
                  />
                  <RequiredTextField
                    label="Правильный ответ"
                    value={getContentText(question.answer)}
                    multiline
                    onCommit={(value) => updateQuestionText(question.id, 'answer', value)}
                  />
                  <label>
                    Допустимые варианты ответа
                    <span className={styles.fieldHint}>По одному варианту на строку</span>
                    <textarea
                      rows={2}
                      defaultValue={getAlternativeAnswers(
                        getContentText(question.answer),
                        question.acceptedAnswers,
                      )}
                      onBlur={(event) =>
                        updateQuestionAcceptedAnswers(
                          question.id,
                          splitAlternativeAnswers(event.currentTarget.value),
                        )
                      }
                    />
                  </label>
                </section>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className={styles.finalEditor}>
        <div>
          <p>Финальный раунд</p>
          <h2>Семь финальных тем</h2>
        </div>
        <div className={styles.finalThemes}>
          {definition.finalThemes.map((theme, index) => (
            <article key={`${theme.id}-${definitionRevision}`}>
              <strong>Тема {index + 1}</strong>
              <RequiredTextField
                label="Название"
                value={theme.title}
                onCommit={(value) => updateFinalTheme(theme.id, 'title', value)}
              />
              <RequiredTextField
                label="Вопрос"
                value={getContentText(theme.prompt)}
                multiline
                onCommit={(value) => updateFinalTheme(theme.id, 'prompt', value)}
              />
              <RequiredTextField
                label="Ответ"
                value={getContentText(theme.answer)}
                multiline
                onCommit={(value) => updateFinalTheme(theme.id, 'answer', value)}
              />
              <label>
                Допустимые варианты ответа
                <span className={styles.fieldHint}>По одному варианту на строку</span>
                <textarea
                  rows={2}
                  defaultValue={getAlternativeAnswers(
                    getContentText(theme.answer),
                    theme.acceptedAnswers,
                  )}
                  onBlur={(event) =>
                    updateFinalThemeAcceptedAnswers(
                      theme.id,
                      splitAlternativeAnswers(event.currentTarget.value),
                    )
                  }
                />
              </label>
            </article>
          ))}
        </div>

        {definition.tieBreakers[0] && (
          <article className={styles.tieBreakerEditor} key={`tie-breaker-${definitionRevision}`}>
            <h2>Дополнительный вопрос</h2>
            <RequiredTextField
              label="Вопрос"
              value={getContentText(definition.tieBreakers[0].prompt)}
              multiline
              onCommit={(value) => updateTieBreaker('prompt', value)}
            />
            <RequiredTextField
              label="Ответ"
              value={getContentText(definition.tieBreakers[0].answer)}
              multiline
              onCommit={(value) => updateTieBreaker('answer', value)}
            />
            <label>
              Допустимые варианты ответа
              <span className={styles.fieldHint}>По одному варианту на строку</span>
              <textarea
                rows={2}
                defaultValue={getAlternativeAnswers(
                  getContentText(definition.tieBreakers[0].answer),
                  definition.tieBreakers[0].acceptedAnswers,
                )}
                onBlur={(event) =>
                  updateTieBreakerAcceptedAnswers(
                    splitAlternativeAnswers(event.currentTarget.value),
                  )
                }
              />
            </label>
          </article>
        )}
      </section>
      <ConfirmationDialog
        open={isResetConfirmationOpen}
        title="Вернуть исходный пакет?"
        description="Все изменения тем, вопросов и ответов будут заменены стандартным хэллоуинским пакетом. Отменить это действие будет нельзя."
        confirmLabel="Сбросить пакет"
        onConfirm={() => {
          resetDefinition()
          setRoundIndex(0)
          setResetConfirmationOpen(false)
        }}
        onOpenChange={setResetConfirmationOpen}
      />
    </main>
  )
}
