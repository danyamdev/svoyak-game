import { Link } from 'react-router-dom'

import { useGameSessionStore } from '../../features/game-session-store'
import styles from './home-page.module.scss'

export function HomePage() {
  const hasActiveSession = useGameSessionStore(({ status }) => status === 'active')
  const resetGame = useGameSessionStore(({ resetGame }) => resetGame)

  return (
    <main className={styles.page}>
      <div className={styles.decorations} aria-hidden="true">
        <span className={styles.moon} />
        <span className={styles.bat}>◆</span>
        <span className={styles.bat}>◆</span>
      </div>

      <header className={styles.header}>
        <Link className={styles.brand} to="/" aria-label="Своя игра — главная">
          <span className={styles.brandIcon} aria-hidden="true">
            🎃
          </span>
          <span>Своя игра</span>
        </Link>
        <span className={styles.themeBadge}>Хэллоуин-вечеринка</span>
      </header>

      <section className={styles.hero}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Интеллектуальная викторина</p>
          <h1>Мозги на стол! Начинаем Свояк!</h1>

          <div className={styles.actions}>
            <Link className={styles.primaryAction} to="/setup" onClick={resetGame}>
              Создать игру
              <span aria-hidden="true">→</span>
            </Link>
            {hasActiveSession ? (
              <Link className={styles.secondaryAction} to="/game">
                Продолжить игру
              </Link>
            ) : (
              <p className={styles.developmentNote}>Настройте участников и начните новую игру</p>
            )}
          </div>

          <ul className={styles.features} aria-label="Возможности игры">
            <li>3 раунда</li>
            <li>Спецвопросы</li>
            <li>Игроки и команды</li>
          </ul>
        </div>

        <figure className={styles.heroIllustration}>
          <img
            src="/assets/skeleton-quiz-host.png"
            alt="Весёлый скелет-ведущий, призрак и светящаяся тыква приглашают на викторину"
          />
        </figure>
      </section>
    </main>
  )
}
