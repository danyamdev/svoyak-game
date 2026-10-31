import { expect, test, type Page } from '@playwright/test'

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth,
  }))

  expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1)
}

async function expectNamedVisibleButtons(page: Page) {
  const unnamedButtonCount = await page.getByRole('button').evaluateAll(
    (buttons) =>
      buttons.filter((button) => {
        const element = button as HTMLElement
        const isVisible = element.offsetWidth > 0 && element.offsetHeight > 0
        const name = element.getAttribute('aria-label') ?? element.textContent ?? ''
        return isVisible && !name.trim()
      }).length,
  )

  expect(unnamedButtonCount).toBe(0)
}

async function expectNamedVisibleFormControls(page: Page) {
  const unnamedControlCount = await page.locator('input, textarea, select').evaluateAll(
    (controls) =>
      controls.filter((control) => {
        const element = control as HTMLInputElement
        const isVisible = element.offsetWidth > 0 && element.offsetHeight > 0
        const hasName =
          Boolean(element.getAttribute('aria-label')?.trim()) ||
          Boolean(element.getAttribute('title')?.trim()) ||
          Boolean(element.labels?.length)
        return isVisible && !hasName
      }).length,
  )

  expect(unnamedControlCount).toBe(0)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/#/setup')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('key screens fit target viewports and expose named controls', async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 700 },
    { width: 768, height: 900 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport)

    for (const route of ['/#/', '/#/setup', '/#/editor']) {
      await page.goto(route)
      await expectNoHorizontalOverflow(page)
      await expectNamedVisibleButtons(page)
      await expectNamedVisibleFormControls(page)
      await expect(page.locator('main')).toHaveCount(1)
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    }
  }

  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('/#/setup')
  await page.getByRole('button', { name: /Начать игру/ }).click()
  await expectNoHorizontalOverflow(page)
  await expectNamedVisibleButtons(page)

  await page.locator('button[aria-label*=" за "]:not(:disabled)').first().click()
  await expectNoHorizontalOverflow(page)
})

test('question dialog keeps keyboard focus and cannot close with Escape', async ({ page }) => {
  await page.getByRole('button', { name: /Начать игру/ }).click()
  await page.locator('button[aria-label*=" за "]:not(:disabled)').first().click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator(':focus')).toBeVisible()

  for (let step = 0; step < 8; step += 1) {
    await page.keyboard.press('Tab')
    await expect(dialog.locator(':focus')).toBeVisible()
  }

  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
})
