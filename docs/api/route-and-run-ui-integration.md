# `route_and_run` 响应 → 前端接入与版面（与后端字段对齐）

本文说明：**如何按 `result.payload` 分流**、**咨询类 Dashboard**、**规划类 POI / 编排**，以及与现有实现的对应文件。  
HTTP：`POST /api/agent/route_and_run`；类型入口：`src/api/agent.ts` → `RouteAndRunResponse`。

详细调试字段对照另见：[route-and-run-debug-ui-field-map.md](./route-and-run-debug-ui-field-map.md)。

---

## 1. 先分流：`ui_surface`

| `result.payload.ui_surface` | 含义 | 前端怎么做 |
|-----------------------------|------|------------|
| **`planning`** | 行程规划 / 改日程 | 时间轴 + POI 卡片（`poi_cards_by_day` / `timeline`）+ 可选地图；完成态勿套用「纯咨询」话术。 |
| **`consultation`** | 咨询 / 检索 | **不要**当成「日程已成功」；后端可能清空 `timeline` / `itinerary.days`。用 **`consultation_dashboard` + `answer_text`**。 |

**实现要点（`AgentChat` → `MessageBubble`）：**

- `ui_surface === 'consultation'` 时 **`suppressConsultationItineraryCards`**：默认**不展示**行程类大块（`timeline` / `poi_cards_by_day` / orchestration 日程预览），避免咨询气泡里冒出整张行程表。
- 若同包附带 **`consultation_dashboard`**（且解析有效），渲染 **`ConsultationDashboard`**；长文 **`result.answer_text`** 默认放在折叠区「顾问全文」，与 Dashboard 分离。
- 无 `ui_surface` 时靠 `task_type` / `route_policy` 推断 `interactionKind`（规划 vs 检索等），用于状态条文案；**以后端显式 `ui_surface` 为准**。

---

## 2. 咨询类 Dashboard：`payload.consultation_dashboard`

后端挂在 **`result.payload.consultation_dashboard`**（可选 **`dashboard_origin === 'fallback'`**，表示快捷操作生成的结构化摘要，非完整模型一轮输出）。

解析：`src/lib/consultation-dashboard.ts` → `parseConsultationDashboard()`。  
展示：`src/components/agent/ConsultationDashboard.tsx`。

| 字段 | 展示建议 | 当前前端 |
|------|-----------|----------|
| `headline` / `subheadline` | 顶部 Hero，一行结论 | Hero 区块 |
| `dashboard_origin` | `fallback` 时弱化 Hero + 提示条 | 已实现：提示「结构化摘要由快捷操作生成…」 |
| `score_dimensions[]` | 横向评分条或标签；`level` → 配色 | 评分条 + Badge |
| `summary_cards[]` | 2×2 或横向滑动；`tone` → warning/danger 边框 | 响应式网格 |
| `risks[]` | 风险列表 + Badge | 卡片列表 |
| `daily_plan[]` | 左侧时间线 + `segments` | 按天时间轴 |
| `budget` | 环形图 / 条形；`breakdown[].share` | Recharts 环形 + 图例 |
| `booking_deadlines[]` | 截止卡片 + CTA | 列表 + 外链按钮 |
| `map.nodes` / `map.path_coordinates` | Mapbox：点标注、线 | `VITE_MAPBOX_ACCESS_TOKEN` 有则地图；无则占位说明 |
| `primary_cta_label` | 主按钮文案 | 主按钮；优先联动 **`suggested_operations`** 里 **`kind === 'route_and_run_message'`** 的第一条（见下） |

**底部按钮区：`payload.suggested_operations[]`**

- 组件：`SuggestedOperationsBar`（`src/components/agent/SuggestedOperationsBar.tsx`）。
- **`kind === 'route_and_run_message'`**：再次 **`POST route_and_run`**，`body.message` 用 `payload.message`，`trip_id` 白名单合并（见 `sanitizeRouteRunTripId` / 服务端约定）。
- **`kind === 'client_navigation'`**：前端路由到 `payload.route`（如 timeline / planning 等）。

