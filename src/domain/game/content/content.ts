import type { ContentBlock } from '../model'

/** Возвращает текстовое представление контента для текущего текстового интерфейса. */
export function getContentText(content: ContentBlock[]): string {
  return content
    .map((block) => {
      if (block.type === 'text') return block.text
      if (block.type === 'image') return block.alt
      return block.title
    })
    .filter(Boolean)
    .join(' ')
}
