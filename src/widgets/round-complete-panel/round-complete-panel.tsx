import { Dialog } from 'radix-ui'

import { useGameDefinitionStore } from '../../features/game-definition-store'
import { useGameSessionStore } from '../../features/game-session-store'
import styles from './round-complete-panel.module.scss'

export function RoundCompletePanel() {
  const totalRounds = useGameDefinitionStore(({ definition }) => definition.rounds.length)
  const { phase, roundIndex, participants, scores, history, advanceRound, startFinal, undo } =
    useGameSessionStore()

  if (phase !== 'roundComplete') return null

  const leaderboard = [...participants].sort(
    (first, second) => (scores[second.id] ?? 0) - (scores[first.id] ?? 0),
  )
  const hasNextRound = roundIndex + 1 < totalRounds

  return (
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.panel}
          aria-describedby="round-complete-description"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <span className={styles.eyebrow}>Все вопросы сыграны</span>
          <Dialog.Title>Раунд {roundIndex + 1} завершён</Dialog.Title>
          <Dialog.Description id="round-complete-description">
            {hasNextRound
              ? 'Проверьте текущий счёт перед переходом к следующему раунду.'
              : 'Основная игра завершена. Участники с положительным счётом проходят в финал.'}
          </Dialog.Description>

          <ol className={styles.leaderboard} aria-label="Результаты раунда">
            {leaderboard.map((participant, index) => (
              <li key={participant.id}>
                <span className={styles.position}>{index + 1}</span>
                <strong>{participant.name}</strong>
                <span className={styles.score}>{scores[participant.id] ?? 0}</span>
              </li>
            ))}
          </ol>

          <div className={styles.actions}>
            <button
              className={styles.undoButton}
              type="button"
              disabled={history.length === 0}
              onClick={undo}
            >
              ↶ Отменить последнее действие
            </button>
            <button
              className={styles.nextButton}
              type="button"
              onClick={hasNextRound ? advanceRound : startFinal}
            >
              {hasNextRound ? `Перейти к раунду ${roundIndex + 2} →` : 'Перейти к финалу →'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