**长文：`result.answer_text`（Markdown）**

- 与 Dashboard 同时存在时：**默认折叠**，折叠标题「顾问全文（详细解读）」，内用 `AssistantMarkdown`。

**推荐纵向顺序（与 `ConsultationDashboard` 实现一致）：**

1. Hero（`headline` / `subheadline`）  
2. `score_dimensions`  
3. `summary_cards`  
4. `map`（若有坐标或节点）  
5. `risks`  
6. `daily_plan`  
7. `budget`  
8. `booking_deadlines`  
9. `primary_cta_label`（组件内）  
10. **气泡更下方**：`SuggestedOperationsBar`（由 `AgentChat` 统一挂载）  
11. **`answer_text`**（折叠 Markdown）

---

## 3. 规划类：POI 卡片 + 本体规则

数据来源：**`payload.poi_cards`** 或 **`payload.poi_cards_by_day`**（按天更易做「日报」）。

- 解析：`src/lib/agent-poi-payload.ts`。  
- 列表 UI：`src/components/agent/PoiCardsByDayPanel.tsx`。

每张卡常见字段：`display_name`、`lat`/`lng`、`tags`、`ontologyRules`（JSON）、**`resolved_from_place_registry`**（是否命中 Place 库）、**`matched_from`**（`place_id` · `place_uuid` · `place_google_id` · `name_exact` · `itinerary_only`）。命中库时主标题以 Place 登记为准（`display_name` ≈ nameCN ‖ nameEN）。

**集成建议：**

- 在卡片正文或「更多信息」折叠里 **渲染 `ontologyRules`**（可先约定一层 Schema：限行 / F-road / 季节等枚举 vs 自由 JSON，由产品定）。
- **不要**把 `ontologyRules` 塞进地图几何层，除非另有几何字段/API 约定。

**现状：** `ontology_rules` / `ontologyRules` 已写入 **`AgentPoiCard.ontologyRules`**，卡片内折叠 **「本体规则与限制」**（JSON 友好展示）。

---

## 4. 规划类：`segment` + 道路编号（`action_plan`）

路径（若存在）：**`payload.orchestrationResult.itinerary.action_plan`**。

**过滤：** 仅 **`action_input.physical_domain` 存在**的项参与「路段级」展示（与后端语义一致）。

| 概念 | 用途 |
|------|------|
| `segment_id` | 详情里展示「关联路段 ID」，或与地图路段几何联动（需另有 geometry API）。 |
| `enter_at` | 进入该路段的参考时刻。 |
| `action_input.froad_check_hints.road_ids`（如 `["F208"]`） | 路段 **徽章**；可与租车车型/风险提示联动。 |

**`payload.actionExecutionPreview`**

- 用于「拦截 + 一键修复」类 UI：`src/components/agent/ActionExecutionPreviewPanel.tsx`。  
- 编排侧组装与 `action_plan` 补丁：`src/lib/route-run-action-execution.ts`。

**与 POI 对齐：** 用 **`target_ref === poi_cards[].itinerary_item_id`**（或行程 item id）把卡片上的点与同一条 physical action 对齐（当日条目或 POI 详情抽屉）。

**现状：** `src/lib/agent-physical-segments.ts` 对含 **`physical_domain`** 的 `action_plan` 行：优先 **`action_input.spatial_projection.poi_card_match_keys`**（与 `itinerary_item_id`、`place_id` 交集中命中则挂上），否则回退 **`target_ref === itinerary_item_id`**。另导出 **`collectPoiCardMatchKeys(item)`**、**`physicalActionLinksToCard(action, card)`** 与后端/单测对齐。编排侧 **`normalizePhysicalActionTargets`（enrich 末尾）** 为后端责任，用于补全 `target_ref` / `poi_card_match_keys`。

---

## 5. 推荐页面结构（产品文档对齐）

### [咨询 `consultation`]

1. Hero（`consultation_dashboard.headline`）  
2. `summary_cards` 网格（代码中在 `score_dimensions` 之后）  
3. `map`  
4. `risks`  
5. `daily_plan` 时间轴  
6. `budget`  
7. `booking_deadlines`  
8. `suggested_operations` 按钮行  
9. `answer_text`（折叠 Markdown）

