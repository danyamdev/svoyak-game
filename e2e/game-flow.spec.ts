import { expect, test, type Page } from '@playwright/test'

test.setTimeout(120_000)

async function playQuestion(page: Page) {
  await page.locator('button[aria-label*=" за "]:not(:disabled)').first().click()
  const dialog = page.getByRole('dialog')

  if (await dialog.getByText('Кому достанется «Кот в мешке»?').isVisible()) {
    await dialog.getByRole('button', { name: 'Игрок 1', exact: true }).click()
    await dialog.getByRole('button', { name: /^\d+$/ }).first().click()
  } else if (await dialog.getByText('Кто выиграл устные торги?').isVisible()) {
    await dialog.getByRole('button', { name: /Игрок 1/ }).click()
    await dialog.getByRole('button', { name: 'Подтвердить ставку' }).click()
  } else {
    await dialog.getByRole('button', { name: 'Игрок 1', exact: true }).click()
  }

  await dialog.getByRole('button', { name: /Завершить приём ответа/ }).click()
  await dialog.getByRole('button', { name: /Основной · \+/ }).click()
  await dialog.getByRole('button', { name: /Подтвердить \+/ }).click()
  await dialog.getByRole('button', { name: 'Вернуться к полю →' }).click()
}

test('host can complete a game from setup through final results', async ({ page }) => {
  await page.goto('/setup')
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  await page.getByRole('button', { name: /Начать игру/ }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Всё понятно/ })
    .click()
  await expect(page).toHaveURL(/\/game$/)

  for (let roundIndex = 0; roundIndex < 3; roundIndex += 1) {
    for (let questionIndex = 0; questionIndex < 25; questionIndex += 1) {
      await playQuestion(page)
    }

    const nextLabel = roundIndex < 2 ? `Перейти к раунду ${roundIndex + 2} →` : 'Перейти к финалу →'
    await page.getByRole('dialog').getByRole('button', { name: nextLabel }).click()
  }

  const finalDialog = page.getByRole('dialog')
  for (const theme of ['Ночь', 'Литература', 'Кино', 'Мифы', 'Традиции', 'Музыка']) {
    await finalDialog.getByRole('button', { name: theme, exact: true }).click()
  }

  await finalDialog.locator('input[name^="wager-"]').fill('1')
  await finalDialog.getByRole('button', { name: 'Подтвердить ставки и открыть вопрос →' }).click()
  await finalDialog.getByRole('button', { name: 'Показать правильный ответ' }).click()
  await finalDialog.getByRole('button', { name: 'Верно', exact: true }).click()

  await expect(finalDialog.getByRole('heading', { name: 'Победитель: Игрок 1' })).toBeVisible()
})
