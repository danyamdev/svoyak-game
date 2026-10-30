import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Dialog } from 'radix-ui'

import { getContentText } from '../../domain/game'
import { useGameDefinitionStore } from '../../features/game-definition-store'
import { useGameSessionStore } from '../../features/game-session-store'
import styles from './final-panel.module.scss'

const FINAL_PHASES = new Set([
  'finalThemeSelection',
  'finalWager',
  'finalQuestion',
  'finalJudging',
  'tieBreakerQuestion',
  'tieBreakerJudging',
  'results',
])

export function FinalPanel() {
  const definition = useGameDefinitionStore(({ definition }) => definition)
  const {
    phase,
    participants,
    scores,
    finalState,
    history,
    eliminateFinalTheme,
    submitFinalWagers,
    openFinalQuestion,
    revealFinalAnswer,
    judgeFinalParticipant,
    revealTieBreakerAnswer,
    chooseTieBreakerWinner,
    restartSession,
    undo,
  } = useGameSessionStore()

  if (!FINAL_PHASES.has(phase) || !finalState) return null

  const eligibleParticipants = participants.filter(({ id }) =>
    finalState.eligibleParticipantIds.includes(id),
  )
  const selectedTheme = definition.finalThemes.find(({ id }) => id === finalState.selectedThemeId)
  const tieBreaker = definition.tieBreakers[0]

  function submitWagers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const wagers = Object.fromEntries(
      eligibleParticipants.map(({ id }) => [id, Number(formData.get(`wager-${id}`))]),
    )
    submitFinalWagers(wagers)
    openFinalQuestion()
  }

  return (
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.panel}
          aria-describedby="final-panel-description"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <header className={styles.header}>
            <span>Финальный раунд</span>
            {phase !== 'results' && (
              <button type="button" disabled={history.length === 0} onClick={undo}>
                ↶ Отменить действие
              </button>
            )}
          </header>

          {phase === 'finalThemeSelection' && (
            <section className={styles.themeSelection}>
              <Dialog.Title>Оставьте одну тему</Dialog.Title>
              <Dialog.Description id="final-panel-description">
                Ведущий по очереди исключает шесть тем финала.
              </Dialog.Description>
              <div className={styles.themeGrid}>
                {definition.finalThemes.map((theme) => {
                  const isEliminated = finalState.eliminatedThemeIds.includes(theme.id)

                  return (
                    <button
                      type="button"
                      className={isEliminated ? styles.eliminatedTheme : undefined}
                      key={theme.id}
                      disabled={isEliminated}
                      onClick={() => eliminateFinalTheme(theme.id)}
                    >
                      {theme.title}
                    </button>
                  )
                })}
              </div>
              <p>
                Осталось тем: {finalState.themeIds.length - finalState.eliminatedThemeIds.length}
              </p>
            </section>
          )}

          {phase === 'finalWager' && selectedTheme && (
            <section className={styles.wagerSection}>
              <Dialog.Title>Тема: {selectedTheme.title}</Dialog.Title>
              <Dialog.Description id="final-panel-description">
                Ведущий вводит ставки участников. Минимальная ставка — 1 очко.
              </Dialog.Description>
              <form onSubmit={submitWagers}>
                {eligibleParticipants.map((participant) => (
                  <label key={participant.id}>
                    <span>
                      {participant.name} · счёт {scores[participant.id] ?? 0}
                    </span>
                    <input
                      name={`wager-${participant.id}`}
                      type="number"
                      min="1"
                      max={scores[participant.id] ?? 0}
                      defaultValue="1"
                      step="1"
                      required
                    />
                  </label>
                ))}
                <button type="submit">Подтвердить ставки и открыть вопрос →</button>
              </form>
            </section>
          )}

          {phase === 'finalQuestion' && selectedTheme && (
            <section className={styles.questionSection}>
              <Dialog.Title>{selectedTheme.title}</Dialog.Title>
              <Dialog.Description id="final-panel-description">
                Участники записывают ответы вне приложения.
              </Dialog.Description>
              <p>{getContentText(selectedTheme.prompt)}</p>
              <button type="button" onClick={revealFinalAnswer}>
                Показать правильный ответ
              </button>
            </section>
          )}

          {phase === 'finalJudging' && selectedTheme && (
            <section className={styles.judgingSection}>
              <Dialog.Title>Правильный ответ</Dialog.Title>
              <Dialog.Description id="final-panel-description">
                {getContentText(selectedTheme.answer)}
              </Dialog.Description>
              <div>
                {eligibleParticipants.map((participant) => {
                  const isJudged = finalState.judgedParticipantIds.includes(participant.id)

                  return (
                    <article key={participant.id}>
                      <p>
                        <strong>{participant.name}</strong>
                        <span>Ставка: {finalState.wagers[participant.id]}</span>
                      </p>
                      {isJudged ? (
                        <span className={styles.judged}>Ответ оценён</span>
                      ) : (
                        <div>
                          <button
                            type="button"
                            className={styles.incorrectButton}
                            onClick={() => judgeFinalParticipant(participant.id, 'incorrect')}
                          >
                            Неверно
                          </button>
                          <button
                            type="button"
                            className={styles.correctButton}
                            onClick={() => judgeFinalParticipant(participant.id, 'correct')}
                          >
                            Верно
                          </button>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            </section>
          )}

          {phase === 'tieBreakerQuestion' && tieBreaker && (
            <section className={styles.questionSection}>
              <Dialog.Title>Дополнительный вопрос</Dialog.Title>
              <Dialog.Description id="final-panel-description">
                Только для участников с одинаковым максимальным счётом.
              </Dialog.Description>
              <p>{getContentText(tieBreaker.prompt)}</p>
              <button type="button" onClick={revealTieBreakerAnswer}>
                Показать правильный ответ
              </button>
            </section>
          )}

          {phase === 'tieBreakerJudging' && tieBreaker && (
            <section className={styles.tieJudging}>
              <Dialog.Title>Кто ответил правильно первым?</Dialog.Title>
              <Dialog.Description id="final-panel-description">
                Правильный ответ: {getContentText(tieBreaker.answer)}
              </Dialog.Description>
              <div>
                {participants
                  .filter(({ id }) => finalState.tieParticipantIds.includes(id))
                  .map((participant) => (
                    <button
                      type="button"
                      key={participant.id}
                      onClick={() => chooseTieBreakerWinner(participant.id)}
                    >
                      {participant.name}
                    </button>
                  ))}
              </div>
            </section>
          )}

          {phase === 'results' && (
            <Results
              participants={participants}
              scores={scores}
              winnerParticipantIds={finalState.winnerParticipantIds}
              restartSession={restartSession}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

interface ResultsProps {
  participants: { id: string; name: string }[]
  scores: Record<string, number>
  winnerParticipantIds: string[]
  restartSession: () => void
}

function Results({ participants, scores, winnerParticipantIds, restartSession }: ResultsProps) {
  const leaderboard = [...participants].sort(
    (first, second) => (scores[second.id] ?? 0) - (scores[first.id] ?? 0),
  )
  const winners = participants.filter(({ id }) => winnerParticipantIds.includes(id))

  return (
    <section className={styles.results}>
      <Dialog.Title>Победитель: {winners.map(({ name }) => name).join(', ')}</Dialog.Title>
      <Dialog.Description id="final-panel-description">Итоговый счёт игры</Dialog.Description>
      <ol>
        {leaderboard.map((participant, index) => (
          <li key={participant.id}>
            <span>{index + 1}</span>
            <strong>{participant.name}</strong>
            <span>{scores[participant.id] ?? 0}</span>
          </li>
        ))}
      </ol>
      <div>
        <Link to="/">На главную</Link>
        <button type="button" onClick={restartSession}>
          Сыграть ещё раз
        </button>
      </div>
    </section>
  )
}