### [规划 `planning`]

1. 可选：顶部 readiness / 摘要（按业务）  
2. **`payload.timeline`** → `TimelineItineraryPreview` / 编排预览  
3. **`poi_cards_by_day`** → `PoiCardsByDayPanel`  
4. 展开某日 / POI 详情时：若有对应 **segment / F-road hints**，显示在当日条或抽屉（依赖 §4 对齐）

---

## 6. 请求侧：`conversation_context` 与记忆分工

实现：`src/lib/agent-route-and-run-context.ts`（`buildRouteAndRunConversationContext` / `buildRecentMessagesForRouteAndRun`）。

| 能力 | 做法 |
|------|------|
| **多轮对话** | 每轮 `message` = 当前输入；`recent_messages` = 去重后的历史（`dedupeConsecutiveRecentMessages`：连续相同 role+content 只保留一条）+ 本轮用户句（与 history 末条重复则不重复 append）；助手长文截断。 |
| **体能档位** | 问卷完成后在 `preference_profile` 带 `fitness_level` + `party_profile.fitness_level`（`MEDIUM_LOW`→`low`，见 `fitness-route-and-run.ts`）；仍依赖 `user_id` Hydrator。 |
| **Plan Studio** | 有 `trip_id` 时固定 `context_type: active_trip_summary` + `timezone`；勿把 `page_url` 放进 `conversation_context`（调试快照 `debugBundle` 仅本地复制用）。 |
| **本轮意图 / 传感器** | 租车车型、酒店、航班等启发式 **只读 `request.message`（本轮用户原话）**，见 `src/lib/route-run-intent-heuristics.ts`；**禁止**用 `recent_messages` 拼接串做 `looksLikeCarRentalSearchRequest` 等。 |
| **长期偏好 / 行程事实** | 依赖 **`user_id` + `trip_id`**；有绑定行程时传 **`conversation_context.context_type: active_trip_summary`**（及可选 `structured_travel_input` 日期目的地），由后端记忆层 / 行程洞察注入，**不靠**聊天串替代。 |
| **NL 建行程** | **`trips` 侧 `nl-conversation` session API** + `NLConversationContext`（`nl_conversation_session`），与 agent `route_and_run` **分开**，勿混 sessionId。 |
| **UI 气泡持久化** | `agent-chat-history-v1`（localStorage，按 `tripId` 分桶）仅恢复展示；与 `recent_messages` 条数上限可不同（UI 20 条 / 请求 10 条）。 |

---

## 7. 请求侧其他提醒

| 项 | 说明 |
|----|------|
| **`trip_id`** | 咨询「一键操作」、上下文摘要常依赖合法 UUID；占位符会在发送前剔除，见 `AgentChat` 注释与 `sanitizeRouteRunTripId`。 |
| **`options.max_seconds`** | 酒店 / MCP / 长文场景建议 **≥ 60s**；前端在租车通道、酒店话术命中、或 `enable_live_tools` 含 hotel 时下发 **`CONFIG.API.ROUTE_AND_RUN_SENSOR_MAX_SECONDS`（当前 90）**，见 `src/constants/config.ts`。 |
| **检索模式** | 通常 **`DATA_LOOKUP`**（`options.intent_mode`）与 **`consultation` + `consultation_dashboard`** 同屏出现；以前端入口与后端约定为准。 |

---

## 8. `explain.world_model_guards`（段编辑器门控）

每次 `POST /agent/route_and_run` 编排成功（`result.status === OK`）后，前端从 **`explain.world_model_guards`** 写入全局 store，作为段结构编辑的唯一门控真源（**不必**解析 DSO checkpoint，除非做决策回放/调试）。

