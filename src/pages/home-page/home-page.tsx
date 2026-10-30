import styles from './home-page.module.scss'

const previewCategories = ['Призраки', 'Зелья', 'Проклятия']
const previewPrices = [100, 200, 300, 400, 500]

export function HomePage() {
  return (
    <main className={styles.page}>
      <div className={styles.decorations} aria-hidden="true">
        <span className={styles.moon} />
        <span className={styles.bat}>◆</span>
        <span className={styles.bat}>◆</span>
      </div>

      <header className={styles.header}>
        <a className={styles.brand} href="/" aria-label="Своя игра — главная">
          <span className={styles.brandIcon} aria-hidden="true">
            🎃
          </span>
          <span>Своя игра</span>
        </a>
        <span className={styles.themeBadge}>Хэллоуин-вечеринка</span>
      </header>

      <section className={styles.hero}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Интеллектуальная викторина</p>
          <h1>Знания, азарт и немного магии</h1>
          <p className={styles.description}>
            Соберите до пяти игроков или команд, подготовьте вопросы и проведите свою незабываемую
            игру.
          </p>

          <div className={styles.actions}>
            <button className={styles.primaryAction} type="button" disabled>
              Создать игру
              <span aria-hidden="true">→</span>
            </button>
            <p className={styles.developmentNote}>Настройка игры появится на следующем этапе</p>
          </div>

          <ul className={styles.features} aria-label="Возможности игры">
            <li>3 раунда</li>
            <li>Поле 5 × 5</li>
            <li>Игроки и команды</li>
          </ul>
        </div>

        <div className={styles.boardShell} aria-label="Предварительный вид игрового поля">
          <div className={styles.scoreRow}>
            <div className={styles.scoreCard}>
              <span aria-hidden="true">🎃</span>
              <span>Анна</span>
              <strong>1200</strong>
            </div>
            <div className={styles.scoreCard}>
              <span aria-hidden="true">👻</span>
              <span>Марк</span>
              <strong>900</strong>
            </div>
          </div>

          <div className={styles.board}>
            <p className={styles.roundTitle}>Раунд 1</p>
            {previewCategories.map((category) => (
              <div className={styles.boardRow} key={category}>
                <span className={styles.category}>{category}</span>
                {previewPrices.map((price) => (
                  <span className={styles.price} key={price}>
                    {price}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
