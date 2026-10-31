import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { GamePage } from '../pages/game-page'
import { EditorPage } from '../pages/editor-page'
import { HomePage } from '../pages/home-page'
import { SetupPage } from '../pages/setup-page'
import { BackgroundMusic } from '../widgets/background-music'
import { HalloweenAtmosphere } from '../widgets/halloween-atmosphere'
import styles from './app.module.scss'
import './styles/global.scss'

export function App() {
  return (
    <div className={styles.app}>
      <HalloweenAtmosphere />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/editor" element={<EditorPage />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <BackgroundMusic />
    </div>
  )
}
