import { useEffect, useState } from 'react'

import { useGameSessionStore } from '../../features/game-session-store'
import styles from './question-timer.module.scss'

function formatTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function QuestionTimer() {
  const { questionTimer, setTimerDuration, startTimer, pauseTimer, resetTimer, expireTimer } =
    useGameSessionStore()
  const [displayRemainingMs, setDisplayRemainingMs] = useState(questionTimer.remainingMs)

  useEffect(() => {
    if (questionTimer.status !== 'running' || !questionTimer.endsAt) return

    function updateRemainingTime() {
      setDisplayRemainingMs(Math.max(0, (questionTimer.endsAt ?? 0) - Date.now()))
      expireTimer()
    }

    const intervalId = window.setInterval(updateRemainingTime, 250)

    return () => window.clearInterval(intervalId)
  }, [expireTimer, questionTimer.endsAt, questionTimer.status])

  const remainingMs =
    questionTimer.status === 'running' ? displayRemainingMs : questionTimer.remainingMs

  return (
    <section className={styles.timer} aria-label="Таймер ответа">
      <div className={styles.display} aria-live="polite">
        <span>Таймер</span>
        <strong data-expired={questionTimer.status === 'expired'}>{formatTime(remainingMs)}</strong>
      </div>
      {questionTimer.status === 'expired' && (
        <p className={styles.expired} role="alert">
          Время вышло!
        </p>
      )}
      <label>
        Секунд
        <input
          type="number"
          min="5"
          max="300"
          step="5"
          value={questionTimer.durationSeconds}
          disabled={questionTimer.status === 'running'}
          onChange={(event) => setTimerDuration(Number(event.currentTarget.value))}
        />
      </label>
      <div className={styles.actions}>
        {questionTimer.status === 'running' ? (
          <button type="button" onClick={pauseTimer}>
            Пауза
          </button>
        ) : (
          <button type="button" onClick={startTimer}>
            {questionTimer.status === 'paused' ? 'Продолжить' : 'Старт'}
          </button>
        )}
        <button type="button" onClick={resetTimer}>
          Сбросить
        </button>
      </div>
    </section>
  )
}