| 能力 | 路径 |
|------|------|
| 类型与 `applyRouteAndRunToStore` | `src/lib/world-model-guards.ts`、`src/types/world-model-guards.ts` |
| Zustand store | `src/store/worldModelGuardsStore.ts` |
| 统一写入（OK 终态） | `src/lib/handleRouteAndRunResponse.ts`、异步轮询 `src/lib/sync-planning-task-store.ts` |
| 规划工作台 Banner | `src/components/planning/PlanningBanner.tsx`、`src/pages/plan-studio/index.tsx` |
| 日程 Tab 结构编辑拦截 | `src/pages/plan-studio/ScheduleTab.tsx` |

`segment_editor_mode`：`full`（拖段/增删 POI）| `slot_timing_only`（仅时间）| `readonly`（只读草案）。  
行程体仍读 `payload.timeline` / `orchestrationResult.itinerary`。

---

## 9. `explain.optimization`（决策闭环，只读辅助）

完整接入档位与联调见 **[decision-closure-explain-frontend.md](./decision-closure-explain-frontend.md)**。

**非门控真源**；与 `world_model_guards` 并列，用于展示「用了哪种优化器 / 选了哪套方案 / 为何否决备选」。

### 8.1 响应形状（对外 API 均为 snake_case）

```json
{
  "explain": {
    "optimization": {
      "method": "CGUS",
      "decision_verdict_narration_zh": "**推荐方案：** `plan-base` …",
      "world_constraint_materialization": {
        "applied_events": 2,
        "road_ids": ["F206"],
        "weather_dates": [],
        "store_version": 3
      },
      "decision_verdict": {
        "chosen_plan_id": "plan-a",
        "rejected_plans": [
          {
            "id": "plan-b",
            "status": "infeasible",
            "rejection_reasons": ["HARD:TIME_SLACK degree=1"]
          }
        ],
        "monte_carlo_summary": { "used": true, "total_samples": 400 }
      }
    }
  }
}
```

| 字段 | 何时有值 |
|------|----------|
| `decision_verdict_narration_zh` | 编排走 OPTIMIZE 且 CGUS/Kernel 写出 optimizationHints（规划类 `route_and_run`） |
| `world_constraint_materialization.applied_events` | 同上，且 RAG 证据链命中（**条数**，非事件数组）；staging/prod 默认开 |
| `method` | 同上；轻量问答未走 OPTIMIZE 时整段 `explain.optimization` 可能为空 |

**联调**：须带 `trip_id` 走完整 SM（PLAN_GEN → OPTIMIZE → NARRATE），**重新打一轮**完整规划；DEDUP/旧缓存回放可能没有上述字段。正文里也可能出现相同叙述（`answer_text` / narration），结构化 UI 仍应读 `explain.optimization`。

### 8.2 前端调用示例

每次 `POST /api/agent/route_and_run` 编排 **OK** 后，`applyRouteAndRunToStore` 会写入 store；也可直接从响应读取：

```ts
import type { RouteAndRunResponse } from '@/api/agent';
import {
  formatWorldConstraintBannerZh,
  pickRouteRunExplainOptimizationForMessage,
} from '@/lib/route-run-optimization-explain';

function onRouteRunOk(response: RouteAndRunResponse) {
  const opt = pickRouteRunExplainOptimizationForMessage(response, {
    uiSurface: response.result?.payload?.ui_surface,
    status: response.result?.status,
  });
  if (opt?.decision_verdict_narration_zh) {
    // OptimizationExplainBlock：折叠 Markdown
  }
  const banner = formatWorldConstraintBannerZh(opt?.world_constraint_materialization);
  if (banner) {
    // WorldConstraintBanner：已纳入 N 条路况/公告约束（F206…）
  }
}

// 2) React 订阅（规划工作台 Banner 旁已展示 method）
function PlanStudioOptimizationHint() {
  const { explainOptimization, optimizationMethod } = useWorldModelGuards();
  const rejected = explainOptimization?.decision_verdict?.rejected_plans ?? [];
  // 可与 CandidatesPanel / 方案对比卡的 alternative_id 对齐高亮
  return (
    <>
      {optimizationMethod ? <p>优化方式：{optimizationMethod}</p> : null}
      {rejected.map((p) => (
        <p key={p.id}>
          方案 {p.id} 未采用（{p.status}）：{(p.rejection_reasons ?? []).join('；')}
        </p>
      ))}
    </>
  );
}
```

