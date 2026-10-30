import { Dialog } from 'radix-ui'

import { findDemoQuestion } from '../../domain/game'
import { useGameSessionStore } from '../../features/game-session-store'
import styles from './question-panel.module.scss'

export function QuestionPanel() {
  const {
    phase,
    participants,
    activeQuestion,
    history,
    chooseAnswerer,
    markCorrect,
    markIncorrect,
    skipQuestion,
    continueAfterAnswer,
    undo,
  } = useGameSessionStore()

  if (!activeQuestion || phase === 'board' || phase === 'setup') return null

  const question = findDemoQuestion(activeQuestion.questionId)
  if (!question) return null

  const activeParticipant = participants.find(({ id }) => id === activeQuestion.activeParticipantId)

  return (
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.panel}
          aria-describedby="question-panel-description"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <header className={styles.header}>
            <div>
              <span>{question.category}</span>
              <strong>{question.price}</strong>
            </div>
            <button type="button" disabled={history.length === 0} onClick={undo}>
              ↶ Отменить действие
            </button>
          </header>

          <div className={styles.questionContent}>
            <Dialog.Title>{question.prompt}</Dialog.Title>
            <Dialog.Description id="question-panel-description">
              Ведущий выбирает участника, который отвечает на вопрос.
            </Dialog.Description>
          </div>

          {phase === 'question' && (
            <div className={styles.answererSelection}>
              <p>Кто отвечает?</p>
              <div>
                {participants.map((participant) => {
                  const isEligible = activeQuestion.eligibleParticipantIds.includes(participant.id)

                  return (
                    <button
                      type="button"
                      key={participant.id}
                      disabled={!isEligible}
                      onClick={() => chooseAnswerer(participant.id)}
                    >
                      {participant.name}
                      {!isEligible && <span>Уже отвечал</span>}
                    </button>
                  )
                })}
              </div>
              <button className={styles.skipButton} type="button" onClick={skipQuestion}>
                Никто не отвечает — показать ответ
              </button>
            </div>
          )}

          {phase === 'judging' && activeParticipant && (
            <div className={styles.judging}>
              <p>
                Отвечает: <strong>{activeParticipant.name}</strong>
              </p>
              <div>
                <button className={styles.incorrectButton} type="button" onClick={markIncorrect}>
                  Неверно
                </button>
                <button className={styles.correctButton} type="button" onClick={markCorrect}>
                  Верно
                </button>
              </div>
            </div>
          )}

          {phase === 'answerReveal' && (
            <div className={styles.answerReveal}>
              <span>Правильный ответ</span>
              <p>{question.answer}</p>
              {activeQuestion.attempts.length > 0 && (
                <ul>
                  {activeQuestion.attempts.map((attempt) => {
                    const participant = participants.find(({ id }) => id === attempt.participantId)

                    return (
                      <li key={`${attempt.participantId}-${attempt.result}`}>
                        {participant?.name ?? 'Участник'}: {attempt.scoreDelta > 0 ? '+' : ''}
                        {attempt.scoreDelta}
                      </li>
                    )
                  })}
                </ul>
              )}
              <button type="button" onClick={continueAfterAnswer}>
                Вернуться к полю →
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
