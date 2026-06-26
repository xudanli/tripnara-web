# Trip Loop Engineering — 前端对接

> **Swagger Tag**: `trip-loops`（`/api-docs`）  
> **封装**: `src/api/trip-loops.ts`  
> **Types**: `src/types/trip-loop.ts`（手抄自后端 adapter）

## 核心原则

1. **渲染只看 `ui.phase`** — 不要用 `runtimeState` 推断面板状态（GET latest 的 runtimeState 不可靠）
2. **POST 与 GET latest 形状不同** — 见下表
3. **apply 禁止空 body** — patches/plans 必须由前端显式组装
4. **行前 / 行中各维护独立 `loopRunId`** — sessionStorage 分 kind 存储
5. **错误 envelope** — HTTP 200 + `success: false`，解析 `error.code`（非 4xx）

## 响应形状

### POST run（扁平）

```typescript
// POST /readiness-repair → data
type ReadinessRepairRunResult = {
  loopRunId: string;
  status: LoopRunStatus;
  runtimeState: LoopRuntimeState;  // 审计用，勿映射 ui
  before / after: ReadinessSnapshot;
  recommendedPatches: LoopRecommendedPatch[];  // apply 组装首选
  requiresApproval: boolean;
  ui?: TripLoopUiView;
};
```

### GET latest（信封）

```typescript
// GET .../latest → data（HTTP 200，空态非 404）
type ReadinessRepairLatestResponse = {
  loopRun: LoopRunDetail | null;  // loopRun.id === loopRunId；无 recommendedPatches
  ui: TripLoopUiView | null;
};
```

`loopRunId` 解析优先级：`runResult.loopRunId` → `loopRun.id` → `ui.primaryAction.loopRunId` → sessionStorage。

## ui.phase 与 runtimeState

**不一一对应。** C 端 badge / CTA / loading 只看 `ui.phase`：

| ui.phase | UX |
|----------|-----|
| `validating` | Loading |
| `issues_found` | 展示问题，可有 CTA |
| `awaiting_approval` | 必须用户确认才 apply |
| `completed` | 对比快照 |
| `failed` | 重试 run |

## apply 组装

```typescript
// 优先级
recommendedPatches（POST run）
  → sessionStorage 缓存（latest 恢复用）
  → ui.issueCards[].issueId + optionId

patches = recommendedPatches.map(p => ({
  issueId: p.issueId,
  optionId: p.optionId,
  executeDecision: true,
  persistDecision: true,
  runGuardianNegotiation: true,
}));
```

行中 `apply-in-trip` 同理，用 `recommendedPlans` → `{ environmentEventId, planId }`。

## apply 结果与重试

```typescript
// success: true 时仍可能有 deferred
applied[i].status === 'deferred'  // guardian 拒绝 — 勿无脑重试同一 body
applied[i].status === 'applied'   // 成功
```

`success: false` → 整请求失败，可重试；部分 patch 已执行不会回滚。

## 轮询策略

| 场景 | 行为 |
|------|------|
| PLANNING | 进入 GET latest **一次**，不 poll |
| TRAVELING | GET in-trip-recovery/latest 每 **60s** |
| `awaiting_approval` | 不 poll |
| 服务端 auto-trigger | 前端仍以 latest 为准，避免重复 POST run |

## Feature Flag

```bash
VITE_FEATURE_TRIP_LOOP_READINESS=0
VITE_FEATURE_TRIP_LOOP_IN_TRIP=0
```

## 页面接入

| 页面 | 组件 |
|------|------|
| Plan Studio | `ReadinessRepairLoopTrigger` + `ReadinessRepairLoopSheet` |
| Execute | `InTripRecoveryLoopBanner` + `InTripRecoveryLoopSheet` |

## 后端已知待修（不阻塞前端）

- 统一 POST / GET latest envelope
- GET latest runtimeState 与 POST 对齐
- in-trip 多 plan 用户选择 API
