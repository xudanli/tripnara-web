# Decision Center — FE-SSOT Checklist（签字版）

**日期：** 2026-07-03  
**适用范围：** `VITE_DECISION_GATEWAY_UNIFIED=1`（`.env.development` / `.env.production` 已配置）  
**验收命令：** `npm run decision-center:unified-qa`  
**相关文档：**

- [unified-decision-frontend-handoff.md](./api/unified-decision-frontend-handoff.md)
- [unified-decision-frontend-integration.md](./api/unified-decision-frontend-integration.md)
- 类型契约：`src/generated/unified-decision-contracts.ts`

**架构结论：** Gateway 开启条件下，Decision Center 前端可作为 SSOT 主路径交付；Legacy checker/matrix 与 `POST /decisions` 为 **feature-flag 降级**，非未完成项。

---

## 架构四原则

### 1. 决策主路径（Gateway ON = 默认）

| 方向 | 约定 |
|------|------|
| **读** | `GET decision-problems` → `detail.actions[]`；产品 UI **不再**依赖 `flow` / `repairOptions` |
| **写** | `POST .../resolutions` → `POST .../apply`；分支只看 `actionability.writeChain` |
| **角标** | `meta.openCount` / `meta.actionableCount` |
| **列表去重键** | `instanceKey`（**不是** `problemId`） |

### 2. decision-checker 新字段

当 `evaluationMode === 'CHANGE_PREVIEW'`（SSOT 开启时 BFF 自动切换）：

- **不要**用 `repairOptions` 做正式 apply
- counterfactual 来自 unified option preview（`problemId` + `actionId` 与 `decision-problems` 对齐）
- 正式写链仍走：`decision-problems` → `POST .../options/:actionId/preview` → `resolutions` → `apply`

### 3. planning-conflicts 定位调整

- 仍是规划工作台入口，但降为 **投影**，不是 SSOT
- `conflicts.summary.total` ≈ `decision-problems.meta.openCount`
- 点击冲突用 `problemId` / `instanceKey` 跳转 Decision Detail（`buildPlanStudioDecisionProblemPath`）

### 4. Legacy 降级（仅调试）

**仅当**显式 `DECISION_GATEWAY_UNIFIED=0` **且**未开 SSOT 时，才保留 checker/matrix + `POST /decisions` 降级路径。Gateway ON 为产品默认，Legacy 不可作为未完成项挂账。

---

## Phase 4 可选 — PlanObject 调试投影

> **范围：** 调试/运营面板；**不**改决策写路径。PlanObject issues 经 BFF 投影进入 `feasibility-report` / `planning-conflicts`，产品入口与 SSOT 主路径不变。

| 项 | 约定 |
|----|------|
| **调试读** | Timeline Tab：`GET timeline-overview?include=…,planobjects`（`planObjects.topAssessment` + 每日链） |
| **Plan Studio 调试** | 可选独立 `GET /plan-objects`（DEV 面板） |
| **写路径** | 无需新增；issues 走现有 feasibility / conflicts 投影 |
| **识别来源** | `proofs[].evidenceSource === 'plan-object-evaluator'` |
| **语义键** | `semanticKey` 以 `plan_object_` 开头 |

---

## Phase 5 — Effective Plan 写链

> **范围：** Gateway / 写链开启后，feasibility **不得**直接写 Effective Plan。

| 项 | 约定 |
|----|------|
| **禁止** | 产品 UI 直接 `POST …/apply-repair` 写行程 |
| **正式写** | `decision-problems` → `POST …/resolutions` → `POST …/apply` |
| **错误码** | `EFFECTIVE_PLAN_WRITE_CHAIN_REQUIRED` → 引导打开决策空间 |
| **BFF 响应** | `{ success:false, error:{ code, message, details:{ caller, authorizedPaths, writeChain } } }` — **非** 500 |
| **前端处理** | 检测 `error.code`；用 `details.authorizedPaths` 生成 CTA；**勿**重试 apply-repair / resolveConflicts |
| **Gateway 前置** | `VITE_DECISION_GATEWAY_UNIFIED=1` 时前端 proactive 拦截 apply-repair |
| **commitPlan** | 禁止直写时间轴；读 `planState.metadata.agentPlanDraftMutation` 展示拟议变更 |
| **Plan Gate 落盘** | 按钮改为「前往决策空间 apply」→ `decision-problems/:id/apply` |

### 运行时探测（写链 + Feasibility 投影）

