# Agent 协作文档（TripNARA）

本文档与 `.claude/agents/Agent 编排者.md` 对齐，供产品、前端、集成与测试角色共用。**与运行时「智能体」实现无关**，描述的是人机协作分工与代码锚点。

---

## 1. 架构分层：Agent 为主，Decision 为辅

| 模式 | 入口 | 典型页面 | 前端职责 |
|------|------|----------|----------|
| **A（主路径）** | `POST /agent/route_and_run` → `agentApi.routeAndRun()`（`src/api/agent.ts`） | `/dashboard/agent`、行程侧边栏 Agent | 对话流、`ResultStatus` 处理、`explain.decision_log` / 证据展示 |
| **B（专家/工作台）** | `/decision-engine/v1/*` → `src/api/decision-engine.ts`，经 `src/api/decision-adapter.ts`（`VITE_USE_DECISION_ENGINE_V1`） | 规划工作台安全/节奏/约束控件、Debug 面板 | 从 `GET …/trips/:id` 等组装 State / worldContext |

**原则**：用户侧主界面**不提供**「必须先点的原子安全校验」作为默认路径；校验体现在 Agent 推理链与决策日志。工作台保留原子能力用于**对齐、质检与强制干预**。

---

## 2. 协商闭环（模式 A）

1. `routeAndRun` 返回 **`NEED_CONSENT`** / **`NEED_CONFIRMATION`**（`ResultStatus`，`src/api/agent.ts`）。
2. UI：`NegotiationDialog`（`src/components/agent/NegotiationDialog.tsx`）等。
3. 确认：`agentApi.confirmNegotiation` → `POST /agent/confirm_negotiation`。
4. 排障：请求携带 **`request_id`**（Header `X-Request-Id` 已在 `agent.ts` 配置）；`AgentChat.tsx` 含复制排障上下文逻辑。

---

## 3. Orchestrator 与 Agent 对话的关系

- **`PlanStudioOrchestrator`**（`src/services/orchestrator.ts`）：将结构化操作拼成 **`RouteAndRunRequest`** 并调用 **`routeAndRun`**，统一解析 **`REDIRECT_REQUIRED`**、**`NEED_CONFIRMATION`**、`decision_log`。
- **对话式 Agent UI**（如 `AgentChat.tsx`）：可直接调 **`agentApi.routeAndRun`**，不必经过 Orchestrator。

二者**后端唯一编排入口**仍为 **`route_and_run`**，勿引入第二条「用户编排 REST」叙事。

---

## 4. 角色分工（简表）

| 角色 | 主要职责 | 代码/文档锚点 |
|------|----------|----------------|
| **产品经理** | PRD、`route_and_run` 状态机、门控与预算口径 | `.claude/agents/产品经理.md` |
| **Agent UI 集成** | `AgentChat`、`NegotiationDialog`、协商与刷新 | `src/components/agent/` |
| **工作台前端** | Plan Studio、`decisionAdapter`、预算面板 | `src/pages/plan-studio/`、`PlanningWorkbenchTab.tsx` |
| **资深前端** | Axios 分层、`request_id`、错误码映射、最小 API 订阅 | `src/api/client.ts`、`src/api/agent.ts` |
| **协议与契约测试** | `routeAndRun`、`confirmNegotiation`、decision-engine v1 契约 | `src/api/*.ts` |

---

## 5. PRD 进度（Agent–Decision 协同专题）

已起草章节：**0.1**、**0.6**（对话内交付）。下一章建议：**0.7 关键流程**（`RouteType` + `ResultStatus` 全分支）。

---

## 6. 相关路径

- Agent API：`src/api/agent.ts`
- Decision Engine：`src/api/decision-engine.ts`、`src/api/decision-adapter.ts`
- 规划工作台 API：`src/api/planning-workbench.ts`
- 行程预算 API：`src/api/trips.ts`
- 项目架构：`HIKING-SYSTEM-ARCHITECTURE.md`（若存在）
- API 说明：`src/api/README.md`（若存在）
