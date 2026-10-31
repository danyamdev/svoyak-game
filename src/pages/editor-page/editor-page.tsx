import { useState } from 'react'
import { Link } from 'react-router-dom'

import { getContentText, type Question } from '../../domain/game'
import {
  useGameDefinitionStore,
  type AcceptedAnswerDraft,
} from '../../features/game-definition-store'
import { ConfirmationDialog } from '../../shared/ui/confirmation-dialog'
import { MaskedTextArea } from '../../shared/ui/masked-text-area'
import { RequiredTextField } from '../../shared/ui/required-text-field'
import { AcceptedAnswersEditor } from '../../widgets/accepted-answers-editor'
import { PackageTransfer } from '../../widgets/package-transfer'
import styles from './editor-page.module.scss'

const QUESTION_TYPE_LABELS: Record<Question['type'], string> = {
  regular: 'Обычный',
  cat: 'Кот в мешке',
  auction: 'Аукцион',
}

interface PendingDeletion {
  id: string
  title: string
  kind: 'category' | 'finalTheme'
}

function getAlternativeAnswerText(primaryAnswer: string, acceptedAnswers: string[]) {
  return acceptedAnswers.filter((answer) => answer !== primaryAnswer).join('\n')
}

function getScoredAlternatives(question: Question): AcceptedAnswerDraft[] {
  const primaryAnswer = getContentText(question.answer)
  return question.acceptedAnswers
    .filter((answer) => answer !== primaryAnswer)
    .map((text) => ({
      text,
      // Старые пакеты без отдельных баллов сохраняют прежнее поведение: полный номинал.
      points: question.acceptedAnswerScores[text] ?? question.price,
    }))
}

function splitAlternativeAnswers(value: string) {
  return value.split('\n')
}

export function EditorPage() {
  const [activeTab, setActiveTab] = useState<number | 'final'>(0)
  const [isResetConfirmationOpen, setResetConfirmationOpen] = useState(false)
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null)
  const {
    definition,
    definitionRevision,
    renameGame,
    renameRound,
    addCategory,
    removeCategory,
    renameCategory,
    updateQuestionText,
    updateQuestionPrice,
    updateQuestionType,
    updateQuestionAcceptedAnswers,
    addFinalTheme,
    removeFinalTheme,
    updateFinalTheme,
    updateFinalThemeAcceptedAnswers,
    updateTieBreaker,
    updateTieBreakerAcceptedAnswers,
    resetDefinition,
  } = useGameDefinitionStore()
  const round = typeof activeTab === 'number' ? definition.rounds[activeTab] : null

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

      <nav className={styles.roundTabs} aria-label="Разделы пакета">
        {definition.rounds.map((item, index) => (
          <button
            type="button"
            aria-pressed={activeTab === index}
            key={item.id}
            onClick={() => setActiveTab(index)}
          >
            Раунд {index + 1}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={activeTab === 'final'}
          onClick={() => setActiveTab('final')}
        >
          Финал
        </button>
      </nav>

      {round && (
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
              <div className={styles.categoryHeader}>
                <RequiredTextField
                  className={styles.categoryTitle}
                  label={`Категория ${categoryIndex + 1}`}
                  value={category.title}
                  onCommit={(value) => renameCategory(category.id, value)}
                />
                <button
                  type="button"
                  disabled={round.categories.length <= 1}
                  onClick={() =>
                    setPendingDeletion({ id: category.id, title: category.title, kind: 'category' })
                  }
                >
                  Удалить категорию
                </button>
              </div>

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
                      masked
                      onCommit={(value) => updateQuestionText(question.id, 'answer', value)}
                    />
                    <AcceptedAnswersEditor
                      key={`${question.id}-${question.price}-${definitionRevision}`}
                      alternatives={getScoredAlternatives(question)}
                      maximumPoints={question.price}
                      onCommit={(alternatives) =>
                        updateQuestionAcceptedAnswers(question.id, alternatives)
                      }
                    />
                  </section>
                ))}
              </div>
            </article>
          ))}
          <button
            className={styles.addCategoryButton}
            type="button"
            onClick={() => addCategory(round.id)}
          >
            + Добавить категорию
          </button>
        </section>
      )}

      {activeTab === 'final' && (
        <section className={styles.finalEditor}>
          <div>
            <p>Финальный раунд</p>
            <h2>Финальные темы</h2>
          </div>
          <div className={styles.finalThemes}>
            {definition.finalThemes.map((theme, index) => (
              <article key={`${theme.id}-${definitionRevision}`}>
                <div className={styles.finalThemeHeader}>
                  <strong>Тема {index + 1}</strong>
                  <button
                    type="button"
                    disabled={definition.finalThemes.length <= 1}
                    onClick={() =>
                      setPendingDeletion({ id: theme.id, title: theme.title, kind: 'finalTheme' })
                    }
                  >
                    Удалить
                  </button>
                </div>
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
                  masked
                  onCommit={(value) => updateFinalTheme(theme.id, 'answer', value)}
                />
                <MaskedTextArea
                  label="Допустимые варианты ответа"
                  hint="По одному варианту на строку; в финале они оцениваются полной ставкой"
                  value={getAlternativeAnswerText(
                    getContentText(theme.answer),
                    theme.acceptedAnswers,
                  )}
                  onCommit={(value) =>
                    updateFinalThemeAcceptedAnswers(theme.id, splitAlternativeAnswers(value))
                  }
                />
              </article>
            ))}
          </div>
          <button className={styles.addCategoryButton} type="button" onClick={addFinalTheme}>
            + Добавить финальную тему
          </button>

          {definition.tieBreakers[0] && (
            <article className={styles.tieBreakerEditor} key={`tie-breaker-${definitionRevision}`}>
              <h2>Дополнительный вопрос при ничьей</h2>
              <p>
                Это отдельная игровая сущность, а не допустимый вариант ответа. Она используется
                только для определения победителя при равном итоговом счёте.
              </p>
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
                masked
                onCommit={(value) => updateTieBreaker('answer', value)}
              />
              <MaskedTextArea
                label="Допустимые варианты ответа"
                hint="По одному варианту на строку"
                value={getAlternativeAnswerText(
                  getContentText(definition.tieBreakers[0].answer),
                  definition.tieBreakers[0].acceptedAnswers,
                )}
                onCommit={(value) =>
                  updateTieBreakerAcceptedAnswers(splitAlternativeAnswers(value))
                }
              />
            </article>
          )}
        </section>
      )}

      <ConfirmationDialog
        open={isResetConfirmationOpen}
        title="Вернуть исходный пакет?"
        description="Все изменения тем, вопросов и ответов будут заменены стандартным хэллоуинским пакетом. Отменить это действие будет нельзя."
        confirmLabel="Сбросить пакет"
        onConfirm={() => {
          resetDefinition()
          setActiveTab(0)
          setResetConfirmationOpen(false)
        }}
        onOpenChange={setResetConfirmationOpen}
      />
      <ConfirmationDialog
        open={pendingDeletion !== null}
        title={`Удалить «${pendingDeletion?.title ?? ''}»?`}
        description="Связанные вопросы будут удалены без возможности восстановления."
        confirmLabel="Удалить"
        onConfirm={() => {
          if (!pendingDeletion) return
          if (pendingDeletion.kind === 'category' && round) {
            removeCategory(round.id, pendingDeletion.id)
          } else if (pendingDeletion.kind === 'finalTheme') {
            removeFinalTheme(pendingDeletion.id)
          }
          setPendingDeletion(null)
        }}
        onOpenChange={(open) => {
          if (!open) setPendingDeletion(null)
        }}
      />
    </main>
  )
}
