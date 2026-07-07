# 决策空间 Bundle API

**Schema:** `tripnara.decision_space_bundle@v1`  
**目标：** 将决策空间首屏 5–7 次 HTTP 合并为 1 次读 + 按需写（preview）  
**实现：** Phase 1 — 并行双读（独立接口保留，bundle 失败可回退）

---

## 端点

### 主 Bundle

```
GET /api/trips/:tripId/decision-space-bundle
```

| 参数 | 必填 | 说明 |
|------|------|------|
| `problemId` | 二选一 | 决策问题 ID |
| `proposalId` | 二选一 | 编排草案 ID |
| `conflictId` / `focusConflictId` | 否 | 聚焦冲突 |
| `optionId` | 否 | 当前选中方案 |
| `surface` | 否 | `default` \| `middle` \| `inspector` \| `full` |
| `include` | 否 | 逗号字段掩码，**覆盖** surface |
| `exclude` | 否 | 从 surface 中排除 |
| `If-None-Match` | 否 | ETag 304 |

**surface 预设**

| surface | 模块 |
|---------|------|
| `default` | problem, basis, pack.summary, **inspector.feasibility**, orchestration |
| `middle` | problem, basis, pack.full, orchestration |
| `inspector` | inspector 四 Tab 全量 |
| `full` | 全部（Debug） |

> **default + problemId 首包（已确认 · 冒烟通过）**
>
> | 字段 | 首包值 | 说明 |
> |------|--------|------|
> | `meta.tabEmptyState.causalChain` | `true` | 因果链 deferred |
> | `meta.deferred` | 含 `inspector.causalChain` | Tab / `include=` 时再加载 |
> | `inspector.causalChain` | **不返回** | Tier-3 独立拉取 |
> | `inspector.feasibility.canSafelyWrite` | `false` | 无草案，不可写 |

**include 可选值：** `problem`, `basis`, `pack`, `pack.summary`, `inspector.causalChain`, `inspector.planDiff`, `inspector.feasibility`, `inspector.memberConsensus`, `inspector.basis`, `negotiation`, `orchestration`

### 增量补全

```
GET /api/trips/:tripId/decision-space-bundle/delta
```

| 参数 | 必填 |
|------|------|
| `problemId` | 是 |
| `include` | 是 |
| `optionId` | 推荐 |
| `since` / `If-None-Match` | 否 |

---

## Response 结构

```json
{
  "success": true,
  "data": {
    "schema": "tripnara.decision_space_bundle@v1",
    "tripId": "...",
    "tripVersion": "tv_42",
    "etag": "W/\"dsb:tv_42:problem_abc:action_a:-:default\"",
    "binding": { "problemId", "proposalId", "conflictId", "optionId", "mode" },
    "problem": { /* Gateway detail 1:1 */ },
    "basis": { /* planning_decision_basis@v1 */ },
    "pack": { /* pack.summary 或 full */ },
    "inspector": { /* 按 include 裁剪字段 */ },
    "negotiation": { /* 可选 */ },
    "orchestration": { "activeProposalId", "pendingProposalCount", "phase" },
    "meta": {
      "included": [],
      "deferred": [],
      "tabEmptyState": {},
      "deferredReason": { "previewRequired": true },
      "refreshHints": { "problem", "preview", "inspector", "causalChain" }
    }
  }
}
```

**错误码**

| HTTP | code | 说明 |
|------|------|------|
| 400 | `BUNDLE_BINDING_REQUIRED` | 缺少 problemId / proposalId |
| 404 | `PROBLEM_NOT_FOUND` | problem 不存在 |
| 304 | — | ETag 命中 |

**缓存：** `Cache-Control: private, max-age=10`；ETag = `hash(tripVersion, problemId, proposalId, optionId, surfaceKey)`

---

## 模块来源（复用现有 schema）

| Bundle 字段 | 来源 |
|-------------|------|
| `problem` | `GET decision-problems/:id` |
| `basis` | `GET arrange-itinerary/decision-basis` |
| `pack` | `proposal.decisionPack` |
| `inspector.*` | `GET decision-inspector`；**causalChain 不在 default 首包** |
| `orchestration` | `orchestration-state` + pending proposal 计数 |

