import { HomePage } from '../pages/home-page'
import styles from './app.module.scss'
import './styles/global.scss'

export function App() {
  return (
    <div className={styles.app}>
      <HomePage />
    </div>
  )
}
