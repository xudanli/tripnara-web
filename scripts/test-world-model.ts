#!/usr/bin/env npx tsx
/**
 * 测试行程是否构建了最小世界模型
 *
 * 通过仅传 tripId 调用协商 API，若后端能成功加载 plan 与 world 并返回协商结论，
 * 则说明该行程已具备最小世界模型。
 *
 * 用法：
 *   npx tsx scripts/test-world-model.ts [tripId]
 *
 * 认证（接口需登录）：
 *   1. 浏览器登录 TripNARA，打开 DevTools -> Application -> Session Storage
 *   2. 复制 accessToken 的值
 *   3. TRIPNARA_ACCESS_TOKEN=你的token npx tsx scripts/test-world-model.ts 7891922b-f0cf-4b1d-90f3-89a259325fa0
 */

const TRIP_ID = process.argv[2] || '7891922b-f0cf-4b1d-90f3-89a259325fa0';
const API_BASE =
  process.env.VITE_API_BASE_URL ||
  (process.env.BACKEND_HOST
    ? `http://${process.env.BACKEND_HOST}:${process.env.BACKEND_PORT || 3000}/api`
    : 'http://127.0.0.1:3000/api');
const ACCESS_TOKEN = process.env.TRIPNARA_ACCESS_TOKEN;

async function main() {
  console.log('='.repeat(60));
  console.log('测试行程最小世界模型');
  console.log('='.repeat(60));
  console.log('行程 ID:', TRIP_ID);
  console.log('API 地址:', API_BASE);
  console.log('认证:', ACCESS_TOKEN ? '已提供 Bearer Token' : '未提供（可能需登录）');
  console.log('');

  const url = `${API_BASE}/v2/user/optimization/negotiation`;
  const body = { tripId: TRIP_ID, trip_id: TRIP_ID };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (ACCESS_TOKEN) {
    headers['Authorization'] = `Bearer ${ACCESS_TOKEN}`;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      console.log('✅ 协商 API 调用成功');
      console.log('');
      console.log('结论：该行程已构建最小世界模型（后端成功加载 plan 与 world）');
      console.log('');
      console.log('协商结论摘要:');
      console.log('  - decision:', data.decision ?? '—');
      console.log('  - consensusLevel:', data.consensusLevel != null ? `${Math.round((data.consensusLevel as number) * 100)}%` : '—');
      console.log('  - 投票:', data.votingResult
        ? `${data.votingResult.approve ?? 0} 赞成 · ${data.votingResult.reject ?? 0} 反对 · ${data.votingResult.abstain ?? 0} 弃权`
        : '—');
      if (data.evaluationSummary) {
        const es = data.evaluationSummary;
        console.log('  - 安全(Abu):', es.abuUtility != null ? Math.round((es.abuUtility as number) * 100) : '—');
        console.log('  - 节奏(Dre):', es.dreUtility != null ? Math.round((es.dreUtility as number) * 100) : '—');
        console.log('  - 修复(Neptune):', es.neptuneUtility != null ? Math.round((es.neptuneUtility as number) * 100) : '—');
      }
      console.log('');
      process.exit(0);
    } else {
      console.log('❌ 协商 API 调用失败');
      console.log('HTTP 状态:', res.status, res.statusText);
      console.log('响应:', JSON.stringify(data, null, 2));
      console.log('');
      const msg = (data as { error?: { message?: string }; message?: string })?.error?.message
        ?? (data as { message?: string })?.message
        ?? '未知错误';
      if (res.status === 400 && (msg.includes('plan') || msg.includes('world') || msg.includes('tripId'))) {
        console.log('可能原因：后端无法根据 tripId 加载 plan 或 world，即该行程尚未构建最小世界模型。');
      } else if (res.status === 401 || res.status === 403) {
        console.log('可能原因：接口需要认证。请设置 TRIPNARA_ACCESS_TOKEN 环境变量后重试。');
      }
      console.log('');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ 请求异常:', err);
    process.exit(1);
  }
}

main();