**写路径仍独立：** `POST .../preview`、`POST .../resolutions`、`POST .../apply`

---

## 前端三档请求 + Bundle 接入

| 档位 | 触发 | 请求 | SLA |
|------|------|------|-----|
| **Tier 1** | 左栏 / 行程 Tab | `decision-problems` ∥ `planning-conflicts` ∥ `decision-center/overview` | ~20ms |
| **Tier 2** | 选中问题 | **Bundle `surface=default`** 或回退 `decision-problems/:id` ∥ `decision-inspector?problemId` | ~130ms |
| **Tier 3** | 因果链 Tab | `GET decision-causal-chain?problemId=`（可与 proposalId 并存）或 bundle delta `include=inspector.causalChain` | ~500ms |

### decision-causal-chain（problemId · 已确认）

```
GET /api/trips/:tripId/arrange-itinerary/decision-causal-chain?problemId={problemId}
```

- 响应含 `problemId` 字段；`refreshUrl` 含 `?problemId=...`
- 与 `proposalId` 可并存；无草案时走 readiness / decision-checker 聚合

```typescript
fetchDecisionCausalChain(tripId, { problemId });
// 或并存
fetchDecisionCausalChain(tripId, { problemId, proposalId });
```

### Phase 1（当前）

环境变量 `VITE_DECISION_SPACE_BUNDLE=1` 开启后，`useDecisionSpaceTier2` 优先 bundle；404/501 自动回退独立接口。

```typescript
import { fetchDecisionSpaceBundle } from '@/dto/frontend-arrange-itinerary-api-client';

const result = await fetchDecisionSpaceBundle(tripId, {
  problemId,
  proposalId,
  surface: 'default',
});
// result.status === 'ok' → 跳过 basis / inspector / detail 独立 GET
// 404/501 → 回退现有多接口（useDecisionSpaceTier2 已内置）
```

Tab 增量：

```
GET .../decision-space-bundle/delta?problemId=x&optionId=y&include=inspector.planDiff,inspector.feasibility
```

**前端文件**

| 文件 | 职责 |
|------|------|
| `src/api/decision-space-bundle.ts` | HTTP + ETag 304 |
| `src/api/normalize-decision-space-bundle.ts` | envelope 归一化 |
| `src/hooks/useDecisionSpaceTier2.ts` | Tier-2 bundle / legacy 双读 |
| `src/lib/decision-space-bundle.util.ts` | feature flag + query keys |

---

## 绑定模式（Binding Matrix）

| `binding.mode` | 首包 inspector | 前端补拉 |
|----------------|---------------|---------|
| **`problem`** | feasibility.canSafelyWrite=false；causalChain deferred | 因果链 Tab → `decision-causal-chain?problemId` |
| **`proposal`** | causalChain 可内嵌 | 切 Tab / option → delta |
| **`problem+proposal`** | pack + actions 对齐 | 写路径以 `problem.actions` 为准 |

---

## 后端实现文件

| 文件 | 职责 |
|------|------|
| `decision-space-bundle.controller.ts` | HTTP + ETag 304 |
| `services/decision-space-bundle.service.ts` | 聚合 Gateway + Arrange BFF |
| `utils/decision-space-bundle.surface.util.ts` | surface / include 解析 |
| `types/decision-space-bundle.types.ts` | envelope 类型 |

**冒烟：** `npx ts-node scripts/decision-space-bundle-test.ts [tripId]`

---

## 仍保持独立

| 接口 | 原因 |
|------|------|
| `GET decision-problems` | 左栏队列（Tier 1） |
| `GET decision-center/overview` | 角标 |
| `POST .../preview` | 重计算 |
| `POST resolutions` / `POST apply` | 写路径 |

---

## 开放问题

1. **写路径 authority：** `problem.actions` 为准，`pack.options` 仅展示
2. **planDiff + preview：** 无 proposal 时 planDiff 为空，`meta.deferredReason.previewRequired=true`

---

## 相关文档

- [decision-execution-space-handoff.md](./decision-execution-space-handoff.md)
- [plan-studio-arrange-itinerary-handoff.md](./plan-studio-arrange-itinerary-handoff.md)
