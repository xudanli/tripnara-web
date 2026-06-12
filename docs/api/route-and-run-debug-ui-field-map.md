# `POST /api/agent/route_and_run` → Agent 调试 UI 字段活点地图

用于前后端联调：对照 Network 响应 JSON 与 **AgentChat（debug）** 四个折叠块。

- **HTTP 路径**：`POST /agent/route_and_run`（全局前缀 **`/api`**，即 Network 上常为 `/api/agent/route_and_run`）。
- **前端 TS 类型入口**：`src/api/agent.ts` → **`RouteAndRunResponse`**。
- **后端契约**：以后端 `RouteAndRunResponseDto` / `RouterOutputDto` 为准；不一致时以 **实际 Network JSON** 迭代类型。

---

## 1. 路由信息块 · `RouteInfoCard`

| UI 展示项 | JSON 路径 | 后端类型 / 说明 |
|-----------|-----------|-----------------|
| 路由类型文案（系统 API / 知识检索 / 深度推理 / 网页浏览） | `route.route` | `RouteType`：`SYSTEM1_API` \| `SYSTEM1_RAG` \| `SYSTEM2_REASONING` \| `SYSTEM2_WEBBROWSE`。Label 由前端映射。 |
| 快慢路径标签（可选） | `route.selected_path` | 如 **`FAST`** \| **`DEEP`**；**缺省时前端不展示该行**（后端可按 `route` 推导后下发）。 |
| 置信度进度条 | `route.confidence` | `number`（0–1），如 `0.8` → UI **80%**。 |
| 耗时 | `observability.latency_ms` | 端到端延迟（ms）。 |
| Token 消耗 | `observability.tokens_est` | 部分分支曾为 **0 占位**；以 assembler 填充为准。 |
| 成本估算 | `observability.cost_est_usd` | 可与编排侧成本对齐；部分分支为 **0**。 |
| 缓存回放 vs 实时计算 | **`observability.is_replayed`**（`boolean`） | 与 **`orchestration_mode_final === 'DEDUP'`** 对齐；前端用 **`isRouteRunCacheReplay(response)`**（`src/api/agent.ts`）合并为单一布尔 **`Message.isCacheReplay`**，绑路由折叠卡「计算来源」与 Debug 行。 |
| 编排最终模式 | `result.payload.orchestrationResult.orchestration_mode_final`（或 payload / `state` 嵌套） | 详见 **`getRouteRunOrchestrationModeFinal`**；**`DEDUP`** 与 **`is_replayed`** 同为回放语义。 |

**扩展 · `RouterOutputDto`**：`reasons`、`required_capabilities`、`consent_required`、`budget`（执行预算）、`ui_hint` — 可按需扩展 `RouteInfoCard`。

**`ObservabilityMetrics` 可选扩展字段（前端类型已预留）**：`is_replayed`、`step_latency_ms`、`gate_block_rate`、`skill_success_rate`、`orchestration_request_id`、`current_step`、`poi_planning`、`trace` 等 — 未全部绑定 UI 时可对照 Network。

---

## 2. 决策日志块 · `DecisionLogCard`

| UI 含义 | JSON 路径 | 说明 |
|---------|-----------|------|
| 整条时间轴 | `explain.decision_log` | `DecisionLogEntry[]` 及历史兼容形态；前端可用 `normalizeToNewFormat` 兼容。 |

**新格式（推荐）单条 `DecisionLogEntry`：**

| 常见 UI 标签来源 | JSON 路径 |
|------------------|-----------|
| 阶段（编排步） | `step` · `OrchestrationStep`：`INTAKE` \| `RESEARCH` \| `GATE_EVAL` \| `PLAN_GEN` \| `VERIFY` \| `REPAIR` \| `NARRATE` \| `DONE` \| `FAILED` 等 |
| 执行者 | `actor` · `SubAgentType` |
| 智能体气泡 HTML | `result.answer_html` 或 `payload.clarification_display.body_html`（澄清优先）；回落 `ui_state.current_step_detail_html`；短文案 `ui_state.current_step_detail` |
| 澄清选项 | `payload.clarificationQuestions[].options`（`ClarificationQuestionRouter`） |
| 澄清卡正文 | `clarificationQuestions[0].question_html`（勿再渲染 `question` / `clarificationMessage` 全文） |
| 去重开关 | `clarification_meta.suppress_chat_prose === true` 时气泡仅 `answer_html`/`answer_text` 短句 |
| 输入/输出摘要 | `inputs_summary` / `outputs_summary`（BFF 出站 `sanitizeDecisionLogForClientDisplay` 已洗为用户向中文；前端 `DecisionLogCard` **主文案仅**绑定此二字段） |
| 按天明细（PLAN_GEN） | `metadata.plan_gen_day_digest[]`（`day_number` / `date_iso` / 当日 `outputs_summary` / `inputs_summary`；旧日志出站时可由 BFF 仅补日期；前端会从同条 `outputs_summary` 解析「第 N 天(日期)：…」回填，**无摘要的天不展示**） |
| 证据引用 | `evidence_refs[]` |
| 耗时、工具调用等 | `metadata.duration_ms`、`metadata.tool_calls` 等 |

**旧格式**：以后端实际 payload 为准。

---

## 3. 证据卡块 · `IronShieldEvidenceCards`

