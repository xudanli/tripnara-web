/**
 * 行程详情 Tab UI 联调（Playwright）
 * 用法: npx playwright install chromium && node scripts/verify-trip-detail-tabs.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.VITE_DEV_URL || 'http://127.0.0.1:5173';
const TRIP_ID = process.env.TRIP_ID || '807b3c54-4793-4006-a66d-67e79faa6fc2';
const URL = `${BASE}/dashboard/trips/${TRIP_ID}`;

const TABS = [
  { name: 'timeline', label: '时间轴', expectText: ['可行性', 'Day', '规划'] },
  { name: 'members', label: '成员', expectText: ['成员', '协作'] },
  { name: 'accommodation', label: '住宿', expectText: ['住宿', '晚'] },
  { name: 'activities', label: '活动', expectText: ['Day', '活动'] },
  { name: 'files', label: '文件', expectText: ['文件', '空间', '全部'] },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: 'zh-CN',
    viewport: { width: 1440, height: 900 },
  });
  await context.addInitScript(() => {
    sessionStorage.setItem('accessToken', 'playwright-dev-smoke');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 'dev-user',
        email: 'dev@test.com',
        displayName: 'Dev User',
        avatarUrl: null,
        emailVerified: true,
      }),
    );
  });

  // 避免无效 JWT 触发 refresh 清 token
  await context.route('**/api/v1/fitness/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { fitnessLevel: 'INTERMEDIATE', overallScore: 70, confidence: 0.8 },
      }),
    }),
  );
  await context.route('**/api/v2/user/team/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { id: 'team-mock', members: [] } }),
    }),
  );
  await context.route('**/api/auth/refresh', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'playwright-dev-smoke',
        user: { id: 'dev-user', email: 'dev@test.com', displayName: 'Dev User' },
      }),
    }),
  );

  const page = await context.newPage();
  const results = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      results.push({ kind: 'console-error', text: msg.text() });
    }
  });
  page.on('pageerror', (err) => {
    results.push({ kind: 'page-error', text: err.message });
  });

  const apiCalls = [];
  page.on('response', async (res) => {
    const u = res.url();
    if (
      u.includes('/api/trips/') &&
      (u.includes('timeline-overview') ||
        u.includes('collab-overview') ||
        u.includes('files/') ||
        u.includes('accommodation-overview') ||
        u.includes('activity-favorites'))
    ) {
      let body = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      apiCalls.push({
        url: u.replace(BASE, '').replace(/https?:\/\/[^/]+/, ''),
        status: res.status(),
        success: body?.success,
        error: body?.error?.message,
      });
    }
  });

  console.log(`\n>> 打开 ${URL}`);
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(5000);
  const currentUrl = page.url();
  console.log(`>> 当前 URL: ${currentUrl}`);
  if (currentUrl.includes('/login')) {
    console.log('✗ 被重定向到登录页，需有效 AUTH_TOKEN');
    await browser.close();
    process.exit(1);
  }

  // 等待行程详情或骨架消失
  try {
    await page.waitForSelector('[role="tab"]', { timeout: 120000 });
  } catch {
    const bodyText = await page.locator('body').innerText();
    console.log('✗ 未找到 Tab 导航，页面片段:');
    console.log(bodyText.slice(0, 800));
    await page.screenshot({ path: '/tmp/trip-detail-debug.png', fullPage: true });
    console.log('截图: /tmp/trip-detail-debug.png');
    await browser.close();
    process.exit(1);
  }
  await page.waitForTimeout(2000);

  // Tab nav buttons
  for (const tab of TABS) {
    console.log(`\n--- Tab: ${tab.label} (${tab.name}) ---`);
    const tabBtn = page.getByRole('tab', { name: tab.label });
    const visible = await tabBtn.isVisible().catch(() => false);
    if (!visible) {
      results.push({ kind: 'tab-missing', tab: tab.label });
      console.log(`✗ 未找到 Tab 按钮「${tab.label}」`);
      continue;
    }
    await tabBtn.scrollIntoViewIfNeeded();
    await tabBtn.click();
    await page.waitForTimeout(2500);

    let found = 0;
    for (const text of tab.expectText) {
      const count = await page.getByText(text, { exact: false }).count();
      if (count > 0) found++;
    }
    const ok = found >= 1;
    results.push({ kind: 'tab-check', tab: tab.label, ok, found, total: tab.expectText.length });
    console.log(ok ? `✓ 内容可见 (${found}/${tab.expectText.length} 关键词)` : `✗ 内容未匹配`);
  }

  // Activity favorite toggle (best effort)
  console.log('\n--- 活动收藏 Heart ---');
  const actTab = page.getByRole('tab', { name: '活动' });
  if (await actTab.isVisible().catch(() => false)) {
    await actTab.click();
    await page.waitForTimeout(1000);
    const heart = page.locator('button[aria-label*="收藏"]').first();
    if (await heart.isVisible().catch(() => false)) {
      await heart.click();
      await page.waitForTimeout(800);
      console.log('✓ 已点击收藏按钮');
    } else {
      console.log('⚠ 未找到收藏按钮');
    }
  }

  await browser.close();

  console.log('\n=== API 调用 ===');
  for (const c of apiCalls) {
    const mark = c.status === 200 && c.success !== false ? '✓' : c.status === 200 && c.success === false ? '⚠' : '✗';
    console.log(`${mark} ${c.status} ${c.url}${c.error ? ` — ${c.error}` : ''}`);
  }

  const tabFails = results.filter((r) => r.kind === 'tab-check' && !r.ok);
  const missingTabs = results.filter((r) => r.kind === 'tab-missing');
  const errors = results.filter((r) => r.kind === 'console-error' || r.kind === 'page-error');
  console.log('\n=== 汇总 ===');
  console.log(`Tab 通过: ${TABS.length - tabFails.length - missingTabs.length}/${TABS.length}`);
  console.log(`Console/Page 错误: ${errors.length}（team 401 等可忽略）`);
  if (errors.length) errors.slice(0, 5).forEach((e) => console.log(' ', e.text?.slice(0, 120)));

  await page.screenshot({ path: '/tmp/trip-detail-tabs-verify.png', fullPage: false }).catch(() => {});
  console.log('截图: /tmp/trip-detail-tabs-verify.png');

  process.exit(tabFails.length + missingTabs.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
