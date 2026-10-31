import { useRef, useState, type ChangeEvent } from 'react'

import {
  parseGameDefinitionFile,
  serializeGameDefinition,
} from '../../features/game-definition-file'
import { useGameDefinitionStore } from '../../features/game-definition-store'
import { useGameSessionStore } from '../../features/game-session-store'
import { ConfirmationDialog } from '../../shared/ui/confirmation-dialog'
import styles from './package-transfer.module.scss'

const MAX_PACKAGE_SIZE = 2 * 1024 * 1024

export function PackageTransfer() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pendingSource, setPendingSource] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const definition = useGameDefinitionStore(({ definition }) => definition)
  const replaceDefinition = useGameDefinitionStore(({ replaceDefinition }) => replaceDefinition)
  const sessionStatus = useGameSessionStore(({ status }) => status)
  const sessionPhase = useGameSessionStore(({ phase }) => phase)

  function exportPackage() {
    const blob = new Blob([serializeGameDefinition(definition)], {
      type: 'application/json;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'svoyak-game-package.json'
    link.click()

    // Object URL нужен только на время запуска загрузки и не должен оставаться в памяти вкладки.
    URL.revokeObjectURL(url)
    setIsError(false)
    setMessage('Пакет экспортирован.')
  }

  async function selectPackage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    if (sessionStatus === 'active' && sessionPhase !== 'results') {
      setIsError(true)
      setMessage('Завершите или сбросьте активную партию перед импортом пакета.')
      return
    }

    if (file.size > MAX_PACKAGE_SIZE) {
      setIsError(true)
      setMessage('Размер JSON-файла не должен превышать 2 МБ.')
      return
    }

    try {
      const source = await file.text()
      const result = parseGameDefinitionFile(source)

      if (!result.success) {
        setIsError(true)
        setMessage(result.message)
        return
      }

      setMessage(null)
      setPendingSource(source)
    } catch {
      setIsError(true)
      setMessage('Не удалось прочитать выбранный файл.')
    }
  }

  function importPendingPackage() {
    if (!pendingSource) return
    const result = parseGameDefinitionFile(pendingSource)

    // Повторная проверка защищает границу хранилища, даже если состояние диалога изменится.
    if (!result.success || !replaceDefinition(result.definition)) {
      setIsError(true)
      setMessage(result.success ? 'Не удалось сохранить пакет.' : result.message)
      setPendingSource(null)
      return
    }

    setIsError(false)
    setMessage('Пакет импортирован и сохранён в этом браузере.')
    setPendingSource(null)
  }

  return (
    <section className={styles.transfer} aria-labelledby="package-transfer-title">
      <div>
        <h2 id="package-transfer-title">Файл пакета</h2>
        <p>Экспортируйте вопросы в JSON или загрузите ранее подготовленный пакет.</p>
      </div>
      <div className={styles.actions}>
        <button type="button" onClick={exportPackage}>
          Скачать JSON
        </button>
        <button type="button" onClick={() => inputRef.current?.click()}>
          Загрузить JSON
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          aria-label="Выбрать JSON-пакет"
          onChange={(event) => void selectPackage(event)}
        />
      </div>
      {message && (
        <p className={isError ? styles.error : styles.success} role={isError ? 'alert' : 'status'}>
          {message}
        </p>
      )}
      <ConfirmationDialog
        open={pendingSource !== null}
        title="Заменить текущий пакет?"
        description="Все текущие темы, вопросы и ответы редактора будут заменены данными из выбранного JSON-файла."
        confirmLabel="Импортировать"
        onConfirm={importPendingPackage}
        onOpenChange={(open) => {
          if (!open) setPendingSource(null)
        }}
      />
    </section>
  )
}
