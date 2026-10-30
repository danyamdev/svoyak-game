import { useState } from 'react'
import { Link } from 'react-router-dom'

import { getContentText, type Question } from '../../domain/game'
import { useGameDefinitionStore } from '../../features/game-definition-store'
import styles from './editor-page.module.scss'

const QUESTION_TYPE_LABELS: Record<Question['type'], string> = {
  regular: 'Обычный',
  cat: 'Кот в мешке',
  auction: 'Аукцион',
}

export function EditorPage() {
  const [roundIndex, setRoundIndex] = useState(0)
  const {
    definition,
    renameGame,
    renameRound,
    renameCategory,
    updateQuestionText,
    updateQuestionPrice,
    updateQuestionType,
    updateFinalTheme,
    updateTieBreaker,
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
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Вернуть исходный хэллоуинский пакет?')) resetDefinition()
          }}
        >
          Сбросить пакет
        </button>
      </header>

      <section className={styles.intro}>
        <p>Редактор пакета</p>
        <h1>Вопросы и темы</h1>
        <label>
          Название игры
          <input
            defaultValue={definition.title}
            required
            onBlur={(event) => renameGame(event.currentTarget.value)}
          />
        </label>
      </section>

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
        <label className={styles.roundTitle}>
          Название раунда
          <input
            key={round.id}
            defaultValue={round.title}
            required
            onBlur={(event) => renameRound(round.id, event.currentTarget.value)}
          />
        </label>

        {round.categories.map((category, categoryIndex) => (
          <article className={styles.categoryCard} key={category.id}>
            <label className={styles.categoryTitle}>
              Категория {categoryIndex + 1}
              <input
                defaultValue={category.title}
                required
                onBlur={(event) => renameCategory(category.id, event.currentTarget.value)}
              />
            </label>

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
                  <label>
                    Текст вопроса
                    <textarea
                      defaultValue={getContentText(question.prompt)}
                      required
                      rows={3}
                      onBlur={(event) =>
                        updateQuestionText(question.id, 'prompt', event.currentTarget.value)
                      }
                    />
                  </label>
                  <label>
                    Правильный ответ
                    <textarea
                      defaultValue={getContentText(question.answer)}
                      required
                      rows={2}
                      onBlur={(event) =>
                        updateQuestionText(question.id, 'answer', event.currentTarget.value)
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
            <article key={theme.id}>
              <strong>Тема {index + 1}</strong>
              <label>
                Название
                <input
                  defaultValue={theme.title}
                  onBlur={(event) => updateFinalTheme(theme.id, 'title', event.currentTarget.value)}
                />
              </label>
              <label>
                Вопрос
                <textarea
                  rows={2}
                  defaultValue={getContentText(theme.prompt)}
                  onBlur={(event) =>
                    updateFinalTheme(theme.id, 'prompt', event.currentTarget.value)
                  }
                />
              </label>
              <label>
                Ответ
                <textarea
                  rows={2}
                  defaultValue={getContentText(theme.answer)}
                  onBlur={(event) =>
                    updateFinalTheme(theme.id, 'answer', event.currentTarget.value)
                  }
                />
              </label>
            </article>
          ))}
        </div>

        {definition.tieBreakers[0] && (
          <article className={styles.tieBreakerEditor}>
            <h2>Дополнительный вопрос</h2>
            <label>
              Вопрос
              <textarea
                rows={2}
                defaultValue={getContentText(definition.tieBreakers[0].prompt)}
                onBlur={(event) => updateTieBreaker('prompt', event.currentTarget.value)}
              />
            </label>
            <label>
              Ответ
              <textarea
                rows={2}
                defaultValue={getContentText(definition.tieBreakers[0].answer)}
                onBlur={(event) => updateTieBreaker('answer', event.currentTarget.value)}
              />
            </label>
          </article>
        )}
      </section>
    </main>
  )
}
