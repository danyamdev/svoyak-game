import { expect, test, type Page } from '@playwright/test'

async function clearState(page: Page, route = '/setup') {
  await page.goto(route)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
}

async function startGame(page: Page) {
  await page.getByRole('button', { name: /Начать игру/ }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Всё понятно/ })
    .click()
}

test('finishing a game clears session data but preserves editor data', async ({ page }) => {
  await clearState(page)
  await page.getByLabel('Имя игрока').first().fill('Старая команда')
  await startGame(page)

  await expect(page.getByLabel('Счёт скрыт').first()).toBeVisible()
  await page.getByRole('button', { name: 'Показать счёт' }).click()
  await expect(page.getByLabel('Счёт: 0').first()).toBeVisible()

  await page.getByRole('button', { name: 'Закончить игру' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Закончить и очистить' }).click()
  await expect(page).toHaveURL(/\/$/)

  await page.getByRole('link', { name: /Создать игру/ }).click()
  await expect(page.getByLabel('Имя игрока').first()).toHaveValue('Игрок 1')
})

test('editor saves a scored alternative and manages independent sections', async ({ page }) => {
  await clearState(page, '/editor')
  const firstQuestion = page.getByText('Вопрос 1', { exact: true }).first().locator('xpath=../..')

  await firstQuestion.getByRole('button', { name: '+ Добавить вариант' }).click()
  await firstQuestion.locator('input[type="password"]').last().fill('Почти ответ')
  await firstQuestion.locator('input[type="number"]').last().fill('50')
  await firstQuestion.getByRole('button', { name: 'Сохранить варианты' }).click()
  await page.reload()

  const restoredQuestion = page
    .getByText('Вопрос 1', { exact: true })
    .first()
    .locator('xpath=../..')
  await expect(restoredQuestion.locator('input[type="password"]').last()).toHaveValue('Почти ответ')
  await expect(restoredQuestion.locator('input[type="number"]').last()).toHaveValue('50')

  await page.getByRole('button', { name: '+ Добавить категорию' }).click()
  await expect(page.getByLabel('Категория 6')).toHaveValue('Новая категория 6')
  await page.getByRole('button', { name: 'Финал' }).click()
  await expect(
    page.getByRole('heading', { name: 'Дополнительный вопрос при ничьей' }),
  ).toBeVisible()
})

test('timer and music volume survive navigation and reload safely', async ({ page }) => {
  await clearState(page)
  const volume = page.getByLabel('Громкость музыки')
  await volume.fill('0.4')
  await page.reload()
  await expect(page.getByLabel('Громкость музыки')).toHaveValue('0.4')

  await startGame(page)
  await page.locator('button[aria-label*=" за "]:not(:disabled)').first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Игрок 1', exact: true }).click()
  await dialog.getByLabel('Секунд').fill('5')
  await dialog.getByRole('button', { name: 'Старт', exact: true }).click()
  await page.waitForTimeout(1_100)
  await page.reload()

  await expect(page.getByRole('dialog').getByText(/0:0[1-4]/)).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Пауза' }).click()
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Продолжить' })).toBeVisible()
})
