# 前端集成指南（工作台 / Agent）

本文档汇总规划工作台与 `route_and_run` 的关键接入约定。细分主题见文末「相关文档」。

---

## 1. 单轮响应内绑定展示（必守）

**原则：** 同一轮 `POST /api/agent/route_and_run`（或未来 PA v2 透传后的 chat 响应）内，右侧 Agent 卡片的所有结构化展示必须来自 **当次** `result.payload`，勿混用数据源。

### 1.1 正确做法

```typescript
const payload = response.result.payload;

// 时间轴 + POI 卡片（同轮）
renderTimeline(payload.timeline);
renderPoiCards(payload.poi_cards);

// 可执行性（与 timeline 同源）
const gate = payload.orchestrationResult?.gate_result;
renderViolations(gate?.violations ?? []);
renderVerifyIssues(payload.safety_surface?.verify_issues ?? []);

// 可选：决策说明漂移
if (payload.workbench_display?.drift_detected) {
  toast(payload.workbench_display.drift_message_zh ?? '决策说明已按当前 Trip 草案更新');
}
```

**本仓库实现：**

| 能力 | 路径 |
|------|------|
| 单轮 bundle 抽取 | `src/lib/route-run-payload-display.ts` → `buildRouteRunPayloadDisplayBundle()` |
| 助手消息写入 | `src/components/agent/AgentChat.tsx`（成功 handler + consent 重试） |
| gate + verify 同源 | `src/lib/route-run-contract-extract.ts` → `extractVerifyIssuesFromSamePayload()` |
| 可执行性 UI | `src/components/agent/RouteRunContractLayers.tsx` |

每条助手 `Message` 独立挂载当轮的 `timelineDayBlocks`、`poiCardsByDay`、`orchestrationResult`、`safetySurface`；**改排 / 重新生成后用新 Message 覆盖展示，不要 merge 旧 orchestrationResult**。

### 1.2 禁止做法

```typescript
// ❌ 用库内最新 Trip 渲染右侧预览，却用上一轮 chat 的 gate
const days = await api.getTripDays(tripId);
const gate = session.lastChat.orchestrationResult.gate_result;

// ❌ 改排成功后仍展示上一轮 VERIFY / violations
setOrchestration(session.previousTurn.orchestrationResult);
```

| 场景 | 左侧正式行程（Schedule） | 右侧 Agent 预览 |
|------|--------------------------|-----------------|
| 改排 **草案**（ADVICE_ONLY） | 保持 DB 旧数据（不 `GET trip` 刷新） | **仅**当轮 `payload.timeline` / `poi_cards` |
| 改排 **AUTO 落库** | `onSystem2Response` → 重拉 Trip | 当轮 payload + toast「已更新正式行程」 |
| 全量重新规划 OK | 可刷新 Trip | 当轮 payload 全量替换 |

---

## 2. ITINERARY_ADJUST（单日改排）

改排能力在 **`route_and_run`**；规划工作台推荐直连此接口（字段最全）。PA v2 `/chat` 若未透传 `actionExecution` / `timeline` / `poi_cards`，改排仍应走 `route_and_run`。

### 2.1 请求

```http
POST /api/agent/route_and_run
```

```json
{
  "request_id": "...",
  "trip_id": "b950dbf2-...",
  "message": "帮我把第二天重新规划一下，现在明显不合理",
  "options": {
    "use_claude_orchestration": true,
    "use_state_machine_orchestration": true,
    "execution_mode": "ADVICE_ONLY"
  }
}
```

- **`trip_id` 必需**，绑定当前行程。
- 强修改意图用自然语言（「重新规划」「明显不合理」「帮我把第 N 天改了」）→ 可能 AUTO 落库。
- 商量式（「还能去哪」「有什么推荐」）→ 草案，不自动落库。

### 2.2 响应字段（`result.payload`）

