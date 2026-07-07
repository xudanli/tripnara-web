/**
 * Tab BFF 分阶段压测（v1.7）
 * 用法: TRIP_ID=3e4a1058-... npm run trip-detail-tab:bff-perf
 * 可选: SAMPLES=12 WARMUP=1
 */
const HOST = process.env.BACKEND_HOST || process.env.VITE_BACKEND_HOST || '127.0.0.1';
const PORT = process.env.BACKEND_PORT || process.env.VITE_BACKEND_PORT || '3000';
const BASE = `http://${HOST}:${PORT}/api`;
const TRIP_ID = process.env.TRIP_ID || '3e4a1058-9218-467f-988a-c18008a14385';
const SAMPLES = Number(process.env.SAMPLES || 12);
const WARMUP = Number(process.env.WARMUP || 1);

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

async function timedFetch(label, url) {
  const start = performance.now();
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  const ms = performance.now() - start;
  let ok = res.ok;
  try {
    const body = await res.json();
    ok = ok && body?.success !== false;
  } catch {
    ok = false;
  }
  return { label, ms, ok, status: res.status };
}

async function loadFirstPaint() {
  const start = performance.now();
  const urls = [
    `${BASE}/trips/${TRIP_ID}/timeline-overview?preset=shell`,
    `${BASE}/trips/${TRIP_ID}/collab-overview?preset=shell`,
    `${BASE}/trips/${TRIP_ID}/files/overview?limit=50&offset=0&includePending=true`,
    `${BASE}/trips/${TRIP_ID}/accommodation-overview`,
  ];
  const results = await Promise.all(urls.map((u, i) => timedFetch(`fp-${i}`, u)));
  const ms = performance.now() - start;
  const ok = results.every((r) => r.ok);
  return { label: 'loadFirstPaint', ms, ok };
}

async function pageFirstPaint() {
  const start = performance.now();
  const [trip, ...rest] = await Promise.all([
    timedFetch('getById', `${BASE}/trips/${TRIP_ID}`),
    ...[
      `${BASE}/trips/${TRIP_ID}/timeline-overview?preset=shell`,
      `${BASE}/trips/${TRIP_ID}/collab-overview?preset=shell`,
      `${BASE}/trips/${TRIP_ID}/files/overview?limit=50&offset=0&includePending=true`,
      `${BASE}/trips/${TRIP_ID}/accommodation-overview`,
    ].map((u, i) => timedFetch(`fp-${i}`, u)),
  ]);
  const ms = performance.now() - start;
  const ok = trip.ok && rest.every((r) => r.ok);
  return { label: 'page-first-paint', ms, ok };
}

async function loadPhase2() {
  const start = performance.now();
  const results = await Promise.all([
    timedFetch('timeline-full', `${BASE}/trips/${TRIP_ID}/timeline-overview?preset=full`),
    timedFetch('collab-full', `${BASE}/trips/${TRIP_ID}/collab-overview?preset=full`),
  ]);
  const ms = performance.now() - start;
  const ok = results.every((r) => r.ok);
  return { label: 'loadPhase2', ms, ok };
}

async function legacyFourTab() {
  const start = performance.now();
  const urls = [
    `${BASE}/trips/${TRIP_ID}/timeline-overview`,
    `${BASE}/trips/${TRIP_ID}/collab-overview`,
    `${BASE}/trips/${TRIP_ID}/files/overview?limit=50&offset=0&includePending=true`,
    `${BASE}/trips/${TRIP_ID}/accommodation-overview`,
  ];
  const results = await Promise.all(urls.map((u, i) => timedFetch(`legacy-${i}`, u)));
  const ms = performance.now() - start;
  const ok = results.every((r) => r.ok);
  return { label: 'legacy-4-tab-no-preset', ms, ok };
}

const SCENARIOS = [
  { name: 'loadFirstPaint', run: loadFirstPaint },
  { name: 'page-first-paint', run: pageFirstPaint },
  { name: 'loadPhase2', run: loadPhase2 },
  { name: 'legacy-4-tab-no-preset', run: legacyFourTab },
];

async function main() {
  console.log(`\nTab BFF perf · trip=${TRIP_ID} · base=${BASE}`);
  console.log(`samples=${SAMPLES} warmup=${WARMUP}\n`);

  for (let w = 0; w < WARMUP; w += 1) {
    for (const s of SCENARIOS) await s.run();
  }

  const table = [];

  for (const scenario of SCENARIOS) {
    const samples = [];
    let failures = 0;
    for (let i = 0; i < SAMPLES; i += 1) {
      const result = await scenario.run();
      if (!result.ok) failures += 1;
      samples.push(result.ms);
    }
    samples.sort((a, b) => a - b);
    table.push({
      scenario: scenario.name,
      p50: Math.round(percentile(samples, 50)),
      p95: Math.round(percentile(samples, 95)),
      min: Math.round(samples[0]),
      max: Math.round(samples[samples.length - 1]),
      failures,
    });
  }

  console.log('场景\t\t\tp50\tp95\tmin\tmax\tfail');
  console.log('─'.repeat(72));
  for (const row of table) {
    console.log(
      `${row.scenario.padEnd(24)}\t${row.p50}\t${row.p95}\t${row.min}\t${row.max}\t${row.failures}`,
    );
  }
  console.log('\n推荐: loadFirstPaint ~500ms · page-first-paint ~600ms · loadPhase2 ~1.3s');
  console.log('不推荐: legacy-4-tab-no-preset（无 preset 全量 timeline/collab）\n');

  const failed = table.some((r) => r.failures > 0);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
