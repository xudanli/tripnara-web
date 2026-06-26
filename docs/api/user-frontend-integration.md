# 用户前端 API 对接清单

面向「能用、能规划、能看行程」的 **C 端 / 规划工作台**，走 **业务 BFF + Agent 主链路**。  
不要直接接智能体内部治理、Context Engine 运维、管理端接口。

代码入口：`src/api/*`（经 `src/api/client.ts` 统一前缀 `/api`）。

---

## 1. 必接（核心）

| 模块 | BFF 路径 | 前端封装 | 用途 |
|------|-----------|----------|------|
| 认证 | `POST /api/auth/*`（Google / 邮箱、`refresh`、`logout`） | `src/api/auth.ts` | 登录态 |
| 用户 | `GET/PUT /api/users/profile`、`/preferences` | `src/api/user.ts` | 资料与偏好 |
| **Decision DNA consent** | `GET/PUT /api/users/me/decision-dna/consent` | `src/api/decision-dna.ts` | 隐式学习 opt-in（设置 → 数据 Tab） |
| 行程 | `GET/POST/PUT/DELETE /api/trips/*`、`/days`、`/share`、`/clone` | `src/api/trips.ts`、`trip-detail.ts` | 行程 CRUD |
| 行程项 | `/api/itinerary-items/*` | `trips.ts` / `itinerary-items` 相关 | 天 / 活动编辑 |
| **智能规划主入口** | **`POST /api/agent/route_and_run`** | **`src/api/agent.ts`** | 对话规划、改行程、出 itinerary |
| 执行状态（长任务） | `GET /api/agent/status/:runId` 或 202 + 轮询 `task` | `agent.ts`、`executeRouteAndRun.ts` | 异步编排进度 |

### `route_and_run` 要点（用户端）

- **请求**：在 body 里带业务字段即可，例如 `trip_id`、`message`、`options`、`conversation_context` / `itinerary_context`（与后端 DTO 对齐），**不是**去调 `POST /context/build`。
- **响应**（以编排结果为准，勿解析 DSO checkpoint 做门控）：
  - 行程展示：`result.payload.timeline` ?? `result.payload.orchestrationResult.itinerary`
  - **段编辑器门控真源**：`explain.world_model_guards`（每次 OK 覆盖 store，见 `src/lib/world-model-guards.ts`）
  - 辅助：`explain.optimization`（`method`、`recommended_alternative_id`、`decision_verdict` 等，见 `route-and-run-ui-integration.md` §8）、`result.answer_text`、澄清 `payload.clarificationQuestions`
- **分发**：`src/lib/handleRouteAndRunResponse.ts`、`src/lib/executeRouteAndRun.ts`
- **UI 文档**：`docs/api/route-and-run-ui-integration.md`

---

## 2. 常用扩展（按产品开关）

| 模块 | BFF 示例 | 前端封装 | 用途 |
|------|-----------|----------|------|
| 规划工作台 | `/api/planning-workbench/*` | `src/api/planning-workbench.ts` | 会话式规划骨架；**不带** `world_model_guards`，以 Agent 编排为准 |
| 规划 / 行程助手 | `/api/agent/planning-assistant/*`、`journey-assistant/*` | `planning-assistant-v2`、`assistant.ts`、`trip-planner.ts` | 专项对话、MCP 能力 |
| 地点 / 国家 / 交通 | `/api/places/*`、`/countries/*`、`/cities/*`、`/transport/*` | `places.ts`、`countries.ts`、`cities.ts`、`transport.ts` | 选点、路线 |
| RAG 用户能力 | `/api/rag/search`、`retrieve`、`chat/*`、`destination-insights` 等 | `src/api/rag.ts` | 问答、洞察 |
| 行程优化（用户侧） | `POST /api/itinerary-optimization/optimize` | `src/api/itinerary-optimization.ts` | 日程顺序优化（与 `freeze_route_selection` 门控配合） |
| 准备度 / 审批 | `readiness`、`approvals` 等 | `readiness.ts`、`approvals.ts` | 规划工作台健康度、挂起审批 |
| **可执行性 / 行中守护** | `GET /trips/:id/feasibility-report`、`POST .../validate`、`POST .../validate-scope`、`GET .../issues/:id/repair-options`、`POST .../preview-repair`、`POST .../apply-repair`、`GET .../in-trip/execution-advisory` | `trip-constraint-solver.ts`、`feasibility-repair.ts` | 行前报告 + 逐 issue 修复（legacy 路径） |
| **Loop 决策闭环（P0 主路径）** | `POST/GET /trips/:id/loops/readiness-repair*`、`POST .../:loopRunId/apply`；行中 `in-trip-recovery*`、`apply-in-trip` | `trip-loops.ts`、`components/trip-loop/*` | 验证 → 提议 → 批准 → 写库；见 [trip-loops-frontend.md](./trip-loops-frontend.md) |
| 证据 / 安全面 | 随 `route_and_run` payload | `safety-surface-payload.ts` 等 | 展示，非独立治理 API |

