# 决策引擎 API - 研发实施方案

## 1. 文档信息

| 项目 | 内容 |
|------|------|
| 版本 | v1.0 |
| 创建日期 | 2026-02-22 |
| 状态 | 待评审 |
| 关联文档 | [决策引擎 PRD](./decision-engine-prd.md)、[DSO 编排说明](./dso-orchestration.md) |

---

## 2. 现状分析

### 2.1 接口现状

| 分类 | 路径 | 前端客户端 | 使用情况 |
|------|------|------------|----------|
| **新决策引擎** | `/api/decision-engine/v1/*` | `src/api/decision-engine.ts` | ❌ 未集成 |
| **旧决策 API** | `/decision/*` | `src/api/decision.ts` | ✅ 已集成 |

### 2.2 旧 API 实际调用点

| 页面/组件 | 接口 | 说明 |
|-----------|------|------|
| `src/pages/trips/decision.tsx` | validateSafety, adjustPacing, replaceNodes | 行程决策页，三人格手动操作 |
| `src/pages/plan-studio/PlanVariantsPage.tsx` | generateMultiplePlans | 方案变体生成 |
| `src/components/trips/NLChatInterface.tsx` | detectConflicts | 自然语言对话中的冲突检测 |
| `src/components/feedback/*` | getFeedbackStats, submit*Feedback | 反馈统计与提交 |

### 2.3 规划助手与决策引擎关系

- **规划助手 V2**：通过 `/api/agent/planning-assistant/v2/chat` 对话，编排由后端 route_and_run 完成
- **决策引擎**：Abu/Dr.Dre/Neptune 能力，由编排内部调用，前端不直接调用
- **OrchestrationProgressCard**：展示 Chat 返回的 `ui_state`、`orchestrationResult`，非决策引擎直连

### 2.4 接口差异（旧 vs 新）

| 能力 | 旧 API | 新决策引擎 | 备注 |
|------|--------|------------|------|
| 安全校验 | `/decision/validate-safety` | `/decision-engine/v1/validate-safety` | 请求体兼容 |
| 节奏调整 | `/decision/adjust-pacing` | `/decision-engine/v1/adjust-pacing` | 请求体兼容 |
| 节点替换 | `/decision/replace-nodes` | `/decision-engine/v1/replace-nodes` | 请求体兼容 |
| 约束检查 | `/decision/check-constraints-with-explanation` | `/decision-engine/v1/check-constraints` | 路径与响应结构不同 |
| 多方案生成 | `/decision/generate-multiple-plans` | `/decision-engine/v1/generate-multiple-plans` | 请求体需适配 |
| 冲突检测 | `/decision/detect-conflicts` | ❌ 无 | 需后端补充或保留旧接口 |
| 反馈接口 | `/decision/feedback/*` | ❌ 无 | 保留旧接口 |
| 生成计划 | ❌ 无 | `/decision-engine/v1/generate-plan` | 新增 |
| 修复计划 | ❌ 无 | `/decision-engine/v1/repair-plan` | 新增 |
| 决策解释 | ❌ 无 | `/decision-engine/v1/explain-plan` | 新增 |
| 健康检查 | ❌ 无 | `/decision-engine/v1/health` | 新增 |

---

## 3. 实施目标

1. **统一入口**：前端逐步迁移至决策引擎 API，作为决策能力主入口
2. **向后兼容**：迁移期间保留旧 API，通过配置或特性开关切换
3. **能力增强**：接入 generate-plan、repair-plan、explain-plan 等新能力
4. **规划助手联动**：在合适场景展示决策解释、编排进度等

---

## 4. 实施阶段

### Phase 1：后端就绪与联调准备（后端主导）

| 任务 | 负责人 | 产出 | 依赖 |
|------|--------|------|------|
| 决策引擎 P0 接口上线 | 后端 | Swagger 文档、联调环境 | PRD 定稿 |
| 确认 detect-conflicts、feedback 迁移策略 | 后端+产品 | 决策文档 | - |
| 提供 Mock/Stub 数据 | 后端 | 联调用例 | - |

**前端配合**：
- 使用 `decisionEngineApi.health()` 做连通性检查
- 准备适配层类型（见 Phase 2）

---

### Phase 2：前端适配层与迁移（前端主导）

#### 2.1 创建统一适配层

**文件**：`src/api/decision-adapter.ts`

```typescript
/**
 * 决策 API 适配层：支持新旧 API 切换
 * 通过 VITE_USE_DECISION_ENGINE_V1 环境变量控制
 */
import { decisionEngineApi } from './decision-engine';
import { decisionApi } from './decision';

const USE_V1 = import.meta.env.VITE_USE_DECISION_ENGINE_V1 === 'true';

export const decisionAdapter = {
  validateSafety: (data) => USE_V1 ? decisionEngineApi.validateSafety(adaptValidateRequest(data)) : decisionApi.validateSafety(data),
  adjustPacing: (data) => USE_V1 ? decisionEngineApi.adjustPacing(data) : decisionApi.adjustPacing(data),
  replaceNodes: (data) => USE_V1 ? decisionEngineApi.replaceNodes(data) : decisionApi.replaceNodes(data),
  checkConstraints: (data) => USE_V1 ? decisionEngineApi.checkConstraints(data) : decisionApi.checkConstraintsWithExplanation(data),
  generateMultiplePlans: (data) => USE_V1 ? decisionEngineApi.generateMultiplePlans(adaptMultiPlanRequest(data)) : decisionApi.generateMultiplePlans(data),
  // detectConflicts、feedback 暂保留走旧 API
  detectConflicts: decisionApi.detectConflicts,
  ...feedbackMethods,
};
```