| 字段 | 用途 |
|------|------|
| `itinerary_adjust_intake: true` | 进入改排 UI 模式 |
| `timeline` | 仅目标日日程（已裁剪） |
| `poi_cards` + `poi_cards_meta.itinerary_adjust_poi_scope_date` | 地图/侧栏只画这一天 |
| `result.answer_text` | 聊天气泡主文案 |
| `itinerary_adjust_result` | 改排结果卡（见 §3） |
| `actionExecution` | 落库闭环开关（见下表） |
| `iron_shield_ui_suppressed` / `decision_cockpit_ui_suppressed` | 为 true 时不展示决策驾驶舱、Iron Shield |
| `candidates` / `alternatives` | 改排场景通常为空，勿渲染 A/B 墙 |
| `orchestrationResult.state.metadata` | 调试：`itinerary_adjust_*` |
| `workbench_display.drift_detected` | 决策说明已按草案更新（toast） |

**`actionExecution` 结构：**

```typescript
type ActionExecution = {
  mode: 'ADVICE_ONLY' | 'SEMI_AUTO' | 'AUTO';
  status: 'NOT_STARTED' | 'PENDING_CONFIRM' | 'SUCCEEDED' | 'FAILED' | 'ROLLED_BACK';
  requires_confirmation_count?: number;
  itinerary_adjust_auto_apply?: {
    applied?: boolean;
    reason?: string;           // unresolved_places / execution_mode_advice_only 等
    deletedCount?: number;
    addedCount?: number;
    targetDateIso?: string;
  };
};
```

### 2.3 前端行为矩阵

| mode | status | auto_apply.applied | 前端行为 |
|------|--------|-------------------|----------|
| AUTO | SUCCEEDED | true | 已落库 → 重拉 Trip，无「应用」按钮 |
| ADVICE_ONLY | NOT_STARTED | false | 预览 timeline / poi_cards → 显示「应用到行程」 |
| AUTO | PENDING_CONFIRM | false | 同草案 |
| 任意 | — | reason: `unresolved_places` | 提示「部分地点无法写入」，保留草案 |

**草案「应用到行程」（v1）：** 无单独 apply HTTP；再次发送强确认话术「就把这个改动应用到行程里」触发后端 AUTO（置信度够则落库）。

**实现：**

- 解析：`src/lib/itinerary-adjust-response.ts`
- 结果卡：`src/components/agent/ItineraryAdjustResultCard.tsx`
- 主流程：`src/components/agent/AgentChat.tsx` → `MessageBubble`

### 2.4 改排 UI 布局

**要展示：**

- 单日 timeline（`payload.timeline.length === 1` 为常态）
- 与 `itinerary_adjust_poi_scope_date` 一致的 `poi_cards`
- `itinerary_adjust_result` 或 `answer_text` 中的完整优化说明
- 同轮 `gate_result.violations` + `safety_surface.verify_issues`（`RouteRunContractLayers`）

**要隐藏：**

- Iron Shield / 三人格决策卡 / 方案墙 / 全周未裁剪 POI
- 异步轮询 task 完成后仍走同一 handler，字段不变

---

## 3. 改排结果卡片：`payload.itinerary_adjust_result`

后端结构化优化说明；`answer_text` 亦优先使用 `optimization_summary_zh`。

```typescript
interface ItineraryAdjustResult {
  target_date_iso: string;
  target_day_number: number;
  execution_mode: 'ADVICE_ONLY' | 'AUTO';
  applied: boolean;
  status_label_zh: string;        // 「草案待确认」|「已更新行程」
  poi_names: string[];
  route_context_zh: string;       // 驾驶走廊约束说明
  optimization_summary_zh: string;  // 主描述（含 bullet）
  rationale_bullets_zh: string[];
  apply_hint_zh: string;            // 底部灰字，勿写死
  corridor_fallback_level: string;  // debug：baseline_50km 等
  apply_confirmation_lines: string[];  // 确认 diff 说明（优先展示，勿整段 draft_schedule_zh）
  draft_schedule_zh?: string;       // 后端完整草案；UI 勿整段重复
}
```