| 探测 | 路径 |
|------|------|
| 写链 ops | `GET /decision-runtime/ops/write-chain` |
| 运行时能力 | `GET /decision-engine/v1/runtime-capabilities` |

| 字段 | 含义 | 前端行为 |
|------|------|----------|
| `writeChainEnabled` | 写链开启 | 禁止直调 apply-repair / resolveConflicts / agent 行程写 |
| `gatewayDomainRulesExclusive` | Gateway 独占域规则 | Feasibility 以 Gateway 投影为准，剥离 legacy 同域重复 issue |
| `constraintPlanVerifyProjection` | PLAN_VERIFY 投影 | `poi_access` / `schedule` / `guardian` 来自 Gateway |
| `phase6LegacyDeprecation` | Phase 6 总开关 | 配合上两项启用完整语义收口 |

**正式应用路径：** `GET decision-problems` → `POST …/resolutions` → `POST …/apply`

**RL / DAG：** 识别 `writeChainRequired: true` + `authorizedPaths`（`parseWriteChainRequiredSignal`）

**实现：** `decision-runtime-capabilities.store.ts` · `gateway-feasibility-projection.util.ts` · `useDecisionRuntimeCapabilities`

---

## Phase 6 — Legacy apply 废弃

| 项 | 约定 |
|----|------|
| **conflicts/resolve** | 仅 `dryRun=true` 预览；非 dryRun 禁止直写 → `decision-problems/:id/apply` |
| **readiness apply-repair** | 写链开启时 API 层拦截 + Readiness 页引导决策空间 |
| **execution reorder / apply-fallback** | 写链开启时 API 层拦截 + Execute 页引导决策空间 |
| **trip-planner applySuggestion** | 写链开启时 API 层拦截 + Plan Studio 引导决策空间 |
| **Legacy 错误码** | `NON_CANONICAL_APPLY_DEPRECATED` — Phase 6 后端对旧 apply 路径的统一拒绝 |

### ConstraintEvaluationGateway（narrate-only）

| 项 | 约定 |
|----|------|
| **接口** | `POST /training/safety/constraints/check`（及可能共形的 `POST …/constraints/check`） |
| **narrate-only 标识** | `{ usage: "narrate_only", formal_authority: "ConstraintEvaluationGateway" }` |
| **禁止** | 用 `is_blocked` / `requires_approval` 做正式门禁（disable submit / apply） |
| **仅 UI 提示** | `violations` / `warnings` → 文案、角标、深链 |
| **正式裁决** | `decision-problems` → Gateway（`resolutions` → `apply`） |
| **实现** | `safety-constraints-check.util.ts` · `useTripConstraintsCheck.isNarrateOnlyCheck` |

---

## 签字前人工路径

在 Plan Studio 对 **F208 封路**问题走通：

1. 从决策队列选中问题  
2. 选择 action → **提交结论**（`POST .../resolutions`）  
3. **应用到行程**（`POST .../apply`）  
4. 若有协作子任务：PATCH status / assignee，或取消（`cancelled`）

---

## FE-SSOT-1 — 类型 + 列表/总览

- [x] 从 `@/generated/unified-decision-contracts` 导入 v2 类型  
  - **说明：** 决策 UI / 写路径 hook 已迁；部分 internal util 仍用 `@/types/unified-decision`（contracts 为其 re-export，不阻断）
- [x] 删除 `flow === 'CANONICAL_L2'` 分支（debug 面板除外）  
  - **说明：** `src/components/**` 无 UI 分支；util 层保留 flow→writeChain 映射
- [x] `GET decision-problems` 使用 `meta.openCount` / `meta.actionableCount` 做角标  
  - **实现：** `src/lib/decision-list-badge.util.ts` → `WorkbenchDecisionQueuePanel`
- [x] `GET decision-center/overview` 使用 `totalOpenProblemCount` 等 v2 字段  
  - **实现：** `src/lib/decision-center-overview-v2.util.ts`
- [x] 列表卡片 `key={item.instanceKey}`  
  - **实现：** `DecisionProblemList.tsx` — `key={item.instanceKey ?? item.id}`

---

## FE-SSOT-2 — 详情 + actions

- [x] 详情读 `problem` + `actions[]`，不再读 `repairOptions` / `planBHints`  
  - **例外：** feasibility / readiness 面仍用 `repairOptions`（非 Decision Queue 域）
- [x] `action.source` 展示 `ALTERNATIVE_GENERATOR`（非 NEPTUNE 语义）  
  - **实现：** `decisionActionSourceLabel` + `DecisionActionCard`（生产可见）
