import { Link, Navigate } from 'react-router-dom'

import { ROUND_PRICE_SCALES } from '../../domain/game'
import { useGameSessionStore } from '../../features/game-session-store'
import styles from './game-page.module.scss'

const categoryNames = ['Призраки', 'Зелья', 'Проклятия', 'Монстры', 'Тёмные истории']

export function GamePage() {
  const { status, participants, scores, roundIndex, changeScore, setRoundIndex } =
    useGameSessionStore()

  if (status !== 'active') {
    return <Navigate to="/setup" replace />
  }

  const prices = ROUND_PRICE_SCALES[roundIndex]

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
          {categoryNames.map((category) => (
            <div className={styles.boardRow} key={category}>
              <div className={styles.category}>{category}</div>
              {prices.map((price) => (
                <button
                  type="button"
                  className={styles.questionCell}
                  key={`${category}-${price}`}
                  disabled
                  title="Вопросы будут подключены на следующем этапе"
                >
                  {price}
                </button>
              ))}
            </div>
          ))}
        </div>

        <p className={styles.nextStepNote}>
          Состав, счёт и выбранный раунд уже сохраняются. Открытие вопросов подключим следующим
          шагом.
        </p>
      </section>
    </main>
  )
}
