# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: features/market-research.spec.ts >> Market Research Features >> should display Market Intelligence Dashboard on Market Analysis page
- Location: tests/e2e/features/market-research.spec.ts:10:3

# Error details

```
TimeoutError: page.click: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('text=Market Analysis')
    - locator resolved to <span class="font-medium">Market Analysis</span>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
      - waiting 100ms
    14 × waiting for element to be visible, enabled and stable
       - element is not visible
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - region "Notifications alt+T"
  - main [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e7]:
        - generic [ref=e8]: Admin Portal
        - generic [ref=e9]: Viewer
      - generic [ref=e10]:
        - img [ref=e11]
        - textbox "Search staff, patients, or records... (Ctrl+K)" [ref=e14]
        - generic [ref=e15]:
          - generic [ref=e16]: Ctrl
          - generic [ref=e17]: K
      - generic [ref=e18]:
        - button [ref=e19]:
          - img [ref=e20]
        - img "Admin" [ref=e28]
    - generic [ref=e31]:
      - generic [ref=e32]:
        - generic [ref=e37]: NursingCare Solutions
        - heading "Sign In" [level=1] [ref=e38]
        - paragraph [ref=e39]: Enter your credentials to continue
      - generic [ref=e40]:
        - generic [ref=e41]:
          - text: Email Address
          - generic [ref=e42]:
            - img [ref=e43]
            - textbox "your@email.com" [active] [ref=e46]
        - generic [ref=e47]:
          - text: Password
          - generic [ref=e48]:
            - img [ref=e49]
            - textbox "Enter your password" [ref=e52]
            - button [ref=e53]:
              - img [ref=e54]
        - button "Sign In" [disabled] [ref=e57]:
          - text: Sign In
          - img [ref=e58]
      - paragraph [ref=e61]: NursingCare Solutions — Secure Staff Portal
  - button [ref=e63]:
    - img [ref=e64]
  - button "Quick Actions" [ref=e68]:
    - img [ref=e69]
    - generic:
      - generic: Quick Actions
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | import type { Page } from '@playwright/test'
  3   | 
  4   | test.describe('Market Research Features', () => {
  5   |   test.beforeEach(async ({ page }) => {
  6   |     await page.goto('/')
  7   |     await page.waitForLoadState('networkidle')
  8   |   })
  9   | 
  10  |   test('should display Market Intelligence Dashboard on Market Analysis page', async ({ page }) => {
> 11  |     await page.click('text=Market Analysis')
      |                ^ TimeoutError: page.click: Timeout 10000ms exceeded.
  12  |     await page.waitForLoadState('networkidle')
  13  | 
  14  |     await expect(page.locator('text=Market Intelligence Dashboard')).toBeVisible({ timeout: 10000 })
  15  |     await expect(page.locator('text=Real-time insights from your agency data')).toBeVisible()
  16  |   })
  17  | 
  18  |   test('should show market overview stats', async ({ page }) => {
  19  |     await page.click('text=Market Analysis')
  20  |     await page.waitForLoadState('networkidle')
  21  | 
  22  |     await expect(page.locator('text=Total Patients')).toBeVisible()
  23  |     await expect(page.locator('text=Categorized')).toBeVisible()
  24  |     await expect(page.locator('text=Avg Rate')).toBeVisible()
  25  |     await expect(page.locator('text=Top Service')).toBeVisible()
  26  |   })
  27  | 
  28  |   test('should display service category chart section', async ({ page }) => {
  29  |     await page.click('text=Market Analysis')
  30  |     await page.waitForLoadState('networkidle')
  31  | 
  32  |     await expect(page.locator('text=Service Category Distribution')).toBeVisible()
  33  |   })
  34  | 
  35  |   test('should display acuity level chart section', async ({ page }) => {
  36  |     await page.click('text=Market Analysis')
  37  |     await page.waitForLoadState('networkidle')
  38  | 
  39  |     await expect(page.locator('text=Care Acuity Levels')).toBeVisible()
  40  |   })
  41  | 
  42  |   test('should show market research tips', async ({ page }) => {
  43  |     await page.click('text=Market Analysis')
  44  |     await page.waitForLoadState('networkidle')
  45  | 
  46  |     await expect(page.locator('text=Track Demand')).toBeVisible()
  47  |     await expect(page.locator('text=Staff Planning')).toBeVisible()
  48  |     await expect(page.locator('text=Pricing Strategy')).toBeVisible()
  49  |   })
  50  | 
  51  |   test('should have refresh button for market insights', async ({ page }) => {
  52  |     await page.click('text=Market Analysis')
  53  |     await page.waitForLoadState('networkidle')
  54  | 
  55  |     const refreshButton = page.locator('button').filter({ has: page.locator('svg.lucide-refresh-cw') })
  56  |     await expect(refreshButton).toBeVisible()
  57  |   })
  58  | })
  59  | 
  60  | test.describe('Patient Service Category', () => {
  61  |   test.beforeEach(async ({ page }) => {
  62  |     await page.goto('/')
  63  |     await page.waitForLoadState('networkidle')
  64  |     await page.click('text=Patients')
  65  |     await page.waitForLoadState('networkidle')
  66  |   })
  67  | 
  68  |   test('should display Add Patient form with clinical metadata fields', async ({ page }) => {
  69  |     await page.click('button:has-text("Add Patient"), button:has-text("Register Patient")')
  70  |     await page.waitForLoadState('networkidle')
  71  | 
  72  |     await expect(page.locator('text=Service Category')).toBeVisible()
  73  |     await expect(page.locator('text=Care Acuity Level')).toBeVisible()
  74  |     await expect(page.locator('text=Mobility Status')).toBeVisible()
  75  |   })
  76  | 
  77  |   test('should have service category dropdown with options', async ({ page }) => {
  78  |     await page.click('button:has-text("Add Patient"), button:has-text("Register Patient")')
  79  |     await page.waitForLoadState('networkidle')
  80  | 
  81  |     const serviceCategorySelect = page.locator('select').filter({ hasText: /service category/i }).first()
  82  |     await expect(serviceCategorySelect).toBeVisible()
  83  |   })
  84  | 
  85  |   test('should have acuity level dropdown with levels 1-5', async ({ page }) => {
  86  |     await page.click('button:has-text("Add Patient"), button:has-text("Register Patient")')
  87  |     await page.waitForLoadState('networkidle')
  88  | 
  89  |     const acuitySelect = page.locator('select').filter({ hasText: /acuity/i }).first()
  90  |     await expect(acuitySelect).toBeVisible()
  91  |   })
  92  | 
  93  |   test('should have mobility status dropdown', async ({ page }) => {
  94  |     await page.click('button:has-text("Add Patient"), button:has-text("Register Patient")')
  95  |     await page.waitForLoadState('networkidle')
  96  | 
  97  |     const mobilitySelect = page.locator('select').filter({ hasText: /mobility/i }).first()
  98  |     await expect(mobilitySelect).toBeVisible()
  99  |   })
  100 | })
  101 | 
  102 | test.describe('Competitor Research', () => {
  103 |   test('should display competitor research section', async ({ page }) => {
  104 |     await page.click('text=Market Analysis')
  105 |     await page.waitForLoadState('networkidle')
  106 | 
  107 |     await expect(page.locator('text=Market Analysis & Competitor Insights').first()).toBeVisible()
  108 |     await expect(page.locator('text=Competitor Research').first()).toBeVisible()
  109 |   })
  110 | 
  111 |   test('should have search input for market research', async ({ page }) => {
```