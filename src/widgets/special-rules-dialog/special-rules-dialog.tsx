import { Dialog } from 'radix-ui'

import styles from './special-rules-dialog.module.scss'

interface SpecialRulesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStart: () => void
}

export function SpecialRulesDialog({ open, onOpenChange, onStart }: SpecialRulesDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.dialog} aria-describedby="special-rules-description">
          <Dialog.Title>Перед интеллектуальным шабашем</Dialog.Title>
          <Dialog.Description id="special-rules-description">
            Короткая памятка ведущему о специальных механиках.
          </Dialog.Description>
          <div className={styles.rules}>
            <article>
              <span aria-hidden="true">🐈‍⬛</span>
              <div>
                <h2>Кот в мешке</h2>
                <p>
                  Ведущий назначает получателя вопроса. Получатель отвечает один, а стоимость
                  выбирается между минимальной и максимальной стоимостью текущего раунда. Верный
                  ответ прибавляет выбранную стоимость, неверный — списывает её.
                </p>
              </div>
            </article>
            <article>
              <span aria-hidden="true">🔨</span>
              <div>
                <h2>Аукцион</h2>
                <p>
                  После устных торгов ведущий выбирает победителя и вводит ставку. Минимум — номинал
                  вопроса, максимум — положительный счёт участника или номинал, если счёт ниже.
                  Победитель отвечает один; ставка прибавляется или списывается целиком.
                </p>
              </div>
            </article>
            <article>
              <span aria-hidden="true">🧠</span>
              <div>
                <h2>Допустимые ответы</h2>
                <p>
                  Основной правильный ответ приносит полный номинал. Допустимый вариант — отдельная
                  формулировка, которой в редакторе можно назначить меньше баллов. Ведущий выбирает
                  фактически данный вариант и подтверждает начисление.
                </p>
              </div>
            </article>
            <article>
              <span aria-hidden="true">⚡</span>
              <div>
                <h2>Дополнительный вопрос</h2>
                <p>
                  Это отдельный вопрос для ничьей после финала. Баллы за него не начисляются:
                  ведущий выбирает участника, который ответил первым и становится победителем.
                </p>
              </div>
            </article>
          </div>
          <footer>
            <Dialog.Close type="button">Вернуться к настройкам</Dialog.Close>
            <button type="button" onClick={onStart}>
              Всё понятно — начать игру
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
