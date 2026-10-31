import type { FormEvent } from 'react'
import { Dialog } from 'radix-ui'

import { findGameQuestion, getContentText } from '../../domain/game'
import { useGameDefinitionStore } from '../../features/game-definition-store'
import { useGameSessionStore } from '../../features/game-session-store'
import { QuestionTimer } from '../question-timer'
import styles from './question-panel.module.scss'

export function QuestionPanel() {
  const definition = useGameDefinitionStore(({ definition }) => definition)
  const {
    phase,
    participants,
    scores,
    activeQuestion,
    history,
    chooseCatRecipient,
    chooseCatPrice,
    chooseAuctionWinner,
    chooseAuctionBid,
    chooseAnswerer,
    revealAnswer,
    selectAnswerOutcome,
    confirmAnswerOutcome,
    skipQuestion,
    continueAfterAnswer,
    undo,
  } = useGameSessionStore()

  if (!activeQuestion || phase === 'board' || phase === 'setup') return null

  const lookup = findGameQuestion(definition, activeQuestion.questionId)
  if (!lookup) return null

  const activeParticipant = participants.find(({ id }) => id === activeQuestion.activeParticipantId)
  const prompt = getContentText(lookup.question.prompt)
  const answer = getContentText(lookup.question.answer)
  const alternativeAnswers = lookup.question.acceptedAnswers
    .filter((acceptedAnswer) => acceptedAnswer !== answer)
    .map((acceptedAnswer) => ({
      text: acceptedAnswer,
      points: Math.min(
        lookup.question.acceptedAnswerScores[acceptedAnswer] ?? lookup.question.price,
        activeQuestion.price,
      ),
    }))
  const isCatSetup = phase === 'catSetup' && activeQuestion.type === 'cat'
  const isAuctionSetup = phase === 'auctionSetup' && activeQuestion.type === 'auction'
  const isSpecialSetup = isCatSetup || isAuctionSetup
  const isCurrentAttemptConfirmed = Boolean(
    activeParticipant &&
    activeQuestion.attempts.some(({ participantId }) => participantId === activeParticipant.id),
  )

  function submitAuctionBid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const bid = Number(new FormData(event.currentTarget).get('auctionBid'))
    chooseAuctionBid(bid)
  }

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
              <span>{lookup.categoryTitle}</span>
              <strong>
                {isCatSetup ? 'Кот' : isAuctionSetup ? 'Аукцион' : activeQuestion.price}
              </strong>
            </div>
            <button type="button" disabled={history.length === 0} onClick={undo}>
              ↶ Отменить действие
            </button>
          </header>

          <div className={styles.questionContent}>
            <Dialog.Title>
              {isCatSetup ? 'Кот в мешке' : isAuctionSetup ? 'Вопрос-аукцион' : prompt}
            </Dialog.Title>
            <Dialog.Description id="question-panel-description">
              {isCatSetup
                ? 'Ведущий назначает получателя, затем выбирает минимальную или максимальную цену.'
                : isAuctionSetup
                  ? 'После устных торгов ведущий выбирает победителя и вводит итоговую ставку.'
                  : 'Ведущий выбирает участника, который отвечает на вопрос.'}
            </Dialog.Description>
          </div>

          {!isSpecialSetup && <QuestionTimer />}

          {isCatSetup && (
            <div className={styles.catSetup}>
              {!activeParticipant ? (
                <>
                  <p>Кому достанется «Кот в мешке»?</p>
                  <div className={styles.catOptions}>
                    {participants.map((participant) => (
                      <button
                        type="button"
                        key={participant.id}
                        onClick={() => chooseCatRecipient(participant.id)}
                      >
                        {participant.name}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p>
                    Получатель: <strong>{activeParticipant.name}</strong>. Выберите цену вопроса.
                  </p>
                  <div className={styles.priceOptions}>
                    {activeQuestion.catPriceOptions?.map((price) => (
                      <button type="button" key={price} onClick={() => chooseCatPrice(price)}>
                        {price}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {isAuctionSetup && (
            <div className={styles.auctionSetup}>
              {!activeParticipant ? (
                <>
                  <p>Кто выиграл устные торги?</p>
                  <div className={styles.auctionOptions}>
                    {participants.map((participant) => (
                      <button
                        type="button"
                        key={participant.id}
                        onClick={() => chooseAuctionWinner(participant.id)}
                      >
                        {participant.name}
                        <span>Счёт: {scores[participant.id] ?? 0}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p>
                    Победитель: <strong>{activeParticipant.name}</strong>. Введите итоговую ставку.
                  </p>
                  {activeQuestion.auctionBidRange && (
                    <form className={styles.bidForm} onSubmit={submitAuctionBid}>
                      <label htmlFor="auction-bid">
                        Ставка от {activeQuestion.auctionBidRange.minimum} до{' '}
                        {activeQuestion.auctionBidRange.maximum}
                      </label>
                      <div>
                        <input
                          id="auction-bid"
                          name="auctionBid"
                          type="number"
                          min={activeQuestion.auctionBidRange.minimum}
                          max={activeQuestion.auctionBidRange.maximum}
                          step="1"
                          defaultValue={activeQuestion.auctionBidRange.minimum}
                          required
                        />
                        <button type="submit">Подтвердить ставку</button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          )}

          {!isSpecialSetup && phase === 'question' && (
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
              <button className={styles.revealButton} type="button" onClick={revealAnswer}>
                Завершить приём ответа и показать варианты
              </button>
            </div>
          )}

          {phase === 'answerReveal' && (
            <div className={styles.answerReveal}>
              <span>Правильный ответ</span>
              <p>{answer}</p>
              {alternativeAnswers.length > 0 && (
                <div className={styles.alternativeAnswers}>
                  <span>Допустимые варианты</span>
                  <ul>
                    {alternativeAnswers.map(({ text, points }) => (
                      <li key={text}>
                        <span>{text}</span>
                        <strong>+{points}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {activeParticipant && !isCurrentAttemptConfirmed && (
                <div className={styles.outcomeSelection}>
                  <p>Какой ответ дал {activeParticipant.name}?</p>
                  <div>
                    <button
                      type="button"
                      aria-pressed={activeQuestion.pendingOutcome?.result === 'incorrect'}
                      onClick={() => selectAnswerOutcome('incorrect', -activeQuestion.price)}
                    >
                      Неверный · −{activeQuestion.price}
                    </button>
                    <button
                      type="button"
                      aria-pressed={activeQuestion.pendingOutcome?.result === 'correct'}
                      onClick={() => selectAnswerOutcome('correct', activeQuestion.price)}
                    >
                      Основной · +{activeQuestion.price}
                    </button>
                    {alternativeAnswers.map(({ text, points }) => (
                      <button
                        type="button"
                        aria-pressed={
                          activeQuestion.pendingOutcome?.result === 'accepted' &&
                          activeQuestion.pendingOutcome.scoreDelta === points
                        }
                        key={text}
                        onClick={() => selectAnswerOutcome('accepted', points)}
                      >
                        «{text}» · +{points}
                      </button>
                    ))}
                  </div>
                  <button
                    className={styles.confirmOutcomeButton}
                    type="button"
                    disabled={!activeQuestion.pendingOutcome}
                    onClick={confirmAnswerOutcome}
                  >
                    {activeQuestion.pendingOutcome
                      ? `Подтвердить ${activeQuestion.pendingOutcome.scoreDelta > 0 ? '+' : ''}${activeQuestion.pendingOutcome.scoreDelta} очков`
                      : 'Сначала выберите результат'}
                  </button>
                </div>
              )}
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
              {(!activeParticipant || isCurrentAttemptConfirmed) && (
                <button type="button" onClick={continueAfterAnswer}>
                  Вернуться к полю →
                </button>
              )}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