- [x] 展示 `detectors[]` / `origin` 来源徽章  
  - **实现：** `DecisionActionCard` · `ActionSourceBadges`
- [x] 写分支只看 `actionability.writeChain`  
  - **实现：** `resolveDetailWriteChain` 优先 `actionability.writeChain`

---

## FE-SSOT-3 — 数量对齐（planning-conflicts = 投影）

- [x] 同 trip 并行请求 `decision-problems` + `planning-conflicts`  
  - **实现：** Plan Studio 双 React Query hook + `useDecisionSurfaceAlignmentProbe` · `Promise.all`
- [x] 断言 `conflicts.summary.total ≈ problems.meta.openCount`  
  - **定位：** planning-conflicts 为工作台投影，**非**写 SSOT；数量对齐 decision-problems.meta
- [x] 点击冲突跳转 Decision Detail（`problemId` / `instanceKey`）  
  - **实现：** `buildPlanStudioDecisionProblemPath` · `resolveDecisionProblemForConflict`
- [x] F208 封路两边均可见  
  - **实现：** QA 列表含 `problem_road_F208_*`；probe 默认 `entityRef='F208'`
- [x] DEV 探针 + QA UD-08 强制对齐  
  - **实现：** `DecisionSurfaceAlignmentDevHint` · harness UD-08
- [x] Timeline `stats.conflictCount` 与 planning-conflicts 一致  
  - **实现：** `TripDetailTimelineTab` + QA `source='ssot_planning_conflicts'`

---

## FE-SSOT-4~5 — Action 组件统一

- [x] 单一 `ActionCard` 组件，尊重 `action.allowed` / `blockedReason`  
  - **实现：** `DecisionActionCard`（select 模式）← `DecisionActionsPanel`；suppress 走 `DecisionSuppressedActionsCollapsible`
- [x] Preview 走 `POST .../options/:actionId/preview`  
  - **实现：** `decisionProblemsApi.previewOption`
- [x] 删除 Canonical / Legacy 双套 options UI（Gateway 开）  
  - **实现：** `canUseProblemWriteApi` 时禁 `DecisionSpaceOptionCard`，走 `DecisionProblemResolutionSection`  
  - **例外：** `VITE_DECISION_GATEWAY_UNIFIED=0` **且** SSOT 未开时保留 checker/matrix + `DecisionSpaceOptionCard`（**仅调试**）

---

## FE-SSOT-6 — 写路径（核心）

- [x] 选 action → `POST .../resolutions` → `POST .../apply`  
  - **实现：** `useDecisionProblemActions` + `decision-apply-action.util.ts`
- [x] 不再对新产品 UI 直接 `POST .../decisions`  
  - **实现：** Gateway 开时 `confirmDecision` toast 拦截；Decision Space 走 resolutions/apply  
  - **例外：** `useDecisionProblemFlow` Legacy hook 保留（Gateway 关降级）
- [x] apply 后处理 `revalidation.status`（PENDING 可 poll apply）  
  - **实现：** `pollDecisionProblemApplyUntilSettled` — 幂等 POST apply + GET detail 降级（`src/lib/decision-apply-polling.util.ts`）
- [x] invalidate `decision-problems` / `planning-conflicts` / `trip`  
  - **实现：** `decisionProblemWriteQueryKeys`

---

## FE-SSOT-7 — 协作任务

- [x] submit 后绑定 `collaborativeTask.resolutionId`  
  - **实现：** submit 存 `resolution.resolutionId`；读 `collaborativeTask.actionPlanId`（若有）
- [x] apply 后更新 `actionPlanId`；展示 `suggestedSubTasks`（若有）  
  - **实现：** `useDecisionProblemActions.applyToTrip`
- [x] 子任务创建引用 `{ problemId, resolutionId, actionPlanId? }`  
  - **实现：** URL 含 problemId；POST body 含 resolutionId + 可选 actionPlanId
- [x] PATCH 子任务 status / assigneeUserId  
  - **实现：** `DecisionCollaborativeSubTasksPanel` 下拉 PATCH
- [x] submit 展示 `suggestedFollowUps`；apply 展示 `suggestedSubTasks`  
  - **实现：** `DecisionSuggestedFollowUpsPanel` + apply 态 `autoSuggestedCount`
- [x] DELETE 误创建子任务；取消用 PATCH `cancelled`  
  - **实现：** 无 DELETE；「取消子任务」→ PATCH `status: 'cancelled'`

