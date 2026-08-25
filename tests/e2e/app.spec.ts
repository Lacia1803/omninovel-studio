import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await expect(page.locator('text=OmniNovel')).toBeVisible();
});

test('health endpoint works', async ({ request }) => {
  const response = await request.get('http://localhost:8000/api/health');
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data.status).toBe('ok');
});
