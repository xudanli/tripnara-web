# 决策执行空间 · 前端联调 Handoff

**日期：** 2026-07-06  
**范围：** Plan Studio `decisionSpace=1` · 决策执行（非行程诊断）· 写回反馈环

---

## 文档索引

| 文档 | 用途 |
|------|------|
| [FE_INTEGRATION_HANDOFF.md](./FE_INTEGRATION_HANDOFF.md) | Gateway 总览 |
| [decision-options-tradeoffs-contract.md](./decision-options-tradeoffs-contract.md) | 方案 tradeoffs / 结果卡投影 |
| 本文 | 执行空间专用 read model 与队列合并 |

---

## 前端入口

| 模块 | 路径 |
|------|------|
| 决策执行中栏 | `src/components/plan-studio/workbench/PlanningWorkbenchDecisionSpace.tsx` |
| 决策队列（合并） | `src/components/decision-problems/DecisionQueueClusterList.tsx` |
| 队列聚类 util | `src/lib/decision-queue-cluster.util.ts` |
| 上下文胶囊 | `src/components/decision-problems/DecisionContextCapsule.tsx` |
| 结果卡分层 | `src/lib/decision-space-result-card.util.ts` |
| 调整前后 | `src/components/decision-problems/DecisionBeforeAfterPanel.tsx` |
| 写回步骤 | `src/components/decision-problems/DecisionWriteBackStepsPanel.tsx` |
| 右栏 Tab | `PlanningWorkbenchDecisionChecker` · `decisionSpaceMode` |
| **P6 类型 SSOT** | `src/types/planning-decision-pack.ts` |
| **P6 归一化** | `src/api/normalize-planning-decision-pack.ts` |
| **P6 适配器** | `src/lib/planning-decision-pack.adapter.ts` |
| 编排草案方案卡 | `src/components/decision-problems/PlanningProposalOptionsPanel.tsx` |
| Proposal monitor | `arrangeItineraryApi.getProposalMonitor` |

---

## P6 决策语义（arrange-itinerary · 已接入）

### P0 — `proposal.decisionPack.options[]`

Schema: `tripnara.planning_decision_pack@v1`

```typescript
// src/types/planning-decision-pack.ts · PlanningDecisionPackOption
{
  id, optionKind, title, recommended,
  outcomes[], costs[],
  impactScope: { scope, affectedDays, itemIds, candidateIds, placeIds },
  counterfactualRows: [{ id, label, before, after }],
  action?: { type, proposalId }
}
```

**前端消费：**
- `normalizePlanProposal` → `proposal.decisionPack`
- `ArrangeItineraryProposalDialog` + `PlanningProposalOptionsPanel`
- `CopilotSuggestion.option`（同构）
- `resultLayersFromPlanningOption()` → 决策执行结果卡

### P1 — `decisionPack.decisionClusters[]`

```typescript
// PlanningDecisionCluster
{ id, title, dayNumbers, diagnosticCount, decisionId, dependsOn[], resolvesCount, options[] }
```

**前端消费：**
- `planning-workbench-snapshot.copilot.decisionClusters` → 簇摘要
- `decisionQueueClustersFromPlanningPack()` / `decisionQueueClustersFromSummaries()` → 左栏队列（`bffClusters` 优先）
- 无 BFF 时降级 `clusterDecisionProblemsForQueue()`

### 写回 — `POST .../proposals/:id/apply`

响应字段（已归一化）：
- `executionSteps[]` → `DecisionWriteBackStepsPanel`
- `validUntil` → `DecisionValidityStrip`
- `monitorWebhookUrl` → 待接轮询 hook

### 失效监控

```
GET /api/trips/:tripId/arrange-itinerary/proposals/:proposalId/monitor
```

→ `arrangeItineraryApi.getProposalMonitor` · `PlanningProposalMonitorView`

---

## 产品边界

| 区域 | 职责 | 禁止 |
|------|------|------|
| 规划工作台（schedule，无 decisionSpace） | 诊断：哪里有问题、影响什么 | 方案对比主流程 |
| **决策执行空间** | 针对单一问题：取舍 → 模拟 → 验证 → 写回 | 重复天气/整趟上下文/三人格投票 |

---

## P0 · BFF Read Model（阻塞差异化方案）

### `GET /trips/:tripId/decision-problems/:id`

在现有 `detail` 上扩展（或并行 `executionView`）：

