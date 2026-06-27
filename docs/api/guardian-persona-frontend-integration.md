# 三人格 Guardian — 前端接口文档（P0 / P1 / P2）

> **版本**: P0/P1/P2 全量 · 2026-06-25  
> **类型 SSOT**: `src/types/guardian-presentation.ts` · `src/types/guardian-choose.ts`  
> **工具**: `src/lib/guardian-presentation.util.ts` · `src/lib/guardian-choose-submit.ts` · `src/lib/guardian-decision-log-display.ts`  
> **Hooks**: `src/hooks/useGuardianHumanChoice.ts`  
> **UI**: `src/components/guardian/`  
> **工作台**: `src/api/planning-workbench.ts` · `src/pages/plan-studio/PlanningWorkbenchTab.tsx`  
> **行中 Planner**: `src/api/trip-planner.ts` · `src/components/trip-planner/TripPlannerAssistant.tsx`  
> **准备度博弈**: `src/types/readiness-guardian-negotiation.ts` · `src/components/readiness/GuardianNegotiationPanel.tsx`  
> **Legacy 审计**: [`guardian-legacy-ui-audit-matrix.md`](./guardian-legacy-ui-audit-matrix.md)  
> **前端清单**: [`guardian-persona-frontend-checklist.md`](./guardian-persona-frontend-checklist.md)

---

## 快速引用

```typescript
import { extractGuardianPresentation, isHardConstraintBlock, isNegotiationHardBlocked } from '@/lib/guardian-presentation.util';
import { useGuardianHumanChoice } from '@/hooks/useGuardianHumanChoice';
import {
  GuardianAssistantBlock,
  GuardianLegacyCitations,
  GuardianPresentationPanel,
  GuardianDecisionCard,
  GuardianBriefBanner,
} from '@/components/guardian';
import type { GuardianPersonaPresentation } from '@/types/guardian-presentation';
```

---

## 0. 版本与能力映射

| 版本 | 后端能力 | 前端应感知 |
|------|----------|------------|
| **P0** | Neptune 修复后 Abu 复核 + Dr.Dre 再平衡；硬约束不可投票 | `decision-log.metadata.revalidationPass`；negotiation 遇硬约束直接 REJECT |
| **P1** | 统一动作 `BLOCK/ADJUST/REPAIR/CHOOSE`；单主角 `presentation` | 默认渲染 `presentation`，不用三人独白 |
| **P2** | `expressionPhase` / `briefLines` / `displayStyle`；Trip Planner `guardianPresentation` | 规划期 vs 行中两套 UI 密度 |

**默认决策路径（Mode 1）**：

```
Abu → Dr.Dre → Neptune → [Neptune 改 plan] Abu 复核 → Dr.Dre 再平衡 → Persona Expression → 用户 CHOOSE
```

**Mode 2（价值协商）**：仅软约束；见 §4.3 negotiation。  
**Mode 3（解释层）**：`PersonaShellOutput.presentation`；见 §4.1 / §4.2。

---

## 1. 前端消费原则

三人格是 **责任席位**，不是三个并行 Agent。UI 默认 **单主角**，不要三人轮流发长段独白。

### 1.1 优先字段（按场景）

| 场景 | 主字段 | 备用 / 展开 |
|------|--------|-------------|
| **场景 2 · 规划助手对话** | `POST /api/agent/planning-assistant/chat` → `personaEvaluation.presentation` | `consolidatedDecision.nextSteps`（CHOOSE） |
| **规划工作台** | `uiOutput.presentation` | `personas.abu/drdre/neptune` 详情抽屉 |
| **顺序编排（P0）** | `allowed` + `finalAction` + `logs` | decision-log 的 `revalidationPass` |
| **价值协商（P1）** | `decision` + `humanDecisionPoints` | 勿展示三人 utility 气泡 |
| **准备度修复** | `apply-repair.guardianNegotiation` | `repair-options.guardianNegotiation` 预览 |
| **行中 Trip Planner** | `guardianPresentation` | `personaInsights`（渐进式） |
| **行程详情提醒** | `GET .../persona-alerts` | 合并进 suggestions；**BFF 契约**见 [`persona-alerts-bff-contract.md`](./persona-alerts-bff-contract.md) |
| **博弈快照只读** | `GET .../readiness/trip/:tripId/guardian-negotiation` | pre/post 对比 |

### 1.2 渲染规则（P2）

```typescript
// 规划期 — 设计建议，可展开 supportingLines
if (presentation.displayStyle === 'design_advisory') {
  renderHeadline(presentation.headline);
  renderNarrative(presentation.narrative); // Markdown 友好 → GuardianDecisionCard
  renderActions(presentation.actions);     // BLOCK / ADJUST / REPAIR / CHOOSE
}

// 行中期 — 执行简报，优先 briefLines
if (presentation.displayStyle === 'execution_brief') {
  renderBanner(presentation.briefLines ?? [presentation.narrative]); // GuardianBriefBanner
  renderPrimaryCTA(presentation.actions);
}
```

前端统一入口：`GuardianPresentationPanel` 按 `displayStyle` 路由。

### 1.3 责任动作映射（P1 统一契约）

