# Unified Decision API — 前端对接指南

**版本：** 2026-06-30 · RFC-002 Gateway + Canonical Slices 1–3（IS / NZ 共用）  
**联调 Handoff（fixture / curl）：** [unified-decision-frontend-handoff.md](./unified-decision-frontend-handoff.md)  
**类型 SSOT：** `@/generated/unified-decision-contracts`  
**后端完整说明（NestJS repo）：** `src/trips/decision-semantics/UNIFIED_DECISION_FRONTEND_INTEGRATION.md`  
**Swagger：** `{BACKEND}/api-docs` → 搜 `RFC-002`

---

## 前端同学要点（TL;DR）

| 项 | 说明 |
|----|------|
| **开关** | `VITE_DECISION_GATEWAY_UNIFIED=1`（`.env.development`） |
| **路由** | 只看 `problem.flow` / `flowKind`（`CANONICAL_L2` vs `LEGACY_V15`），**禁止** `destination === 'IS'` 分支 |
| **鉴权** | 与 Trip API 相同 `Bearer` token；本地 dev 可无 token（后端 `@Public()` + trip 成员校验） |
| **联调行程** | 冰岛 `3e4a1058-9218-467f-988a-c18008a14385` · 通用 `807b3c54-4793-4006-a66d-67e79faa6fc2` |
| **Canonical 日负荷 fixture** | `problem_load_3e4a1058_1782831128596` · choice `cand_split_day`（见 Handoff §2.1） |
| **PR 顺序** | FE-UD-1 读模型+flow → FE-UD-2 道路 L2 → FE-UD-3 天气 → FE-UD-4 列表+activePacks → FE-UD-5 日负荷 |