### Decision DNA 隐式学习（Sprint 1–5）

- **默认关闭**：`implicit_learning: false`，未 opt-in 时不从回滚行为聚合学习
- **设置页**：`/dashboard/settings?tab=data` → `DecisionDnaConsentPanel`
- **轻提示**：行程 revision 回滚 / 协作任务回滚成功后，若未开启则 toast 引导（14 天 snooze）
- **类型**：`DecisionDnaConsentStatus` · `src/types/decision-os.ts`

---

## 2.1 C 端弃用（勿再作为主路径）

| 弃用 | 替代 |
|------|------|
| `GET /readiness/trip/:tripId/score` | `GET …/feasibility-report` |
| `POST /readiness/repair-options` | `GET …/issues/:issueId/repair-options` |
| `POST /readiness/auto-repair` | `POST …/apply-repair` 或 Loop `POST …/loops/:id/apply` |
| `POST /readiness/refresh-evidence` | `POST …/feasibility-report/validate`（内聚 refresh） |

`readiness.ts` 仍保留 404 回退；新功能请走 `trip-constraint-solver` / `trip-loops`。

---

## 3. 用户前端不要接

| 路径族 | 原因 | 本仓库现状 |
|--------|------|------------|
| `/api/context/admin/*` | Context 监控，后台用 | 未在用户页暴露 |
| `/api/context/build`、`compress` 等 | Agent 编排内自动构建 | ⚠️ `plan-studio/PlanningWorkbenchTab` 仍直连（已传 `userId` + `includePrivate: true`）；`NLChatInterface` 无 tripId 时不传私密字段。**建议收敛**至 `route_and_run` / `planning-workbench`，详见 [context-api.md](./context-api.md) |
| `/api/admin/*` | 管理端（策略实验室、Saga、质检） | 独立管理路由，勿进 C 端 |
| `/api/agent/actions/decision-rules/side-effect-params/*` | 决策规则运维 | 勿接 |
| `/api/llm/usage`、`/api/llm/cost` | Token / 成本治理 | 管理页用 |
| `/api/training/*`、`/api/agent/admin/*` | 训练与 Agent 运维 | 勿接 |
| `decision-draft/admin/*` | 草案运维 | `decision-draft-admin.ts` 仅管理场景 |

用户触发规划后，后端在内部完成 `CONTEXT_BUILD`、Context Package 等；**管理页 Context 列表不会自动有数据**，除非走运维链路。

---

## 4. 响应格式（常见）

| 类型 | 形状 | 处理 |
|------|------|------|
| 多数业务 API | `{ success, data, error? }` | `src/api/client.ts` → `handleResponse` |
| `route_and_run` | 整包 `RouteAndRunResponse`（含 `route`、`result`、`explain`、`observability`） | `agent.ts`；异步 202 再轮询同结构 |
| 澄清 / 协商 | `result.status` + `payload` 分流 | `handleRouteAndRunResponse` |

---

## 5. 与本仓库 UI 的对应关系（简图）

```mermaid
flowchart TB
  subgraph user_ui [用户前端]
    PS[规划工作台 ScheduleTab]
    AC[AgentChat / GlobalCommandBar]
    TR[trips CRUD]
  end
  subgraph must [必接 BFF]
    RAR[POST /agent/route_and_run]
    TRIP[/trips + /itinerary-items]
    AUTH[/auth + /users]
  end
  subgraph optional [按功能]
    WB[/planning-workbench]
    RAG[/rag/*]
    OPT[/itinerary-optimization]
  end
  subgraph no [不要接]
    CTX[/context/build 直连]
    ADM[/admin/*]
  end
  PS --> TRIP
  PS --> RAR
  AC --> RAR
  TR --> TRIP
  RAR --> explain_guards[explain.world_model_guards]
  PS -.-> WB
  PS -.-> OPT
  AC -.-> RAG
```

---

## 6. 相关文件索引

| 能力 | 路径 |
|------|------|
| Agent 类型与 `route_and_run` | `src/api/agent.ts` |
| 统一执行 + 轮询 | `src/lib/executeRouteAndRun.ts` |
| 门控 store | `src/store/worldModelGuardsStore.ts` |
| 规划工作台日程 | `src/pages/plan-studio/ScheduleTab.tsx` |
| route_and_run UI | `docs/api/route-and-run-ui-integration.md` |
| Decision DNA / 信任面类型 | `src/types/decision-os.ts` |
| Context build（遗留直连） | `docs/api/context-api.md` |
| 约束求解器双阶段读模型 | `docs/api/trip-constraint-solver-read-models-api.md` |
| Loop Engineering 前端对接 | `docs/api/trip-loops-frontend.md` |
| **集成总览（改排 / 单轮 payload）** | [FRONTEND_INTEGRATION_GUIDE.md](../FRONTEND_INTEGRATION_GUIDE.md) |
