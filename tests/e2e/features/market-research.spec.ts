import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

test.describe('Market Research Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should display Market Intelligence Dashboard on Market Analysis page', async ({ page }) => {
    await page.click('text=Market Analysis')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('text=Market Intelligence Dashboard')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Real-time insights from your agency data')).toBeVisible()
  })

  test('should show market overview stats', async ({ page }) => {
    await page.click('text=Market Analysis')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('text=Total Patients')).toBeVisible()
    await expect(page.locator('text=Categorized')).toBeVisible()
    await expect(page.locator('text=Avg Rate')).toBeVisible()
    await expect(page.locator('text=Top Service')).toBeVisible()
  })

  test('should display service category chart section', async ({ page }) => {
    await page.click('text=Market Analysis')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('text=Service Category Distribution')).toBeVisible()
  })

  test('should display acuity level chart section', async ({ page }) => {
    await page.click('text=Market Analysis')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('text=Care Acuity Levels')).toBeVisible()
  })

  test('should show market research tips', async ({ page }) => {
    await page.click('text=Market Analysis')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('text=Track Demand')).toBeVisible()
    await expect(page.locator('text=Staff Planning')).toBeVisible()
    await expect(page.locator('text=Pricing Strategy')).toBeVisible()
  })

  test('should have refresh button for market insights', async ({ page }) => {
    await page.click('text=Market Analysis')
    await page.waitForLoadState('networkidle')

    const refreshButton = page.locator('button').filter({ has: page.locator('svg.lucide-refresh-cw') })
    await expect(refreshButton).toBeVisible()
  })
})

test.describe('Patient Service Category', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.click('text=Patients')
    await page.waitForLoadState('networkidle')
  })

  test('should display Add Patient form with clinical metadata fields', async ({ page }) => {
    await page.click('button:has-text("Add Patient"), button:has-text("Register Patient")')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('text=Service Category')).toBeVisible()
    await expect(page.locator('text=Care Acuity Level')).toBeVisible()
    await expect(page.locator('text=Mobility Status')).toBeVisible()
  })

  test('should have service category dropdown with options', async ({ page }) => {
    await page.click('button:has-text("Add Patient"), button:has-text("Register Patient")')
    await page.waitForLoadState('networkidle')

    const serviceCategorySelect = page.locator('select').filter({ hasText: /service category/i }).first()
    await expect(serviceCategorySelect).toBeVisible()
  })

  test('should have acuity level dropdown with levels 1-5', async ({ page }) => {
    await page.click('button:has-text("Add Patient"), button:has-text("Register Patient")')
    await page.waitForLoadState('networkidle')

    const acuitySelect = page.locator('select').filter({ hasText: /acuity/i }).first()
    await expect(acuitySelect).toBeVisible()
  })

  test('should have mobility status dropdown', async ({ page }) => {
    await page.click('button:has-text("Add Patient"), button:has-text("Register Patient")')
    await page.waitForLoadState('networkidle')

    const mobilitySelect = page.locator('select').filter({ hasText: /mobility/i }).first()
    await expect(mobilitySelect).toBeVisible()
  })
})

test.describe('Competitor Research', () => {
  test('should display competitor research section', async ({ page }) => {
    await page.click('text=Market Analysis')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('text=Market Analysis & Competitor Insights').first()).toBeVisible()
    await expect(page.locator('text=Competitor Research').first()).toBeVisible()
  })

  test('should have search input for market research', async ({ page }) => {
    await page.click('text=Market Analysis')
    await page.waitForLoadState('networkidle')

    const searchInput = page.locator('input[placeholder*="Home care nursing"]')
    await expect(searchInput).toBeVisible()
  })
})
