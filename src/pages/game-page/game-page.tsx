import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { useGameDefinitionStore } from '../../features/game-definition-store'
import { useGameSessionStore } from '../../features/game-session-store'
import { ConfirmationDialog } from '../../shared/ui/confirmation-dialog'
import { FinalPanel } from '../../widgets/final-panel'
import { QuestionPanel } from '../../widgets/question-panel'
import { RoundCompletePanel } from '../../widgets/round-complete-panel'
import { ScoreControls } from '../../widgets/score-controls'
import styles from './game-page.module.scss'

export function GamePage() {
  const navigate = useNavigate()
  const [pendingPath, setPendingPath] = useState<string | null>(null)
  const definition = useGameDefinitionStore(({ definition }) => definition)
  const {
    status,
    participants,
    scores,
    roundIndex,
    phase,
    usedQuestionIds,
    history,
    selectQuestion,
    undo,
  } = useGameSessionStore()

  useEffect(() => {
    if (status !== 'active' || phase === 'results') return

    // Браузеры показывают собственный текст предупреждения; приложение может только запросить его.
    function preventAccidentalClose(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', preventAccidentalClose)
    return () => window.removeEventListener('beforeunload', preventAccidentalClose)
  }, [phase, status])

  if (status !== 'active') {
    return <Navigate to="/setup" replace />
  }

  const round = definition.rounds[roundIndex]

  function requestNavigation(path: string) {
    if (phase === 'results') {
      void navigate(path)
      return
    }

    setPendingPath(path)
  }

  function confirmNavigation() {
    if (!pendingPath) return
    void navigate(pendingPath)
    setPendingPath(null)
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button className={styles.homeLink} type="button" onClick={() => requestNavigation('/')}>
          🎃 Своя игра
        </button>
        <div className={styles.persistenceStatus}>
          <span aria-hidden="true" />
          Сохраняется автоматически
        </div>
        <button
          className={styles.settingsLink}
          type="button"
          onClick={() => requestNavigation('/setup')}
        >
          Настройка участников
        </button>
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
            <ScoreControls participantId={participant.id} participantName={participant.name} />
          </article>
        ))}
      </section>

      <section className={styles.gameArea}>
        <div className={styles.roundControls}>
          <div>
            <span>Основная игра</span>
            <h1>{round.title}</h1>
          </div>
          <button type="button" disabled={history.length === 0} onClick={undo}>
            ↶ Отменить последнее действие
          </button>
        </div>

        <div className={styles.board} aria-label={`Игровое поле, раунд ${roundIndex + 1}`}>
          {round.categories.map((category) => (
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
                    onClick={() => selectQuestion(question.id)}
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
      <RoundCompletePanel />
      <FinalPanel />
      <ConfirmationDialog
        open={pendingPath !== null}
        title="Покинуть игровое поле?"
        description="Текущая партия сохранена. Вы сможете вернуться к ней с главной страницы, но незавершённый вопрос останется открытым."
        confirmLabel="Покинуть поле"
        onConfirm={confirmNavigation}
        onOpenChange={(open) => {
          if (!open) setPendingPath(null)
        }}
      />
    </main>
  )
}