```typescript
interface DecisionExecutionView {
  /** 最小上下文切片 — 替代前端从 assertions 拼凑 */
  contextCapsule: Array<{
    id: string;
    text: string;
    kind: 'confirmed' | 'predicted' | 'unconfirmed';
  }>;

  /** 因果链 — 右栏「因果链」Tab SSOT */
  causalChain: Array<{ id: string; text: string }>;

  /** 决策有效期 */
  validUntil?: string;
  validityConstraint?: string; // 例：道路耗时不超过 52 分钟

  /** 写回前 Gate — 右栏「可执行性」Tab */
  feasibilityGate: Array<{
    key: string;
    label: string;
    status: 'pass' | 'warn' | 'fail';
    detail?: string;
  }>;
}
```

### `GET .../options` 或 `detail.actions[]`

每个方案必须能投影为**不同取舍**，而非同义改写：

```typescript
interface DecisionOptionResultCard {
  outcomes: string[];
  costs: string[];
  impactScope: string[];
  systemJudgment?: string;
  optionKind: 'SHIFT_EARLIER' | 'SHORTEN_STAY' | 'SHIFT_LATER' | 'ACCEPT_RISK';
  counterfactualRows: Array<{
    label: string;
    baselineValue: string;
    optionValue: string;
  }>;
}
```

**验收：** 同一 problem 至少 2 个 `optionKind` 不同；`ACCEPT_RISK` 在缓冲类问题中必须存在。

### `POST .../options/:actionId/preview`

```typescript
interface DecisionPreviewExtensions {
  itineraryDiff: ItineraryDiffEntry[];      // 已有，需稳定
  proposedMutations: { description: string }[];
  counterfactualRows?: CounterfactualRow[];   // 中栏「调整前后」SSOT
  memberNotifyCount?: number;
}
```

---

## P1 · 决策队列合并

### `GET /trips/:tripId/decision-problems` 列表扩展

```typescript
interface DecisionProblemClusterView {
  id: string;
  title: string;
  dayNumbers: number[];
  problemIds: string[];
  representativeProblemId: string;
  processingKind: 'must_confirm' | 'batchable' | 'auto_fixable' | 'depends_on' | 'may_auto_resolve';
  dependencies: Array<{
    kind: 'depends_on' | 'affects' | 'may_resolve';
    label: string;
    targetClusterId?: string;
  }>;
  mayResolveCount?: number;
  diagnosticCount?: number;  // 合并前诊断条数
}

interface DecisionProblemListResponse {
  items: DecisionProblemSummary[];
  clusters?: DecisionProblemClusterView[];  // 有则前端停用客户端聚类
  meta: { diagnosticTotal?: number; clusterTotal?: number };
}
```

**当前前端降级：** `clusterDecisionProblemsForQueue()` 按「天次 + 问题模板」客户端合并。

---

## P1 · 写回反馈环

### `POST .../apply` 响应扩展

```typescript
interface ApplyDecisionProblemResponse {
  tripVersionAfter?: string;
  executionSteps?: Array<{
    id: string;
    label: string;
    status: 'done' | 'failed';
  }>;
  undoToken?: string;  // 撤销本次调整
}
```

**当前前端降级：** `buildDecisionWriteBackSteps()` 按 diff / memberImpacts 投影步骤动画。

---

## P2 · 成员共识

`detail.memberImpacts[]` 需区分来源（影响右栏权重）：

```typescript
interface DecisionMemberImpact {
  memberId?: string;
  memberName?: string;
  summary?: string;
  derivedFrom?: 'explicit' | 'ai_summary' | 'inferred' | string;
  confidence?: 'high' | 'medium' | 'low';
}
```

---

## P2 · 决策失效重开

Execution monitor 推送或轮询：

```typescript
interface DecisionStaleReopenEvent {
  problemId: string;
  reason: string;           // 道路耗时已升至 59 分钟…
  previousValidUntil: string;
}
```

前端：Toast + 自动 `openDecisionSpace(problemId)` + 右栏默认可执行性 Tab。

---

## 快速验收（前端）

```bash
# 队列聚类单测
npm test -- src/lib/decision-queue-cluster.util.test.ts

# 打开执行空间
open "/dashboard/plan-studio?tripId=<TRIP>&tab=schedule&decisionSpace=1&problemId=<PROB>"
```

**通过标准：**
1. 左栏显示「AI 已将 N 项诊断合并为 M 个决策」（当 N>M）
2. 中栏方案卡含 结果/代价/系统判断（有 tradeoffs 时）
3. 写回后逐步显示 5 条系统动作
4. 右栏 Tab：因果链 / 计划差异 / 成员共识 / 可执行性

---

## 后端入口（NestJS repo · 参考）

| 能力 | 建议模块 |
|------|----------|
| 方案差异化投影 | `decision-space-option-projection.util.ts` |
| 队列聚类 | `decision-problem-cluster.projection.ts`（新建） |
| 写回步骤 | `decision-apply-orchestrator` 回传 `executionSteps` |
| 有效期 monitor | `execution-monitor` → `decision-stale-reopen` |