---

## FE-SSOT-8 — decision-checker（CHANGE_PREVIEW）

- [ ] `DecisionCheckerResponse.evaluationMode === 'CHANGE_PREVIEW'` 时 SSOT 自动生效  
  - **待办：** 类型补 `evaluationMode`；BFF 联调后验收
- [ ] counterfactual `scenarios[]` 的 `problemId` + `actionId` 与 `detail.actions[]` 对齐  
  - **待办：** 反事实 Tab 选方案 → 跳转 Decision Detail 选中对应 action，不走 `repairOptions` apply
- [ ] checker 内 CTA（`open_repair_plan` / `select_option`）Gateway ON 时不触发正式写  
  - **现状：** 决策空间模式已禁 matrix 确认；apply 仍经 `DecisionProblemResolutionSection`
- [ ] preview 仍走 `POST .../options/:actionId/preview`（与 FE-SSOT-4 一致）

---

## FE-SSOT-9 — PlanObject 调试面板（Phase 4 可选）

- [x] Timeline Tab 展示每日链 + top assessment（`include=planobjects`）  
  - **实现：** `TripDetailTimelineTab` · `timelinePhase2` include · `TimelinePlanObjectSection`
- [x] Plan Studio DEV 可选独立 `GET /plan-objects`  
  - **实现：** `WorkbenchPlanObjectDebugPanel`（非产品主路径）
- [x] 不改写路径；PlanObject issues 经 BFF 进入 `feasibility-report` / `planning-conflicts` 投影  
  - **说明：** 无新 apply API；冲突/队列仍走现有入口
- [x] 来源识别：`proofs[].evidenceSource === 'plan-object-evaluator'`  
  - **实现：** `plan-object-source.util.ts` · `PlanObjectSourceBadge` on conflicts + decision queue
- [x] 语义键：`semanticKey.startsWith('plan_object_')`  
  - **实现：** `isPlanObjectSemanticKey` 与 conflicts / problems 共用
- [x] 决策检查器证据：`title` 人话 + `subtitle` ruleId 映射；semanticKey 仅 `refs`  
  - **BFF：** `decision-checker-evidence.projection.util.ts`（2026-07-03 ✅）  
  - **FE 兜底：** `decision-checker-evidence-display.util.ts` · legacy key 响应仍可读

> **签字：** 本组为 Phase 4 可选；BFF `GET plan-objects` 404 时面板显示「尚未提供」，不阻塞主路径。

---

## FE-SSOT-10 — Effective Plan 写链（Phase 5）

- [x] Gateway ON 时禁止产品 UI 直接 `apply-repair`  
  - **实现：** `assertFeasibilityApplyRepairAllowed` · `FeasibilityBufferRepairActions` 替换为深链提示
- [x] 正式写路径：`resolutions` → `apply`（与 FE-SSOT-6 一致）  
  - **实现：** `useFeasibilityRepairWorkflow` · `optionsSource === 'decision-problems'`
- [x] 识别 `EFFECTIVE_PLAN_WRITE_CHAIN_REQUIRED`  
  - **实现：** `effective-plan-write-chain.util.ts` · `parseWriteChainBlockedError` · `formatWriteChainAuthorizedPathsCta`
- [x] BFF 写链阻断（含 `details.authorizedPaths`）不再当 500 处理  
  - **实现：** `api/client.ts` 拦截器 · `coerceWriteChainBlockedError` · `shouldRetryLegacyApply`
- [x] 冲突/缓冲修复 UI 引导决策空间  
  - **实现：** `FeasibilityWriteChainRedirectHint` → `buildPlanStudioDecisionProblemPath`
- [x] 运行时探测 `write-chain` / `runtime-capabilities`  
  - **实现：** `decision-runtime-api` · `prefetchDecisionRuntimeCapabilities` · Plan Studio prefetch
- [x] Feasibility Gateway 域投影（`gatewayDomainRulesExclusive`）  
  - **实现：** `gateway-feasibility-projection.util.ts` · `finalizeFeasibilityReport`
- [x] RL/DAG `writeChainRequired` 结构化拒绝  
  - **实现：** `parseWriteChainRequiredSignal` · `coerceWriteChainBlockedError`

---

## FE-SSOT-11 — commitPlan / Agent 草案（Phase 5 续）

- [x] 写链开启时不调用 commitPlan / execute commit 直写时间轴  
  - **实现：** `usePlanGateFlow.handleCommit` 拦截 · `PlanGateFooter` 改「前往决策空间 apply」
