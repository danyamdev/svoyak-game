import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useGameSessionStore, type GameMode } from '../../features/game-session-store'
import { ConfirmationDialog } from '../../shared/ui/confirmation-dialog'
import { SpecialRulesDialog } from '../../widgets/special-rules-dialog'
import styles from './setup-page.module.scss'

export function SetupPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isResetConfirmationOpen, setResetConfirmationOpen] = useState(false)
  const [isRulesOpen, setRulesOpen] = useState(false)
  const {
    mode,
    participants,
    setMode,
    addParticipant,
    removeParticipant,
    renameParticipant,
    addTeamMember,
    removeTeamMember,
    renameTeamMember,
    startSession,
    resetGame,
  } = useGameSessionStore()

  function handleModeChange(nextMode: GameMode) {
    if (nextMode === mode) return
    setError(null)
    setMode(nextMode)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setRulesOpen(true)
  }

  function startConfiguredGame() {
    const result = startSession()

    if (!result.success) {
      setError(result.message ?? 'Не удалось начать игру')
      setRulesOpen(false)
      return
    }

    setRulesOpen(false)
    void navigate('/game')
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.backLink} to="/">
          ← На главную
        </Link>
        <button
          className={styles.resetButton}
          type="button"
          onClick={() => setResetConfirmationOpen(true)}
        >
          Сбросить настройки
        </button>
      </header>

      <section className={styles.content}>
        <div className={styles.titleBlock}>
          <p>Подготовка к игре</p>
          <h1>Кто сегодня играет?</h1>
          <span>Настройки сохраняются автоматически в этом браузере.</span>
          <Link className={styles.editorLink} to="/editor">
            Настроить категории и вопросы →
          </Link>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <fieldset className={styles.modePicker}>
            <legend>Формат игры</legend>
            <div>
              <button
                className={mode === 'individual' ? styles.activeMode : undefined}
                type="button"
                aria-pressed={mode === 'individual'}
                onClick={() => handleModeChange('individual')}
              >
                👤 Отдельные игроки
              </button>
              <button
                className={mode === 'team' ? styles.activeMode : undefined}
                type="button"
                aria-pressed={mode === 'team'}
                onClick={() => handleModeChange('team')}
              >
                👥 Команды
              </button>
            </div>
          </fieldset>

          <div className={styles.participantList}>
            {participants.map((participant, participantIndex) => (
              <article className={styles.participantCard} key={participant.id}>
                <div className={styles.participantHeader}>
                  <span className={styles.participantNumber}>{participantIndex + 1}</span>
                  <label>
                    {participant.type === 'team' ? 'Название команды' : 'Имя игрока'}
                    <input
                      value={participant.name}
                      maxLength={40}
                      onChange={(event) =>
                        renameParticipant(participant.id, event.currentTarget.value)
                      }
                    />
                  </label>
                  <button
                    type="button"
                    aria-label={`Удалить ${participant.name || 'участника'}`}
                    disabled={participants.length <= 2}
                    onClick={() => removeParticipant(participant.id)}
                  >
                    ×
                  </button>
                </div>

                {participant.type === 'team' && (
                  <div className={styles.memberList}>
                    <p>Состав команды</p>
                    {participant.members.map((member, memberIndex) => (
                      <div className={styles.memberRow} key={member.id}>
                        <label>
                          <span>Участник {memberIndex + 1}</span>
                          <input
                            value={member.name}
                            maxLength={40}
                            onChange={(event) =>
                              renameTeamMember(participant.id, member.id, event.currentTarget.value)
                            }
                          />
                        </label>
                        <button
                          type="button"
                          aria-label={`Удалить ${member.name || 'участника команды'}`}
                          disabled={participant.members.length <= 1}
                          onClick={() => removeTeamMember(participant.id, member.id)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      className={styles.addMemberButton}
                      type="button"
                      disabled={participant.members.length >= 5}
                      onClick={() => addTeamMember(participant.id)}
                    >
                      + Добавить участника
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>

          <button
            className={styles.addParticipantButton}
            type="button"
            disabled={participants.length >= 5}
            onClick={addParticipant}
          >
            + Добавить {mode === 'team' ? 'команду' : 'игрока'}
          </button>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <footer className={styles.formFooter}>
            <p>
              {participants.length} из 5 {mode === 'team' ? 'команд' : 'игроков'}
            </p>
            <button className={styles.startButton} type="submit">
              Начать игру <span aria-hidden="true">→</span>
            </button>
          </footer>
        </form>
      </section>
      <ConfirmationDialog
        open={isResetConfirmationOpen}
        title="Сбросить игру и участников?"
        description="Будут удалены текущий счёт, прогресс раундов и настройки участников. Отменить это действие будет нельзя."
        confirmLabel="Сбросить игру"
        onConfirm={() => {
          resetGame()
          setError(null)
          setResetConfirmationOpen(false)
        }}
        onOpenChange={setResetConfirmationOpen}
      />
      <SpecialRulesDialog
        open={isRulesOpen}
        onOpenChange={setRulesOpen}
        onStart={startConfiguredGame}
      />
    </main>
  )
}
