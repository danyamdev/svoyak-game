/** Собирает основной и альтернативные ответы, удаляя пустые значения и дубликаты. */
export function normalizeAcceptedAnswers(primaryAnswer: string, alternatives: string[]) {
  const answers = [primaryAnswer, ...alternatives].map((answer) => answer.trim()).filter(Boolean)
  const seen = new Set<string>()

  return answers.filter((answer) => {
    const normalized = answer.toLocaleLowerCase('ru-RU')
    if (seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}