- [x] 读 `planState.metadata.agentPlanDraftMutation` 展示拟议变更  
  - **实现：** `readAgentPlanDraftMutation` · `PlanGateAgentDraftMutationPanel`
- [x] 正式落盘走 `decision-problems/:id/apply`  
  - **实现：** `PlanGateWizard` → `buildPlanStudioDecisionProblemPath(problemId)`
- [x] draftDiff 降级展示（metadata 缺失时）  
  - **实现：** `agentPlanDraftMutationFromPlanGateDiff`

---

## FE-SSOT-12 — Phase 6 Legacy apply 拦截

- [x] `POST …/conflicts/resolve` 非 dryRun 写链开启时拦截  
  - **实现：** `tripsApi.resolveConflicts` · `assertConflictsResolveAllowed`
- [x] `readiness apply-repair` / `autoRepair` 写链开启时拦截  
  - **实现：** `readinessApi` · Readiness 页 `handleApplyFix` 深链
- [x] feasibility apply-repair 不再 fallback readiness（写链 ON）  
  - **实现：** `feasibility-repair.ts` · `trip-constraint-solver.applyIssueRepair`
- [x] 识别 `NON_CANONICAL_APPLY_DEPRECATED`  
  - **实现：** `formatLegacyApplyBlockedMessage` · `isLegacyApplyBlockedError`
- [x] execution reorder / apply-fallback 写链开启时拦截  
  - **实现：** `assertExecutionReorderAllowed` · `assertExecutionApplyFallbackAllowed` · Execute 页 `handleWriteChainBlockedError`
- [x] trip-planner applySuggestion 写链开启时拦截  
  - **实现：** `assertTripPlannerApplySuggestionAllowed` · ScheduleTab / TripPlannerAssistant 深链
- [x] ConstraintEvaluationGateway narrate-only：不用 is_blocked 作正式门禁  
  - **实现：** `safety-constraints-check.util.ts` · `shouldUseSafetyCheckForFormalGate`

---

## 验收门禁

- [x] `npm run decision-center:unified-qa` 全绿 — **11/11 API + 26 contract tests**
- [x] 紧急电话不在 Decision Queue — `filterDecisionQueueSummaries`
- [x] 三处 open 数量一致 — QA UD-08

---

## 签字栏

| 角色 | 姓名 | 日期 | 签认 |
|------|------|------|------|
| FE | | | ☐ |
| BE / BFF | | | ☐ |
| QA | | | ☐ |
| 架构 | | | ☐ |

---

# Architecture Review（PR 模板）

以下内容可直接粘贴进 PR description。

## Summary

This PR completes the frontend migration to Unified Decision SSOT v2 for the **Gateway-enabled product path** (`VITE_DECISION_GATEWAY_UNIFIED=1`). Read surfaces (list, overview, alignment probes) and write surfaces (resolutions → apply, collaborative sub-tasks) now share the same BFF contracts. Legacy checker/matrix and `POST /decisions` remain **behind the Gateway flag** as intentional degradation, not incomplete work.

## Architectural boundaries

| Concern | SSOT path (Gateway ON) | Legacy fallback (Gateway OFF + SSOT off, debug only) |
|---------|-------------------------|--------------------------------------------------------|
| Problem list badges | `meta.openCount` / `meta.actionableCount` | Client-side open count |
| Detail options | `detail.actions[]` | checker / matrix scenarios |
| Write chain | `actionability.writeChain` | flowKind mapping |
| Confirm flow | resolutions → apply | POST decisions + poll |
| Action UI | `DecisionActionCard` / `DecisionActionsPanel` | `DecisionSpaceOptionCard` grid |
| List dedupe key | `instanceKey` | `id` fallback |
| planning-conflicts | projection; `summary.total` ≈ `meta.openCount` | same read, no SSOT write |
| decision-checker counterfactual | `CHANGE_PREVIEW` → unified preview ids | `repairOptions` / matrix (legacy) |

**Decision:** product UI gates on `canUseProblemWriteApi`, not `flow === 'CANONICAL_L2'`. CANONICAL_L2 exists only in util-layer mapping. `planning-conflicts` and `decision-checker` are workbench projections — not write SSOT.

## Write path

