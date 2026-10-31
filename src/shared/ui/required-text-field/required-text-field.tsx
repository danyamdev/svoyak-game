import { useId, useState, type ChangeEvent } from 'react'

import styles from './required-text-field.module.scss'

interface RequiredTextFieldProps {
  label: string
  value: string
  multiline?: boolean
  rows?: number
  className?: string
  maxLength?: number
  masked?: boolean
  onCommit: (value: string) => void
}

export function RequiredTextField({
  label,
  value,
  multiline = false,
  rows = 2,
  className,
  maxLength,
  masked = false,
  onCommit,
}: RequiredTextFieldProps) {
  const errorId = useId()
  const [draft, setDraft] = useState(value)
  const [error, setError] = useState<string | null>(null)
  const [isVisible, setVisible] = useState(!masked)

  function commit() {
    const nextValue = draft.trim()
    if (!nextValue) {
      setError('Поле не может быть пустым')
      return
    }

    setError(null)
    setDraft(nextValue)
    if (nextValue !== value) onCommit(nextValue)
  }

  const commonProps = {
    value: draft,
    maxLength,
    required: true,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? errorId : undefined,
    onBlur: commit,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setDraft(event.currentTarget.value)
      if (error && event.currentTarget.value.trim()) setError(null)
    },
  }

  return (
    <label className={className}>
      {label}
      <span className={styles.fieldControl}>
        {multiline ? (
          <textarea
            {...commonProps}
            className={!isVisible ? styles.maskedValue : undefined}
            rows={rows}
          />
        ) : (
          <input {...commonProps} type={isVisible ? 'text' : 'password'} />
        )}
        {masked && (
          <button
            className={styles.visibilityButton}
            type="button"
            aria-label={isVisible ? `Скрыть: ${label}` : `Показать: ${label}`}
            aria-pressed={isVisible}
            onClick={() => setVisible((visible) => !visible)}
          >
            {isVisible ? '🙈' : '👁'}
          </button>
        )}
      </span>
      {error && (
        <span className={styles.error} id={errorId} role="alert">
          {error}
        </span>
      )}
    </label>
  )
}
