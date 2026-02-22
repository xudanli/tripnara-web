# DSO / 编排 API 前端对接说明

本文档描述前端与 DSO（Decision State Object）、编排（Orchestration）相关 API 的对接方式，供前后端对齐使用。

---

## 1. Route and Run / 行程编排 API

**路径**: `POST /api/agent/route_and_run`（下划线，非连字符）

调用编排接口时，前端会收到以下字段：

| 字段 | 来源 | 用途 |
|------|------|------|
| `ui_state` | 由 DSO/OrchestratorState 派生 | 展示进度、当前步骤、状态 |
| `result.payload.orchestrationResult.state` | OrchestratorState（由 DSO 投影） | 当前步骤、行程、Gate 结果、决策日志 |
| `result.payload.orchestrationResult.decisionState` | DSO 原始对象 | RLHF、分析、调试（含 confidence、history、decisionMeta） |

### ui_state 结构

```typescript
// phase 完整枚举（参考 src/agent/interfaces/trip-plan.interface.ts）
type OrchestrationStep =
  | 'INTAKE'
  | 'STATE_UPDATE'
  | 'RESEARCH'
  | 'GATE_EVAL'
  | 'CONTEXT_BUILD'
  | 'PLAN_GEN'
  | 'OPTIMIZE'
  | 'VERIFY'
  | 'COMPLIANCE'
  | 'REPAIR'
  | 'NARRATE'
  | 'FEEDBACK'
  | 'DONE'
  | 'FAILED'
  | 'TIMEOUT'
  | 'HALLUCINATION_DETECTION';

// ui_status 完整枚举
type UIStatus =
  | 'thinking'
  | 'browsing'
  | 'verifying'
  | 'repairing'
  | 'awaiting_consent'
  | 'awaiting_confirmation'
  | 'awaiting_user_input'
  | 'done'
  | 'failed';

interface OrchestrationUiState {
  phase?: OrchestrationStep;
  ui_status?: UIStatus;
  progress_percent?: number;  // 0–100
  message?: string;
  requires_user_action?: boolean;
  current_step_detail?: string;  // 当前步骤详情，如「正在评估行程可行性...」
}
```

### orchestrationResult 结构

```typescript
interface OrchestrationResult {
  state?: any;           // OrchestratorState 投影
  itinerary?: any;       // 行程数据
  gate_result?: GateResult;
  decision_log?: DecisionLogEntry[];
  decisionState?: any;   // DSO 原始对象，用于 RLHF/分析/调试
}
```

### 前端使用

- **主流程 UI**：使用 `ui_state`（phase、progress_percent、message、current_step_detail）展示编排进度
- **决策日志**：优先使用 `orchestrationResult.decision_log`，其次 `explain.decision_log`（见下方 explain 结构说明）
- **Gate 结果**：使用 `orchestrationResult.gate_result` 展示评估结果
- **decisionState**：一般不在主流程 UI 中直接展示，用于 RLHF、分析和调试

---

## 2. Planning Workbench / 规划工作台

规划工作台会调用编排相关接口，同样依赖 `ui_state` 和 `orchestrationResult`，用于：

- 展示编排进度
- 展示当前步骤和状态
- 展示决策日志、Gate 结果等

### Planning Assistant V2 API（规划工作台独立接口）

**基础路径**: `/api/agent/planning-assistant/v2`

| 接口 | 路径 | 说明 |
|------|------|------|
| 对话 | `POST /api/agent/planning-assistant/v2/chat` | 规划助手对话 |
| 会话 | `POST /api/agent/planning-assistant/v2/sessions` | 创建会话 |
| 会话详情 | `GET /api/agent/planning-assistant/v2/sessions/:sessionId` | 获取会话状态 |

> **注意**：Planning Assistant V2 的 `phase`、`routing` 等与 route-and-run 的 `ui_state` 属于**不同数据流**。
>
> **规划工作台 vs 执行阶段**：规划工作台助手仅负责规划阶段，**不涉及**执行阶段 Agent（route_and_run）的编排进度。前端规划工作台场景下 `hideExecutionOrchestration=true`，不展示 `ui_state`/`orchestrationResult`。编排进度卡片（OrchestrationProgressCard）仅在 AgentChat（route_and_run）中展示。

---

## 3. Decision Draft / 决策草案

**路径**: `GET/POST/PATCH /api/decision-draft`

这里的 `DecisionState` 是**行程级决策完成度**（`src/trips/decision`），**不是** Kernel 的 DSO。

前端用于：决策工作台、决策步骤、解释、回放等。

| 概念 | 说明 |
|------|------|
| 决策草案 DecisionState | 行程级，用于可视化决策编排 |
| Kernel DSO decisionState | 编排内部状态，用于 RLHF/调试 |

---

## 4. Decision Replay / 决策回放

**路径**: `/api/v1/decision-replay` 或 `/api/decision-draft/:draftId/replay`

回放快照中的 `state` 来自编排过程，与 DSO 演化过程对应。

前端用于：时间线、快照详情、What-If 模拟等。

---

## 5. Trips Controller（行程状态）

**路径**: `GET /api/trips/:id/state`（需加 `/api` 前缀）

行程当前状态，数据来自编排/行程服务，与 DSO 演化后的行程状态一致。

---

## 6. 前端服务/场景对照表

| 前端服务/场景 | 是否用到 DSO 相关数据 | 使用方式 |
|--------------|----------------------|----------|
| 行程编排进度 UI | ✅ | 使用 `ui_state`（phase、progress、message 等） |
| 规划工作台 | ✅ | 使用编排结果中的 `state`、`decision_log` |
| RLHF / 分析 / 调试 | ✅ | 使用 `decisionState`（confidence、history、decisionMeta） |
| 决策草案工作台 | ⚠️ | 使用行程级 DecisionState，**不是** Kernel DSO |
| 决策回放 | ✅ | 快照中的 state 对应 DSO 演化过程 |

---

## 7. 验证 DSO 时前端关注点

- **主流程**：`ui_state` 和 `orchestrationResult` 是否按预期更新
- **decisionState**：更多用于 RLHF、分析和调试，一般不在主流程 UI 中直接展示

---

## 8. explain 字段结构

`RouteAndRunResponse` 顶层包含 `explain` 字段，用于决策日志的向后兼容：

```typescript
explain: {
  decision_log: DecisionLogEntry[] | DecisionLogItem[];  // 支持新旧两种格式
}
```

前端决策日志优先级：`result.payload.orchestrationResult.decision_log` > `explain.decision_log`。

---

## 9. 类型定义位置

### 前端项目（若前端在独立仓库）

前端需根据后端 DTO 自行定义类型，建议路径示例：`src/api/agent.ts`。

### 后端项目（参考后端 DTO）

若需参考后端类型定义，可参见：

| 类型 | 后端文件 |
|------|----------|
| RouteAndRun 请求/响应 DTO | `src/agent/dto/route-and-run.dto.ts` |
| OrchestrationStep / phase 枚举 | `src/agent/interfaces/trip-plan.interface.ts` |
| 编排相关接口 | `src/agent/interfaces/claude-orchestration.interface.ts` |