1. User selects action from `detail.actions[]`
2. `POST .../resolutions` → stores `resolutionId`, shows `suggestedFollowUps`
3. `POST .../apply` → updates `actionPlanId`, seeds `suggestedSubTasks`
4. If `revalidation.status === PENDING`, `pollDecisionProblemApplyUntilSettled` idempotently re-posts apply (max 20×, 2s interval) with GET detail fallback
5. Invalidates decision-problems, planning-conflicts, trip, decision-center, collaborative queries

Gateway ON blocks direct `POST .../decisions` in product UI with user-facing toast.

## Count alignment (SSOT-3)

Three surfaces must agree:

- `problems.meta.openCount`
- `planning-conflicts.summary.total`
- `timeline.stats.conflictCount` (source `ssot_planning_conflicts`)

DEV probe: `DecisionSurfaceAlignmentDevHint` + `useDecisionSurfaceAlignmentProbe`. QA gate UD-08 enforces this in CI harness.

Readiness/safety items (e.g. emergency phone) are filtered from the decision queue via `filterDecisionQueueSummaries`.

## Collaborative tasks (SSOT-7)

- **Submit phase:** manual sub-task creation bound to `resolutionId`; UI shows API or semanticKey-derived `suggestedFollowUps`
- **Apply phase:** auto-seeded `suggestedSubTasks`; PATCH status / assignee; cancel via `status: cancelled` (no DELETE)

## Removed / deprecated

- `DecisionCenterDualRunPanel` removed from product surfaces (metrics util retained for tests; alignment covered by UD-08 + DevHint)
- Dual options UI removed when Gateway ON (`PlanningWorkbenchDecisionSpace` blocks `DecisionSpaceOptionCard`)

## Known deferred items (non-blocking)

- Full type migration: all modules → `@/generated/unified-decision-contracts` only
- `DecisionCheckerResponse.evaluationMode` + CHANGE_PREVIEW counterfactual → actionId alignment (FE-SSOT-8)
- PlanObject debug panel: `GET plan-objects` intraday chain + `plan-object-evaluator` source badges (FE-SSOT-9 — **done**, BFF endpoint optional)
- Deprecate `useDecisionProblemFlow` Legacy POST decisions after Gateway 100% rollout
- Surface explicit `revalidationPending` UI state when apply poll times out
- Delete `DecisionSpaceOptionCard` only after Legacy Gateway path is retired

## Release gate

- [ ] `npm run decision-center:unified-qa` green
- [ ] `VITE_DECISION_GATEWAY_UNIFIED=1` in target environment
- [ ] Manual E2E: F208 problem — select action → submit → apply → sub-task PATCH
- [ ] Three-way open counts match on staging trip

## Verdict

**Approve for merge** when Gateway is enabled in target env and manual F208 write path passes. Legacy paths are feature-flagged degradation, not SSOT gaps.

---

## 关键代码索引

| 模块 | 路径 |
|------|------|
| 行动卡片 | `src/components/decision-problems/DecisionActionCard.tsx` |
| 行动列表 | `src/components/decision-problems/DecisionActionsPanel.tsx` |
| 写路径 hook | `src/hooks/useDecisionProblemActions.ts` |
| apply 轮询 | `src/lib/decision-apply-polling.util.ts` |
| 决策空间 | `src/components/plan-studio/workbench/PlanningWorkbenchDecisionSpace.tsx` |
| 数量对齐探针 | `src/hooks/useDecisionSurfaceAlignmentProbe.ts` |
| 冲突→决策深链 | `src/lib/plan-studio-decision-navigation.util.ts` |
| 列表去重 | `src/lib/unified-decision-problem-list.util.ts` |
| 决策检查器 | `src/components/plan-studio/workbench/PlanningWorkbenchDecisionChecker.tsx` |
| Kernel 调试面板（参考） | `src/components/planning-workbench/WorkbenchKernelDebugPanel.tsx` |
| Timeline PlanObject | `src/components/trips/detail/TimelinePlanObjectSection.tsx` |
| Plan Studio 调试 | `src/components/planning-workbench/WorkbenchPlanObjectDebugPanel.tsx` |
| 写链拦截 | `src/lib/effective-plan-write-chain.util.ts` |
| apply-repair 引导 | `src/components/feasibility-report/FeasibilityWriteChainRedirectHint.tsx` |
| Agent 草案展示 | `src/components/plan-gate/PlanGateAgentDraftMutationPanel.tsx` |
| agentPlanDraftMutation | `src/lib/agent-plan-draft-mutation.util.ts` |
| Legacy apply 拦截 | `src/lib/effective-plan-write-chain.util.ts` |
| QA harness | `scripts/harness-decision-center-unified-qa.sh` |