| UI 区域 | JSON 路径 | 说明 |
|---------|-----------|------|
| 顶部徽章 | `result.payload.evidence_bundle.verification_status` | **`VERIFIED`** \| **`PARTIALLY_VERIFIED`** \| **`PARTIAL`** \| **`STALE`** \| **`UNVERIFIED`** \| **`FAILED`** 等。**FAILED = 后端判定验证未通过，≠ 前端崩溃。** |
| 失败原因码 | `result.payload.evidence_bundle.failure_reason_codes[]` | 可与文案模板对齐。 |
| 逻辑链条 | `result.payload.evidence_bundle.reasoning_chain`（若运行时存在） | DTO 未声明时可开放结构；建议单独约定。 |
| 审计层证据条目 | `result.payload.decision_metadata.evidence_cards[]` | |
| 展示层证据 UI | `result.payload.ui_display.evidence_cards_ui[]` | |

**语义对齐**：`FAILED` 时应由 **`failure_reason_codes` + 可读说明**（及可选 **`reasoning_chain`**）解释「方案不可行 / 约束冲突」。

---

## 4. 进度 / 状态块 · `OrchestrationProgressCard`

| UI 展示项 | JSON 路径 | 说明 |
|-----------|-----------|------|
| 标题阶段中文标签 | `ui_state.phase` | 前端 `ORCHESTRATION_PHASE_LABELS` 映射。 |
| 进度百分比 | `ui_state.progress_percent` | 缺省且 `phase === 'DONE'` 时前端可兜底 **100**（产品约定）。 |
| 说明文案 | `ui_state.message` 或 `ui_state.current_step_detail` | |
| 预计剩余时间 | `ui_state.estimated_time_remaining_ms` | 可选（ms）。 |
| **步骤列表（优先）** | **`ui_state.steps[]`** | `step_id`、`step_name`、`skill_name`、`action_name`、`success`、`duration_ms` — **有则渲染步骤条，无则仅展示进度/Gate**。 |
| Gate 评估区 | `result.payload.orchestrationResult.gate_result` | `reason` / `result` / `warnings[]` |

**注意**：与 **`observability.trace.steps`** / **`orchestrationResult` 内步骤** 择一对齐，避免重复展示。

---

## 5. 请求侧：`conversation_context` · 行程摘要

| 字段 | 说明 |
|------|------|
| `conversation_context.context_type` | 行程侧注入 **`active_trip_summary`** 时，请求需带 **`trip_id`**。 |
| 前端行为 | `AgentChat`：`routeContextType` 优先；否则 **`attachActiveTripSummaryContext`** 为 true 且有 `activeTripId` 时自动设 `active_trip_summary`。 |

---

## 6. Decision Replay 会话列表（JWT）

- **GET** `/api/v1/decision-replay/sessions`，可选 query **`trip_id`**。
- 响应 **`sessions`** 与 **`items`** 内容一致，**任取其一**。
- 前端封装：`agentApi.getDecisionReplaySessions`（`src/api/agent.ts`），`Authorization` 由全局 `apiClient` 注入。

---

## 7. 开发调试：浏览器 Console

在 **`import.meta.env.DEV`** 下，`AgentChat` 于 **`routeAndRun`** 成功（含授权重试）后打印 **`[Agent Response]`** 完整对象。

---

## 8. 联调备忘

| 现象 | 建议 |
|------|------|
| Token / Cost 长期为 0 | 查 assembler / 编排分支是否写入 `observability`。 |
| `verification_status === FAILED` | 后端补齐 **`failure_reason_codes`** 与用户可读说明。 |
| UI 与 Network 不同步 | 扩展 **`RouteDecision` / `OrchestrationUiState`** 与组件绑定（见 `src/api/agent.ts`）。 |

---

## 9. `failure_reason_codes` → 前端产品语义（AgentChat）

**权威枚举、排序、Intake 映射、与 `result.status` 组合**：以后端仓库 **`docs/api/failure-reason-codes.md`** 为准（常量实现：`failure-reason-codes.constants.ts`）。前端 **`agent-route-and-run-debug-ui-field-map.md`**（若在后端）与之交叉引用。

前端聚合：**`explain.failure_reason_codes`** ∪ **`result.payload.evidence_bundle.failure_reason_codes`**（见 `collectFailureReasonCodes`、`getAgentReasoningState`，`src/lib/agent-reasoning-state.ts`）。数组顺序以后端 **`sortFailureReasonCodes`** 为准；前端按 **分组优先级** 解析（与后端三层一致）：

| 分层 | 后端信号（示例） | UI 气质 | 交互策略 |
|------|------------------|---------|----------|
| 安全/合规 | **`SECURITY_RISK`**、**`POLICY_VIOLATION`**、**`DRIVE_SAFETY_VIOLATED`** | Error | 完整 Iron Shield + **`FAILED`** 字面徽章 |
| 规则/可行性（兜底） | **`VERIFICATION_FAILED_UNSPECIFIED`** | Error | 红色硬拒绝（避免「FAILED 且无码」真空窗） |
| 规则/可行性（可协商） | **`UNSUPPORTED_CONSTRAINT`**、**`PT_TRANSFER_GAP_VIOLATION`** | Warning | **展开**证据卡、amber 高亮；**「约束冲突」**替代吓人 **`FAILED`** 字面 |
| 槽位/澄清 | **`MISSING_DESTINATION`**、**`TIME_GAP`**（及可能出现的 **`MISSING_DATES`**） | Info | **不渲染** Iron Shield；引导条（日期/目的地文案分流） |

**说明**：若响应中 **同时存在** 多组码，以后端排序后的 **语义优先级** 为准；前端实现顺序为：**Critical → VERIFICATION_FAILED_UNSPECIFIED → 约束告警 → 澄清 → 其余**。开发者仍可通过 **`explain.decision_log`** 与 Network JSON 精确定位 C1 规则。

---

## 修订记录

- 合并后端 DTO、`selected_path`、`ui_state.steps`、`conversation_context`、`Decision Replay` 说明；与前端实现交叉校验。
- 补充 **`failure_reason_codes`** 产品映射与 `AgentReasoningState` 行为说明。
