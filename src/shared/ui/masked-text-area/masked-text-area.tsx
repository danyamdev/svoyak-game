import { useState } from 'react'

import styles from './masked-text-area.module.scss'

interface MaskedTextAreaProps {
  label: string
  hint?: string
  value: string
  rows?: number
  onCommit: (value: string) => void
}

export function MaskedTextArea({ label, hint, value, rows = 2, onCommit }: MaskedTextAreaProps) {
  const [draft, setDraft] = useState(value)
  const [isVisible, setVisible] = useState(false)

  return (
    <label className={styles.field}>
      {label}
      {hint && <span className={styles.hint}>{hint}</span>}
      <span className={styles.control}>
        <textarea
          className={!isVisible ? styles.maskedValue : undefined}
          rows={rows}
          value={draft}
          onBlur={() => onCommit(draft)}
          onChange={(event) => setDraft(event.currentTarget.value)}
        />
        <button
          type="button"
          aria-label={isVisible ? `Скрыть: ${label}` : `Показать: ${label}`}
          aria-pressed={isVisible}
          onClick={() => setVisible((visible) => !visible)}
        >
          {isVisible ? '🙈' : '👁'}
        </button>
      </span>
    </label>
  )
}
