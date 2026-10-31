import { useState, type FormEvent } from 'react'

import { useGameSessionStore } from '../../features/game-session-store'
import styles from './score-controls.module.scss'

interface ScoreControlsProps {
  participantId: string
  participantName: string
}

export function ScoreControls({ participantId, participantName }: ScoreControlsProps) {
  const changeScore = useGameSessionStore(({ changeScore }) => changeScore)
  const [error, setError] = useState<string | null>(null)

  function adjustBy(delta: number) {
    changeScore(participantId, delta)
    setError(null)
  }

  function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const delta = Number(new FormData(form).get('scoreDelta'))

    if (!Number.isInteger(delta) || delta === 0) {
      setError('Введите целое число, кроме нуля')
      return
    }

    adjustBy(delta)
    form.reset()
  }

  return (
    <div className={styles.controls} aria-label={`Изменить счёт: ${participantName}`}>
      <div className={styles.quickActions}>
        <button type="button" onClick={() => adjustBy(-100)}>
          −100
        </button>
        <button type="button" onClick={() => adjustBy(100)}>
          +100
        </button>
      </div>
      <form onSubmit={submitAdjustment}>
        <input
          name="scoreDelta"
          type="number"
          step="1"
          placeholder="Например, −250"
          aria-label={`Корректировка счёта: ${participantName}`}
          required
        />
        <button type="submit">Применить</button>
      </form>
      {error && (
        <span className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
