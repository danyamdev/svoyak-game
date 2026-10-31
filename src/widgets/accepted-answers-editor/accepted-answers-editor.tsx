import { useState } from 'react'

import type { AcceptedAnswerDraft } from '../../features/game-definition-store'
import styles from './accepted-answers-editor.module.scss'

interface AcceptedAnswersEditorProps {
  alternatives: AcceptedAnswerDraft[]
  maximumPoints: number
  onCommit: (alternatives: AcceptedAnswerDraft[]) => void
}

export function AcceptedAnswersEditor({
  alternatives,
  maximumPoints,
  onCommit,
}: AcceptedAnswersEditorProps) {
  const [drafts, setDrafts] = useState(alternatives)
  const [visibleRows, setVisibleRows] = useState<Set<number>>(() => new Set())
  const [error, setError] = useState<string | null>(null)

  function save() {
    const normalizedDrafts = drafts
      .map(({ text, points }) => ({ text: text.trim(), points }))
      .filter(({ text }) => text)

    if (
      normalizedDrafts.some(
        ({ points }) => !Number.isInteger(points) || points < 0 || points > maximumPoints,
      )
    ) {
      setError(`Баллы должны быть целым числом от 0 до ${maximumPoints}`)
      return
    }

    setError(null)
    setDrafts(normalizedDrafts)
    onCommit(normalizedDrafts)
  }

  return (
    <div className={styles.editor}>
      <div className={styles.heading}>
        <span>Допустимые варианты ответа</span>
        <button
          type="button"
          onClick={() => setDrafts((current) => [...current, { text: '', points: maximumPoints }])}
        >
          + Добавить вариант
        </button>
      </div>
      {drafts.length === 0 ? (
        <p className={styles.empty}>Дополнительных вариантов пока нет.</p>
      ) : (
        <div className={styles.rows}>
          {drafts.map((draft, index) => {
            const isVisible = visibleRows.has(index)
            return (
              <div className={styles.row} key={index}>
                <label>
                  <span>Ответ {index + 1}</span>
                  <span className={styles.answerControl}>
                    <input
                      type={isVisible ? 'text' : 'password'}
                      value={draft.text}
                      onChange={(event) => {
                        const text = event.currentTarget.value
                        setDrafts((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, text } : item,
                          ),
                        )
                      }}
                    />
                    <button
                      type="button"
                      aria-label={
                        isVisible ? `Скрыть ответ ${index + 1}` : `Показать ответ ${index + 1}`
                      }
                      aria-pressed={isVisible}
                      onClick={() =>
                        setVisibleRows((current) => {
                          const next = new Set(current)
                          if (next.has(index)) next.delete(index)
                          else next.add(index)
                          return next
                        })
                      }
                    >
                      {isVisible ? '🙈' : '👁'}
                    </button>
                  </span>
                </label>
                <label>
                  <span>Баллы</span>
                  <input
                    type="number"
                    min="0"
                    max={maximumPoints}
                    step="1"
                    value={draft.points}
                    onChange={(event) => {
                      const points = Number(event.currentTarget.value)
                      setDrafts((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, points } : item,
                        ),
                      )
                    }}
                  />
                </label>
                <button
                  className={styles.removeButton}
                  type="button"
                  aria-label={`Удалить допустимый ответ ${index + 1}`}
                  onClick={() => setDrafts((current) => current.filter((_, i) => i !== index))}
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button className={styles.saveButton} type="button" onClick={save}>
        Сохранить варианты
      </button>
    </div>
  )
}