类型：`src/types/world-model-guards.ts`（`RouteRunExplainOptimization`、`RouteRunDecisionVerdict`）。

### 8.3 前端 UI（按优先级）

| 优先级 | 条件 | 组件 / 位置 |
|--------|------|-------------|
| P0 | `decision_verdict_narration_zh` | `OptimizationExplainBlock` 折叠区 Markdown（`AgentChat` 规划面） |
| P1 | `decision_verdict` | 同块内表格：选中 / 弃选 / 不可行标红；`monte_carlo_summary` →「后台约 N 次抽样后推荐」 |
| P2 | `world_constraint_materialization.applied_events > 0`（数字条数） | `WorldConstraintBanner`（`AgentChat` + `plan-studio`） |
| P2 | `alternatives[].violations` | `CandidatesPanel` 行内 HARD/SOFT Badge |

无 `decision_verdict_narration_zh` 且无 verdict 表数据时，气泡仍只靠 `answer_text`（与既有逻辑一致）。

### 8.4 BFF 约定

- **透传**：BFF 代理 `route_and_run` 时不要裁剪 `explain.optimization` 子字段；前端类型与解析仅认 **snake_case**（如 `applied_events` 为 number，不是 `appliedEvents` 数组）。
- **不写回**：裁决结果只读展示，**不要**把 `decision_verdict` 写进 `trip` / `itinerary-items` PATCH；用户改行程仍走 `world_model_guards` 门控 + 常规 CRUD。
- **与协商分流**：`result.payload.negotiation_payload` 为「待用户选方案」；`explain.optimization` 为「编排已自动裁决」——二者可能同屏出现，UI 应分区展示。

---

## 10. ITINERARY_ADJUST 与单轮 payload 绑定

**完整说明（改排请求/响应、结果卡、`actionExecution` 矩阵、自测）：**  
→ **[FRONTEND_INTEGRATION_GUIDE.md](../FRONTEND_INTEGRATION_GUIDE.md)** §2–§3、§1。

**本仓库要点：**

- 单轮抽取：`buildRouteRunPayloadDisplayBundle()`（`src/lib/route-run-payload-display.ts`）
- 改排：`parseItineraryAdjustPayload()`、`ItineraryAdjustResultCard`
- 禁止：GET trip 天数 + 上一轮 `orchestrationResult.gate_result` 混搭

---

## 11. 相关代码索引

| 能力 | 路径 |
|------|------|
| `conversation_context` / `recent_messages` | `src/lib/agent-route-and-run-context.ts` |
| 体能 `fitness_level` / `party_profile` | `src/lib/fitness-route-and-run.ts` |
| 主对话气泡 / 分流 / Dashboard / POI / 快捷操作 | `src/components/agent/AgentChat.tsx` |
| 咨询 Dashboard | `src/components/agent/ConsultationDashboard.tsx` |
| POI 按天卡片 | `src/components/agent/PoiCardsByDayPanel.tsx` |
| 快捷操作栏 | `src/components/agent/SuggestedOperationsBar.tsx` |
| 物理执行预览 | `src/components/agent/ActionExecutionPreviewPanel.tsx` |
| `consultation_dashboard` 解析 | `src/lib/consultation-dashboard.ts` |
| 单轮 payload / drift toast | `src/lib/route-run-payload-display.ts` |
| ITINERARY_ADJUST | `src/lib/itinerary-adjust-response.ts`、`ItineraryAdjustResultCard.tsx` |
| 同轮 gate + verify | `src/lib/route-run-contract-extract.ts` → `extractVerifyIssuesFromSamePayload` |
| 可执行性并列层 | `src/components/agent/RouteRunContractLayers.tsx` |
| `live_sensor_audit` 两行 hint | `src/lib/live-sensor-audit-hint.ts` + `LiveSensorAuditBlock`（`AgentChat.tsx`） |
| **集成总览** | [FRONTEND_INTEGRATION_GUIDE.md](../FRONTEND_INTEGRATION_GUIDE.md) |