**适配要点**：
- `check-constraints`：新 API 返回 `feasible/violations/infeasibilityExplanation`，旧 API 返回 `isValid/violations/infeasibilityExplanation`，需在适配层做字段映射
- `generate-multiple-plans`：新 API 请求体含 `state/constraints/count`，旧 API 为 `state/constraints`，需补充 `count` 默认值

#### 2.2 迁移调用点

| 优先级 | 页面/组件 | 改动 | 风险 |
|--------|-----------|------|------|
| P0 | `decision.tsx` | `decisionApi` → `decisionAdapter` | 低 |
| P0 | `PlanVariantsPage.tsx` | `decisionApi` → `decisionAdapter` | 中（需验证 constraints 映射） |
| P1 | `NLChatInterface.tsx` | 保持 `decisionApi.detectConflicts`（新 API 无此接口） | - |
| P1 | 反馈组件 | 保持 `decisionApi`（新 API 无反馈接口） | - |

---

### Phase 3：新能力接入

#### 3.1 生成计划（generate-plan）

**场景**：规划工作台「一键生成行程」、规划助手快捷操作

**接入点候选**：
- `src/pages/plan-studio/OptimizeTab.tsx`：已有「生成可执行计划」按钮，可对接 `generatePlan`
- `src/components/planning-assistant-v2/QuickActions.tsx`：快捷操作可增加「生成行程」入口

**数据流**：
```
用户点击 → decisionEngineApi.generatePlan({ tripId, state }) 
         → 展示 plan + log（OrchestrationProgressCard 或专用卡片）
```

#### 3.2 修复计划（repair-plan）

**场景**：天气/闭馆等变化时，行程详情页或规划工作台提供「智能修复」

**接入点候选**：
- 行程详情页 `src/pages/trips/[id].tsx`：当检测到天气/闭馆告警时，展示「修复计划」按钮
- 规划工作台侧边栏：在 Gate 状态为 REPAIR 时，提供手动触发修复

**数据流**：
```
触发条件（天气更新/闭馆）→ decisionEngineApi.repairPlan({ tripId, state, plan, trigger })
                        → 展示 changedSlotIds、更新后的 plan
```

#### 3.3 决策解释（explain-plan）

**场景**：方案对比、决策日志、规划助手回复中的「为什么这样排」

**接入点候选**：
- `PlanVariantsComparison`：每个方案卡片增加「解释」展开，调用 `explainPlan`
- `OrchestrationProgressCard`：当有 `decision_log` 时，可调用 `explainPlan` 获取结构化解释
- `MessageBubble`：当消息类型为 plan 时，展示 whyThisPlan、slots、violations

**数据流**：
```
plan + log + violations → decisionEngineApi.explainPlan(...)
                        → 渲染 summary、whyThisPlan、slots、violations
```

---

### Phase 4：规划助手与决策引擎联动

| 能力 | 实现方式 | 优先级 |
|------|----------|--------|
| 编排进度 | 已有 OrchestrationProgressCard，使用 Chat 返回的 ui_state | ✅ 已实现 |
| 决策解释 | Chat 返回 plan 时，可选调用 explain-plan 丰富展示 | P1 |
| 生成计划 | QuickActions 增加「生成行程」→ 调用 generate-plan 或通过 Chat 意图路由 | P2 |
| 修复计划 | 当 Chat 返回 repair 建议时，提供「应用修复」按钮 | P2 |

---

## 5. 技术方案细节

### 5.1 类型兼容

- 决策引擎类型：`src/types/decision-engine.ts`（已创建）
- 旧类型：`strategy.ts`、`constraints.ts` 中的 `ValidateSafetyRequest` 等
- 适配层需做请求/响应转换，避免业务组件大改

### 5.2 错误码处理

PRD 错误码：4001/4002/4003/5001/5002。前端需：
- 在 `apiClient` 或适配层统一解析 `error.code`
- 对 4002（行程不存在）做友好提示并引导刷新
- 对 5002（依赖不可用）展示「服务暂时不可用，请稍后重试」

### 5.3 特性开关

```env
# .env.development / .env.local
VITE_USE_DECISION_ENGINE_V1=false   # 默认 false，联调时改为 true
```

---

## 6. 排期与里程碑

| 阶段 | 内容 | 预计工期 | 里程碑 |
|------|------|----------|--------|
| Phase 1 | 后端 P0 接口、联调环境 | 2 天 | 决策引擎可调通 |
| Phase 2 | 前端适配层、decision/PlanVariants 迁移 | 1.5 天 | 可切换新旧 API |
| Phase 3 | generate-plan、repair-plan、explain-plan 接入 | 2 天 | 新能力上线 |
| Phase 4 | 规划助手联动优化 | 1 天 | 体验闭环 |

**总工期**：约 6.5 人天（可按并行调整）

---

## 7. 风险与依赖

| 风险 | 缓解措施 |
|------|----------|
| 新 API 与旧 API 响应结构不一致 | 适配层做字段映射，单测覆盖 |
| detect-conflicts、feedback 无新接口 | 保留旧 API 调用，待后端补充 |
| 规划助手 Chat 与决策引擎数据格式不统一 | 明确 Chat 返回的 plan/log 与 explain-plan 入参的对应关系 |

---

## 8. 验收标准

- [ ] 通过 `VITE_USE_DECISION_ENGINE_V1=true` 可完整走通决策流程（安全校验、节奏调整、节点替换）
- [ ] PlanVariantsPage 使用新 API 生成多方案无回归
- [ ] 至少一个场景接入 generate-plan 或 explain-plan
- [ ] 决策引擎 health 接口在设置页或监控中可查
