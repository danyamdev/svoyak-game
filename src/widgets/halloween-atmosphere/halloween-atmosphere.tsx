import styles from './halloween-atmosphere.module.scss'

export function HalloweenAtmosphere() {
  return (
    <div className={styles.atmosphere} aria-hidden="true">
      <span className={styles.webLeft} />
      <span className={styles.webRight} />
      <span className={styles.spiderLeft}>🕷️</span>
      <span className={styles.spiderRight}>🕷️</span>
      <span className={styles.fog} />
      <span className={styles.pumpkin}>🎃</span>
    </div>
  )
}
