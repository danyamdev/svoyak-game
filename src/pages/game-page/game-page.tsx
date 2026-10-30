import { Link, Navigate } from 'react-router-dom'

import { DEMO_ROUNDS } from '../../domain/game'
import { useGameSessionStore } from '../../features/game-session-store'
import { QuestionPanel } from '../../widgets/question-panel'
import styles from './game-page.module.scss'

export function GamePage() {
  const {
    status,
    participants,
    scores,
    roundIndex,
    phase,
    usedQuestionIds,
    changeScore,
    setRoundIndex,
    selectQuestion,
  } = useGameSessionStore()

  if (status !== 'active') {
    return <Navigate to="/setup" replace />
  }

  const categories = DEMO_ROUNDS[roundIndex]

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.homeLink} to="/">
          🎃 Своя игра
        </Link>
        <div className={styles.persistenceStatus}>
          <span aria-hidden="true" />
          Сохраняется автоматически
        </div>
        <Link className={styles.settingsLink} to="/setup">
          Настройка участников
        </Link>
      </header>

      <section className={styles.scoreboard} aria-label="Счёт участников">
        {participants.map((participant, index) => (
          <article className={styles.scoreCard} key={participant.id}>
            <span className={styles.avatar} aria-hidden="true">
              {index % 2 === 0 ? '🎃' : '👻'}
            </span>
            <div>
              <span>{participant.name}</span>
              <strong aria-live="polite">{scores[participant.id] ?? 0}</strong>
            </div>
            <div className={styles.scoreActions} aria-label={`Изменить счёт: ${participant.name}`}>
              <button type="button" onClick={() => changeScore(participant.id, -100)}>
                −100
              </button>
              <button type="button" onClick={() => changeScore(participant.id, 100)}>
                +100
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className={styles.gameArea}>
        <div className={styles.roundControls}>
          <button
            type="button"
            disabled={roundIndex === 0}
            onClick={() => setRoundIndex(roundIndex - 1)}
          >
            ←
          </button>
          <div>
            <span>Основная игра</span>
            <h1>Раунд {roundIndex + 1}</h1>
          </div>
          <button
            type="button"
            disabled={roundIndex === 2}
            onClick={() => setRoundIndex(roundIndex + 1)}
          >
            →
          </button>
        </div>

        <div className={styles.board} aria-label={`Игровое поле, раунд ${roundIndex + 1}`}>
          {categories.map((category) => (
            <div className={styles.boardRow} key={category.id}>
              <div className={styles.category}>{category.title}</div>
              {category.questions.map((question) => {
                const isUsed = usedQuestionIds.includes(question.id)

                return (
                  <button
                    type="button"
                    className={`${styles.questionCell} ${isUsed ? styles.usedQuestion : ''}`}
                    key={question.id}
                    disabled={isUsed || phase !== 'board'}
                    aria-label={`${category.title} за ${question.price}`}
                    onClick={() => selectQuestion(question.id, question.price)}
                  >
                    {isUsed ? '—' : question.price}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <p className={styles.nextStepNote}>
          Выберите вопрос. Ведущий назначает отвечающего и отмечает результат.
        </p>
      </section>
      <QuestionPanel />
    </main>
  )
}