**Staging 部署（后端 / 平台）：** 见下方 [§ Staging Secret](#staging-secret)；**必须** `RFC001_SHADOW_MODE=0`（shadow 不写 Effective Plan）。

**后端路由踩坑：** `DecisionGatewayModule` 须在 `DecisionSemanticsModule` **之前**注册，否则 `GET decision-problems` 走 Legacy 格式、**缺少 `flow`** 字段。

**本仓已实现：** FE-UD-1～5 代码与 `npm run gateway:test`（20 tests）。开启 flag 即可联调。

```typescript
import { isUnifiedDecisionGatewayEnabled } from '@/lib/decision-gateway.util';

if (item.flowKind === 'CANONICAL_L2') {
  // useCanonicalDecisionL2Flow → evaluate → authorize → execute
} else {
  // useDecisionProblemFlow → Legacy MVP
}
```

---

**后端：**

```bash
DECISION_GATEWAY_UNIFIED=1
CANONICAL_ROAD_SEGMENT_UNAVAILABLE=1
CANONICAL_WEATHER_ACTIVITY_PROHIBITED=1
CANONICAL_EXCESSIVE_DAILY_LOAD=1
RFC001_SHADOW_MODE=0
DECISION_PACK_RUNTIME=1
```

**前端：**

```bash
# .env.development
VITE_DECISION_GATEWAY_UNIFIED=1
```

```typescript
import { isUnifiedDecisionGatewayEnabled } from '@/lib/decision-gateway.util';
```

**禁止** `if (destination === 'IS' || destination === 'NZ')` 选 API。NZ 与 IS 共用同一 Gateway；差异仅在 `activePacks.layers`（如 `destination.nz`），**仅展示，不用于路由**。

**ConstraintEvaluationGateway（narrate-only）：** `POST /training/safety/constraints/check` 返回 `usage: "narrate_only"` 时，`is_blocked` / `requires_approval` **不是**正式门禁；`violations` / `warnings` 仅 UI 提示，正式裁决走 `decision-problems` → Gateway。见 `src/lib/safety-constraints-check.util.ts`。

**写链 + Feasibility 投影：** 启动时 `prefetchDecisionRuntimeCapabilities()`（`GET /decision-runtime/ops/write-chain` + `GET /decision-engine/v1/runtime-capabilities`）。`writeChainEnabled` 优先于 env；`gatewayDomainRulesExclusive` 时 feasibility 剥离 legacy 同域 issue。见 `src/lib/decision-runtime-capabilities.store.ts` · `src/lib/gateway-feasibility-projection.util.ts`。

---

## 1. 读模型（FE-UD-1）

Base：`/api/trips/:tripId`

| 用途 | 方法 | 前端 |
|------|------|------|
| Decision Center | GET | `decisionProblemsApi.getUnifiedDecisionCenter` |
| 问题列表（唯一入口） | GET | `decisionProblemsApi.listUnifiedByTrip` |
| 详情 | GET | `decisionProblemsApi.getProblem` |
| 候选 | GET | `decisionProblemsApi.getOptions` |

**路由唯一依据：**

```typescript
if (item.flowKind === 'CANONICAL_L2') return <CanonicalDecisionL2Panel />;
return <LegacyRepairPanel />; // LEGACY_V15
```

列表项 `route.engineId` 为 **`CANONICAL_DECISION_RUNTIME`**，勿写死 `RFC001_ICELAND_*`。

---

## 2. Canonical L2 写链路（FE-UD-2～5）

| 步骤 | 路径 |
|------|------|
| evaluate | POST `decision-problems/:id/evaluate` |
| authorize | POST `decisions/:id/authorize` `{ choice }` |
| execute | POST `decisions/:id/execute` |
| submit 结论 | POST `decision-problems/:id/resolutions` `{ selectedActionId, idempotencyKey }` |
| apply | POST `decision-problems/:id/apply` |

**resolutions 请求体（与 NestJS 对齐）：**

```typescript
await decisionProblemsApi.submitResolution(tripId, problemId, {
  selectedActionId: action.actionId, // 来自 GET detail.actions[].actionId
  idempotencyKey: `resolution:${tripId}:${problemId}:${action.actionId}`,
});
```

客户端 `normalizeSubmitResolutionRequest` 兼容 `actionId` / `optionId` 别名；缺字段时本地拦截，不发 `{}`。

| semanticCapability | choice |
|--------------------|--------|
| `ROAD_SEGMENT_UNAVAILABLE` | `cand_a` … |
| `WEATHER_ACTIVITY_PROHIBITED` | `cand_indoor` |
| `EXCESSIVE_DAILY_LOAD` | `cand_split_day` |

Hook：`useCanonicalDecisionL2Flow` · UI：`CanonicalDecisionL2Panel`  
阶段：`classifyCanonicalL2Phase()` · 刷新行程：`shouldRefreshItineraryAfterCanonicalExecute('EFFECTIVE')`

---

## 3. 主动检测（可选）

```typescript
import { useProactiveDecisionScan } from '@/hooks/useProactiveDecisionScan';
import { weatherHazardApi } from '@/api/weather-hazard';
import { dailyLoadApi } from '@/api/daily-load';

// runFull: false → 探测；true → 一键 diagnose（仍建议详情页走完整 L2）
await weatherHazardApi.poll(tripId, { dayIndex: 1, runFull: false });
await dailyLoadApi.scan(tripId, { runFull: false });
```

---

## 4. activePacks（FE-UD-4）

Gateway `GET decision-center` 返回 `activePacks.layers`：

```json
{ "packId": "destination.global" }
{ "packId": "destination.is" }
// NZ trip → destination.nz
```

展示：`DecisionCenterActivePacksStrip`（Debug/Ops，**不用于路由**）

```typescript
import { formatActivePacksSummary } from '@/generated/unified-decision-contracts';
```

---

## 5. 本仓 PR 验收

| PR | 验收 |
|----|------|
| FE-UD-1 | IS/NZ trip 列表有 `Canonical` badge + flow 分叉 |
| FE-UD-2 | 道路 `cand_a` → execute 后 itinerary 更新 |
| FE-UD-3 | 天气 `cand_indoor` + poll |
| FE-UD-4 | activePacks 展示 `destination.is` / `destination.nz` |
| FE-UD-5 | 日负荷 `cand_split_day` + scan |

---

## 6. 禁止事项

1. ❌ `/api/internal/rfc001/...`
2. ❌ `destination === 'IS'|'NZ'` 选 API
3. ❌ Canonical 走 POST decisions + poll
4. ❌ authorize 后刷新 itinerary
5. ❌ 前端 merge 双 list API

---

## Staging Secret {#staging-secret}

**预发/Staging 后端 Secret（直接复制），部署后滚动重启：**

```bash
DECISION_GATEWAY_UNIFIED=1
CANONICAL_ROAD_SEGMENT_UNAVAILABLE=1
CANONICAL_WEATHER_ACTIVITY_PROHIBITED=1
CANONICAL_EXCESSIVE_DAILY_LOAD=1
RFC001_SHADOW_MODE=0
DECISION_PACK_RUNTIME=1
DECISION_PACK_RULES=1
```

| 变量 | 说明 |
|------|------|
| `RFC001_SHADOW_MODE=0` | **必确认** — `=1` 时 L2 不写 Effective Plan，前端联调会「假成功」 |
| `DECISION_GATEWAY_UNIFIED=1` | 未开则 Unified API 返回 **403** |
| 三个 `CANONICAL_*=1` | 也可用兼容别名 `RFC001_ICELAND_*=1` |

**前端 Staging 同步：** `VITE_DECISION_GATEWAY_UNIFIED=1`

### 联调 QA 命令

```bash
# 环境自检（Staging pod / CI，需能读到平台 Secret）
npm run decision-center:unified-env-check

# API smoke（本地或 Staging）
npm run decision-center:unified-qa -- 3e4a1058-9218-467f-988a-c18008a14385

# Staging（需 JWT）
AUTH_TOKEN=<staging-jwt> npm run decision-center:unified-qa -- \
  3e4a1058-9218-467f-988a-c18008a14385 \
  https://<your-staging-api>/api
```

**期望（冰岛 fixture）：** `decision-problems` 返回 `schemaId: tripnara.unified_decision_problems@v1`，items 含 `flow`；`activePacks.layers` 含 `destination.global` + `destination.is`。

---

## 7. 验证

```bash
npm run gateway:test                    # 单元契约 20 tests
npm run decision-center:unified-qa      # API smoke UD-00~06 + gateway:test
npm run decision-center:unified-env-check  # 平台 Secret 7/7（后端 pod）
```

---

## 8. 关键文件

| 路径 | 说明 |
|------|------|
| `src/generated/unified-decision-contracts.ts` | 类型 + helper |
| `src/api/decision-problems.ts` | Unified REST |
| `src/hooks/useCanonicalDecisionL2Flow.ts` | L2 三步 |
| `src/hooks/useProactiveDecisionScan.ts` | poll + scan |
| `src/components/decision-problems/CanonicalDecisionL2Panel.tsx` | Canonical UI |
| `src/components/decision-problems/DecisionCenterActivePacksStrip.tsx` | Packs 展示 |
| `src/components/plan-studio/workbench/decision-checker/DecisionCheckerPersonaValidationStrip.tsx` | 三人格 → 验证维度 |
| `docs/api/unified-decision-frontend-handoff.md` | Fixture + curl Handoff |
