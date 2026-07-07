import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
await context.addInitScript(() => {
  sessionStorage.setItem('accessToken', 'playwright-dev-smoke');
  localStorage.setItem(
    'user',
    JSON.stringify({
      id: 'dev-user',
      email: 'dev@test.com',
      displayName: 'Dev',
      avatarUrl: null,
      emailVerified: true,
    }),
  );
});
const page = await context.newPage();
page.on('console', (m) => {
  if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200));
});
page.on('response', async (r) => {
  if (r.url().includes('/api/') && r.status() >= 400) {
    let body = '';
    try {
      body = JSON.stringify(await r.json());
    } catch {
      body = '';
    }
    console.log('HTTP', r.status(), r.url().replace(/https?:\/\/[^/]+/, ''), body.slice(0, 120));
  }
});

await page.goto('http://127.0.0.1:5173/dashboard/trips/807b3c54-4793-4006-a66d-67e79faa6fc2', {
  waitUntil: 'domcontentloaded',
  timeout: 60000,
});
await page.waitForTimeout(12000);
console.log('BODY:', (await page.locator('body').innerText()).slice(0, 400));
await browser.close();