| UI 区域 | 数据源 |
|---------|--------|
| 角标 | `status_label_zh` |
| 标题「第 2 天 (2026-06-02)」 | `target_day_number` + `target_date_iso` |
| 正文 | `apply_confirmation_lines`（diff）；无则用 `optimization_summary_zh`；**勿**整段 `draft_schedule_zh` |
| 底部灰字 | `apply_hint_zh` |
| 「应用到行程」按钮 | `actionExecution.mode === 'AUTO' && applied` → 隐藏 |

```typescript
const adj = payload.itinerary_adjust_result;
if (adj) {
  card.badge = adj.status_label_zh;
  card.body = adj.optimization_summary_zh;
  card.footer = adj.apply_hint_zh;
}
```

有 `itinerary_adjust_result` 时：**不**再仅用 timeline POI 名 + 固定「优化草案…」footer；timeline 列表在气泡内可隐藏，由结果卡承载说明。

### 3.1 左侧时间轴（ScheduleTab）

改排 **待确认** 时：

- 使用当轮 `payload.timeline` + `itinerary_adjust_result` 写入 `PlanStudioContext.itineraryAdjustDraftPreview`
- **勿**为此单独 `GET Trip` 再拼 POI 总结
- 目标日卡片顶部展示 `ItineraryAdjustScheduleDayPreview`（草案条目 + `apply_confirmation_lines`）
- 下方 DB 正式行程半透明标注「当前正式行程（确认后将更新）」
- AUTO 落库或清除会话时 `clearItineraryAdjustDraftPreview()`

实现：`syncItineraryAdjustDraftToPlanStudio()`（`AgentChat` 成功 handler）→ `ScheduleTab` 读取 context。

---

## 4. 规划助手 v2 酒店检索（工作台）

工作台酒店意图走 **`POST /api/agent/planning-assistant/v2/chat`**，须传 `context.tripId` + `countryCode`。

详见：[前端集成指南 - 规划助手智能体](./前端集成指南-规划助手智能体.md)

**改排与 v2 缺口：** `ChatResponseDto` 若未透传 `actionExecution` / `timeline` / `poi_cards` / `itinerary_adjust_intake`，改排请继续用 `route_and_run`，或后端在 `convertRouteAndRunToChatResponse` 补字段。

---

## 5. 自测清单

| 场景 | 预期 |
|------|------|
| 「重新规划第二天…不合理」+ L0/L1 | AUTO + SUCCEEDED，reload 后 D2 变新 POI |
| 「第二天还能去哪」 | ADVICE_ONLY，草案条 +「应用到行程」 |
| 地图 pin | `poi_cards` 仅目标日 2～4 个 |
| AUTO 成功后 | 勿仍显示旧 D2；必须 GET trip |
| violations | 与当轮 `gate_result` / `safety_surface` 一致，非上一轮 |
| `drift_detected` | toast「决策说明已按当前 Trip 草案更新」 |
| 结果卡 | 含走廊约束文案，非仅 POI 名 |

---

## 6. 相关文档

| 文档 | 内容 |
|------|------|
| [route-and-run-ui-integration.md](./api/route-and-run-ui-integration.md) | `ui_surface`、咨询 Dashboard、POI、world_model_guards |
| [前端集成指南-规划助手智能体.md](./前端集成指南-规划助手智能体.md) | v2/chat 酒店、context、路由校验 |
| [planning-assistant-v2-chat-integration.md](./planning-assistant-v2-chat-integration.md) | PA v2 类型与 hook |
| [user-frontend-integration.md](./api/user-frontend-integration.md) | 用户端 API 总览 |

## 7. 代码索引（改排 + 单轮绑定）

| 能力 | 路径 |
|------|------|
| 改排解析 / 类型 | `src/lib/itinerary-adjust-response.ts` |
| 改排结果卡 | `src/components/agent/ItineraryAdjustResultCard.tsx` |
| 单轮 payload bundle | `src/lib/route-run-payload-display.ts` |
| 同轮 verify issues | `src/lib/route-run-contract-extract.ts` |
| Agent 主对话 | `src/components/agent/AgentChat.tsx` |
| 可执行性并列层 | `src/components/agent/RouteRunContractLayers.tsx` |
| 行程面板解析 | `src/lib/route-run-assistant-itinerary.ts` |
