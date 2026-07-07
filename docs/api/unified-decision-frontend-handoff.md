# Unified Decision — 前端联调 Handoff

**日期：** 2026-06-30  
**后端基线：** RFC-002 Gateway + Canonical L2（道路 / 天气 / 日负荷）  
**本仓 API 指南：** [unified-decision-frontend-integration.md](./unified-decision-frontend-integration.md)  
**后端 NestJS SSOT：** `src/trips/decision-semantics/UNIFIED_DECISION_FRONTEND_INTEGRATION.md`（后端 repo）

---

## 1. 环境

### 本地（本仓）

```bash
# .env.development
VITE_DECISION_GATEWAY_UNIFIED=1
VITE_BACKEND_HOST=<backend-host>    # vite 代理
BACKEND_HOST=<backend-host>         # harness / smoke 脚本
BACKEND_PORT=3000

npm run dev
npm run decision-center:unified-qa -- 3e4a1058-9218-467f-988a-c18008a14385
npm run gateway:test
```

### 后端本地（NestJS repo）

```bash
# 追加 .env.unified-decision-frontend.example 到 .env 后
npm run dev
npm run decision-center:unified-env-check   # 7/7 绿
```

### Staging Secret（运维）

```bash
DECISION_GATEWAY_UNIFIED=1
CANONICAL_ROAD_SEGMENT_UNAVAILABLE=1
CANONICAL_WEATHER_ACTIVITY_PROHIBITED=1
CANONICAL_EXCESSIVE_DAILY_LOAD=1
RFC001_SHADOW_MODE=0
DECISION_PACK_RUNTIME=1
DECISION_PACK_RULES=1
```

**前端 Staging：** `VITE_DECISION_GATEWAY_UNIFIED=1`

---

## 2. 固定 Fixture

| 用途 | tripId | 说明 |
|------|--------|------|
| **冰岛联调（主）** | `3e4a1058-9218-467f-988a-c18008a14385` | 7 日冰岛；Legacy + Canonical |
| 通用 Decision Center | `807b3c54-4793-4006-a66d-67e79faa6fc2` | 旧 staging QA 默认 |

**Plan Studio URL：**

```
/dashboard/plan-studio?tripId=3e4a1058-9218-467f-988a-c18008a14385&decisionSpace=1
```

### 2.1 Canonical L2 — 日负荷（后端已造数）

| 字段 | 值 |
|------|-----|
| `problemId` | `problem_load_3e4a1058_1782831128596` |
| `semanticCapability` | `EXCESSIVE_DAILY_LOAD` |
| `flow` | `CANONICAL_L2` |
| `leadingPersona` | `DRDRE` |
| `decisionId`（evaluate 后） | 以 `decision-center` / evaluate 响应为准（会变） |
| `recordStatus` | `PROPOSED` → authorize → execute |
| `planVersion.status` | `PENDING_AUTHORIZATION` |
| **authorize choice** | `cand_split_day` |
| 影响 | 第 5 日驾驶 ~32h（超阈值） |

同 trip 还有未 evaluate 的：`problem_load_3e4a1058_1782830457468`（测「生成方案 / evaluate」CTA）。

### 2.2 Legacy V1.5（同 trip）

| problemId | title | flow |
|-----------|-------|------|
| `dp_id:coverage-gap:1` | 第6天 · 红沙滩 | `LEGACY_V15` |
| `dp_id:issue-finding-2` | 冰岛 紧急电话 | `LEGACY_V15` |

---

## 3. curl 速查

```bash
TRIP=3e4a1058-9218-467f-988a-c18008a14385
BASE=http://${BACKEND_HOST:-127.0.0.1}:${BACKEND_PORT:-3000}/api
# Staging: BASE=https://<staging-host>/api  +  AUTH_TOKEN=<jwt>
```

### 3.1 读模型（FE-UD-1）

```bash
curl -s "$BASE/trips/$TRIP/decision-center" | jq '.data.schemaId,.data.activePacks.layers[].packId,.data.canonical.problems|length'

curl -s "$BASE/trips/$TRIP/decision-problems" | jq '.data.meta,.data.items[]|{problemId,flow,semanticCapability,status,title}'

curl -s "$BASE/trips/$TRIP/decision-problems/problem_load_3e4a1058_1782831128596" | jq '.data.flow,.data.route.resolution,.data.data.leadingPersona'
```

### 3.2 造 Canonical 问题（QA / 重置）

```bash
curl -s -X POST "$BASE/trips/$TRIP/daily-load/scan" \
  -H 'Content-Type: application/json' -d '{"runFull":true}' | jq '.data.overloaded,.data.problem.problemId'

curl -s -X POST "$BASE/trips/$TRIP/weather-hazard/poll" \
  -H 'Content-Type: application/json' -d '{"dayIndex":3,"runFull":true}' | jq '.data.changed,.data.problem'
```