| 动作 | 责任席位 | UI 含义 |
|------|----------|---------|
| `BLOCK` | Abu | 阻止继续执行，必须改方案 |
| `ADJUST` | Dr.Dre | 调整节奏/强度/缓冲 |
| `REPAIR` | Neptune | 意图守恒的替代结构 |
| `CHOOSE` | 用户 | 软约束价值取舍（**不可覆盖硬约束**） |

**P0 硬约束否决**：negotiation 检测到硬违规时 Abu 强制 `STRONG_OPPOSE`，**不进入投票**；前端不得提供「忽略硬风险继续」。`isHardConstraintBlock(presentation)` 用于禁用此类 CTA。

---

## 2. 核心类型

见 `src/types/guardian-presentation.ts` — `GuardianPersonaPresentation`、`GuardianAction`、`LeadSpeakerScenario` 等。

---

## 3. 接口清单（全量）

### 3.1 表达层 / C 端主路径（P1/P2）

| # | 方法 | 路径 | 封装 |
|---|------|------|------|
| 1 | POST | `/planning-workbench/execute` | `planningWorkbenchApi.execute` |
| 2 | POST | `/agent/planning-assistant/sessions` | planning assistant |
| 3 | POST | `/agent/planning-assistant/chat` | planning assistant |
| 4 | GET | `/trips/:id/persona-alerts` | `tripsApi.getPersonaAlerts` |
| 5 | GET | `/trips/:id/suggestions` | trips API |
| 6 | GET | `/trips/:id/decision-log` | `tripsApi.getDecisionLog` |

### 3.2 顺序编排 / 决策引擎（P0 Mode 1）

| # | 方法 | 路径 |
|---|------|------|
| 7–12 | POST | `/decision/*` · `/decision-engine/v1/*` |
| 13 | POST | `/decision-engine/v1/repair-plan` |
| 14 | POST | `/v2/user/optimization/optimize` | `optimizationV2Api` |

### 3.3 价值协商

| # | 方法 | 路径 |
|---|------|------|
| 15–19 | POST | `/v2/user/optimization/negotiation` 等 |

### 3.4 准备度修复闭环

| # | 方法 | 路径 | 封装 |
|---|------|------|------|
| 20 | POST | `/readiness/repair-options` | `readinessApi` |
| 21 | POST | `/readiness/apply-repair` | `readinessApi` |
| 22 | GET | `/readiness/trip/:tripId/guardian-negotiation` | readiness API |

---

## 4. 响应抽取

```typescript
function extractGuardianPresentation(res: unknown): GuardianPersonaPresentation | undefined {
  // 见 src/lib/guardian-presentation.util.ts
}
```

**规划工作台**：`normalizeWorkbenchUiOutput(raw).presentation`  
**Planning Assistant（场景 2）**：`extractPlanningAssistantPresentation(chatResponse)` → `chatResponse.personaEvaluation.presentation`  
**Planning Assistant V2**：同上（`ChatResponse.personaEvaluation`）  
**Trip Planner**：`PlannerChatResponse.guardianPresentation`

---

## 5. 行中 Trip Planner

`PlannerChatResponse.guardianPresentation` — `expressionPhase: 'in_trip'` · `displayStyle: 'execution_brief'` 时由 `GuardianBriefBanner` 渲染；`personaInsights` 仅作渐进式补充（默认不展示三人卡片）。

---

## 6. 前端组件映射

| 组件 | 数据源 | 渲染 |
|------|--------|------|
| `GuardianDecisionCard` | `presentation` (design_advisory) | headline + narrative + actions |
| `GuardianBriefBanner` | `briefLines` | 行中顶部条 |
| `GuardianPresentationPanel` | `presentation` | 按 displayStyle 路由 |
| `GuardianAssistantBlock` | 助手消息 `guardianPresentation` | presentation + CHOOSE 写回 |
| `GuardianLegacyCitations` | `citations` | 无 presentation 或 committee 时专家引用 |
| `GuardianTimelineBadges` | decision-log `metadata` | revalidation / 主角 / 场景 |
| `GuardianNegotiationPanel` | repair-options / apply-repair | 单摘要 + stance 图标 |
| `PersonaCard` ×3 | `uiOutput.personas.*` | 仅无 presentation 或 committee 模式 |

---

## 7. 禁止事项

- ❌ 默认展示三人独立聊天气泡
- ❌ 硬约束提供「忽略并继续」
- ❌ 用 negotiation 投票结果覆盖 Abu BLOCK
- ❌ 前端自行重写 `leadSpeaker` 路由

---

## 8. 变更记录

| 日期 | 说明 |
|------|------|
| 2026-06-25 | P0/P1/P2 全量；前端 types / util / components / workbench & planner 接线 |
| 2026-06-25 | Planning Assistant / decision-log / CHOOSE / negotiation UI 补全 |
| 2026-06-25 | 架构收敛：CHOOSE→feedback 写回、hardConstraint 统一判定、decision-log 视图模型、GuardianPanel 废弃标记 |
| 2026-06-25 | `GuardianAssistantBlock` 统一助手 CHOOSE；TeamNegotiation 默认隐藏 utility |
| 2026-06-25 | `GuardianLegacyCitations` 接入 Planning/Journey 助手；decision-log 单测 + badges 复用 view model |
| 2026-06-25 | TeamNegotiation 硬约束 banner；DecisionTimeline enrich；legacy 审计矩阵 |