### 3.3 Canonical L2 写路径（FE-UD-5）

```bash
PROB=problem_load_3e4a1058_1782831128596

curl -s -X POST "$BASE/trips/$TRIP/decision-problems/$PROB/evaluate" | jq '.data.record.decisionId,.data.record.recordStatus,.data.planVersion.status'

DEC=<上一步 decisionId>

curl -s -X POST "$BASE/trips/$TRIP/decisions/$DEC/authorize" \
  -H 'Content-Type: application/json' -d '{"choice":"cand_split_day"}' | jq '.data'

curl -s -X POST "$BASE/trips/$TRIP/decisions/$DEC/execute" \
  -H "Idempotency-Key: pv:$TRIP:$DEC" | jq '.data'
```

### 3.4 Legacy V1.5

```bash
PROB=dp_id:coverage-gap:1
curl -s "$BASE/trips/$TRIP/decision-problems/$PROB/options" | jq '.data.data.options[].id'
```

### 3.5 AI 决策委员会（规划页）

```bash
curl -s "$BASE/trips/$TRIP/persona-alerts?phase=planning&audience=user&limit=10" \
  | jq '.data[]|{persona,severity,title,explanation}'
```

**冰岛 fixture 实测：**

| persona | severity | 摘要 |
|---------|----------|------|
| `ABU` | warning | 冰岛紧急电话 112 |
| `DR_DRE` | info | 第 6 天红沙滩缺路线/营业时间验证 |

Neptune 无 alert 时 UI 默认「可接受」——见 `DecisionCheckerPersonaValidationStrip`（右侧决策卡 · 验证维度）。

---

## 4. 前端分支逻辑（本仓已实现）

```typescript
import { isUnifiedDecisionGatewayEnabled } from '@/lib/decision-gateway.util';

if (item.flowKind === 'CANONICAL_L2') {
  // useCanonicalDecisionL2Flow → evaluate → authorize → execute
  // 禁止 POST /decisions（Legacy apply）
} else {
  // useDecisionProblemFlow → options → preview → POST decisions → poll
}
```

| 能力 | 路径 |
|------|------|
| L2 phase | `classifyCanonicalL2Phase()` — `src/trips/decision-runtime/gateway/frontend/canonical-decision-l2-state-machine.util.ts` |
| 类型 SSOT | `@/generated/unified-decision-contracts` |
| Canonical UI | `CanonicalDecisionL2Panel` + 决策空间内嵌（`PlanningWorkbenchDecisionSpace`） |
| Legacy UI | `DecisionSpaceOptionCard` + `useDecisionProblemFlow` |
| 三人格压缩 | `DecisionCheckerPersonaValidationStrip`（可行性 / 节奏 / 体验保留） |

---

## 5. PR 验收

| PR | 验收 |
|----|------|
| FE-UD-1 | 列表 `flow` badge；`activePacks` 条 |
| FE-UD-2 | 道路 L2 `cand_a` |
| FE-UD-3 | 天气 poll + `cand_indoor` |
| FE-UD-4 | canonical/legacy 去重列表 |
| FE-UD-5 | §2.1 `problemId` 跑通 `cand_split_day` 三步 |
| FE-Committee | `persona-alerts` → 右侧验证维度 + 「完整评估报告」Dialog |

---

## 6. 本仓验证命令

```bash
npm run gateway:test
npm run decision-center:unified-env-check          # 后端 pod / 有 Secret 的环境
npm run decision-center:unified-qa -- 3e4a1058-9218-467f-988a-c18008a14385

# Staging
AUTH_TOKEN=<jwt> npm run decision-center:unified-qa -- \
  3e4a1058-9218-467f-988a-c18008a14385 https://<staging>/api
```

---

## 7. 已知限制

- 冰岛 fixture **weather poll day6** 可能 `changed: false`；换 `dayIndex` 或换有户外 POI 的天。
- Legacy **options 可能为空**（如 coverage-gap）；不影响 Canonical L2。
- 方案卡 tradeoffs / routePreview 由后端 **Decision Space 投影层**补齐；契约见 [decision-options-tradeoffs-contract.md](./decision-options-tradeoffs-contract.md)，联调索引 [FE_INTEGRATION_HANDOFF.md](./FE_INTEGRATION_HANDOFF.md)。
- `decisionId` 每次 **重新 evaluate 会变**；联调用 decision-center 最新 `record.decisionId`。
- `DecisionGatewayModule` 须在 `DecisionSemanticsModule` **之前**注册，否则列表缺 `flow`。
- `RFC001_SHADOW_MODE=1` 时 L2 execute **不写 Effective Plan**（假成功）。
