# 规划工作台 · 编排行程 BFF 契约

> **版本**: 0.1.0  
> **Base**: `/api/trips/:tripId`  
> **状态**: 前端已落地编排行程页 · 部分接口已联调 · 部分待后端补齐  
> **关联 UI**: `PlanningWorkbenchArrangeItinerary`（`?tab=schedule&arrangeItinerary=1`）  
> **测试行程**: `3e4a1058-9218-467f-988a-c18008a14385`（冰岛）

**最后更新**: 2026-07-06

---

## 1. 页面结构（布局与内容）

编排行程页为三栏 + 顶栏，设计稿仅作布局参考，样式沿用现有工作台 token。

| 区域 | 内容 | 前端组件 |
|------|------|----------|
| 顶栏 | 日期范围、视图切换（自动编排 / 按天 / 时间轴 / 列表 / 地图）、地图联动开关 | `ArrangeItineraryToolbar` |
| 左栏 | 旅行目标、路线模式、路线概览统计、住宿节奏、成员偏好、待编排候选列表 | `ArrangeItineraryContextPanel` |
| 中栏 | 按天/时间轴/列表展示日程；每天底部「添加活动 / 插入空档 / 更多操作」 | `ArrangeItineraryTimelinePanel` + `WorkbenchDayDetailCard` |
| 右栏 | 路线地图预览、横向候选卡片、AI 助手（补全空档 / 优化路线 / 安排午餐 / 降低强度） | `ArrangeItineraryAssistantPanel` |

**入口**

- URL：`/plan-studio/:tripId?tab=schedule&arrangeItinerary=1`
- 工作台中栏「编排行程」按钮
- 探索景点「自动编排」成功后自动跳转

---

## 2. 已可用接口（前端已联调）

### 2.1 探索景点域 — `/api/trips/:tripId/attraction-explore`

| 方法 | 路径 | 用途 | 编排页使用点 |
|------|------|------|--------------|
| GET | `/context` | 主题/适合度/旅行条件/成员偏好 | 左栏配置区 |
| PATCH | `/context` | 持久化 `selectedFilters` | 与探索页共用 |
| GET | `/candidates` | 候选清单 + `summary` | 左栏待编排列表、右栏卡片 |
| POST | `/candidates` | 加入候选 | — |
| DELETE | `/candidates/:candidateId` | 移出候选 | 左栏 × 按钮 |
| PATCH | `/candidates` | 重排候选（priority + sortOrder） | **API 已有，UI 未接拖拽** |
| POST | `/auto-arrange` | 自动编排候选进日程 | 顶栏「自动编排」、探索页跳转 |
| POST | `/ai-consult` | AI 问答 | 右栏四个快捷动作（暂用 preset question） |
| GET | `/map` | POI 坐标 + 路线 polyline | 右栏地图预览（`viewTab=along_route`） |

**`GET /candidates` 响应关键字段**

```json
{
  "candidates": [
    {
      "id": "uuid",
      "attractionId": "string",
      "placeId": 123,
      "name": "塞里雅兰瀑布",
      "imageUrl": "https://...",
      "priority": "must_go | very_interested | alternative",
      "sortOrder": 0
    }
  ],
  "summary": {
    "attractionCount": 9,
    "estimatedDays": 8,
    "routeSpanKm": 975
  }
}
```

**`GET /map` 响应（BFF 原始 → 前端 normalizer）**

```json
{
  "pois": [
    {
      "id": "string",
      "name": "string",
      "coordinates": { "lat": 63.6, "lng": -19.9 },
      "kind": "candidate | recommended | route"
    }
  ],
  "routePolyline": [{ "lat": 63.4, "lng": -19.0 }]
}
```

前端 normalizer 映射为 `points[]`（`lat/lng` 扁平）与 `routePolyline`。

**`GET /context` 旅行条件（normalizer 已处理）**

- `travelConditions.origin` → `tripContext.departureLabel`
- `transport` / `pace` / `weather` → 对应 label 字段

---

### 2.2 日程时间轴 — `/api/trips/:tripId/schedule-timeline`

| 方法 | 路径 | 用途 | 编排页使用点 |
|------|------|------|--------------|
| GET | `/schedule-timeline` | 聚合 trip / days / items / metrics / travelInfo | 中栏时间轴、左栏驾驶/里程统计 |

**推荐 Query**

```
include=items,metrics,travelInfo
travelInfoMode=cached
```

**响应关键结构**（见 `src/types/schedule-timeline.ts`）

- `days[].itineraryItems[]` — 活动项（时间、类型、POI 名）
- `days[].travelInfo.segments[]` — 段间距离/时长（中栏 subtitle）
- `days[].metrics` — 当日驾驶等
- `metricsSummary` — 全程汇总（可选）

---

### 2.3 行程项 CRUD — `/api/trips/:tripId/itinerary-items`（及 item 级路由）

| 方法 | 路径 | 用途 | 编排页使用点 |
|------|------|------|--------------|
| GET | `/itinerary-items/:itemId` | 加载单项编辑 | 中栏点击编辑 |
| PATCH | `/itinerary-items/:itemId` | 更新时间与备注 | `EditItineraryItemDialog` |

---

## 3. 编排行程 BFF（已实现 · 前端已接入）

> TS Client: `src/api/arrange-itinerary.ts`  
> Types: `src/types/arrange-itinerary.ts`  
> Normalizer: `src/api/normalize-arrange-itinerary.ts`

### 3.0 PlanProposal 草案链路（P1 · 默认）

所有写入类操作默认 `commitMode: "proposal"`（前端 API 层自动注入）。

**推荐流程**

1. `POST` place / items / gaps / ai-actions / auto-arrange → 返回 `{ mode: "proposal", proposal, orchestrationState }`
2. 前端展示 `ArrangeItineraryProposalDialog`：`diff` + `validation.conflicts`
3. 用户确认 → `POST .../proposals/:id/apply`（带 `contextVersion`）
4. 刷新 `schedule-timeline`

**编排状态机**

```
GET /arrange-itinerary/orchestration-state
```

进入编排页时轮询；`AWAITING_CONFIRMATION` + `activeProposalId` 时自动拉取草案。

**草案管理**

| 方法 | 路径 |
|------|------|
| GET | `/arrange-itinerary/proposals` |
| GET | `/arrange-itinerary/proposals/:id` |
| POST | `/arrange-itinerary/proposals/:id/apply` |
| POST | `/arrange-itinerary/proposals/:id/discard` |

- `contextVersion` 不匹配 → `409 CONTEXT_STALE`（前端提示刷新）
- `validation.status === BLOCK` 且未 `force` → `400`（UI 提供「仍要应用」）

### 3.1 候选放入日程 ✅

```
POST /api/trips/:tripId/attraction-explore/candidates/:candidateId/place
```

- 左栏「排入」、右栏「拖入日程」、添加活动对话框（选候选）
- `dayIndex` **1-based**；前端 `selectedDayIndex + 1`
- 默认 `insertMode=append`、`removeFromCandidates=true`

### 3.2 添加活动 ✅

```
POST /api/trips/:tripId/arrange-itinerary/items
```

- 中栏「添加活动」→ 对话框选候选 + 时段 → 有 `candidateId` 时走 place，否则走 items

### 3.3 插入空档 ✅

```
POST /api/trips/:tripId/arrange-itinerary/gaps
```

- 中栏「插入空档」→ 对话框输入时段与说明

### 3.4 AI 编排动作 ✅

```
POST /api/trips/:tripId/arrange-itinerary/ai-actions
```

- 右栏四按钮；传 `action` + 当前天 `dayIndex`（1-based）

### 3.5 编排页概览 ✅

```
GET /api/trips/:tripId/arrange-itinerary/overview
```

- 左栏路线概览优先读 overview，失败时回退 schedule-timeline 计算

### 3.6 地图联动 ✅

```
GET /api/trips/:tripId/attraction-explore/map?viewTab=along_route&dayIndex=2&highlightItemId=...
```

- 顶栏「地图联动」开启时按选中天过滤；点击时间轴项传 `highlightItemId`
- `pois[].highlighted=true` 在右栏高亮

### 3.7 仍待 UI 接入

| 能力 | 接口 | 状态 |
|------|------|------|
| 候选拖拽排序 | `PATCH /attraction-explore/candidates` | API 有，UI 未接 |
| 拖拽放置 | `POST .../place` with `before/after` | 仅按钮触发 append |
| AI preview 应用 | `suggestedActions[].previewId` | 仅展示 answer |
| 更多操作 | — | toast 占位 |

### 3.8 智能编排深度（P2 · 前端已接入）

#### 智能规划开关

```
GET  /api/trips/:tripId/arrange-itinerary/planning-mode
POST /api/trips/:tripId/arrange-itinerary/planning-mode
```

**Body** `{ "mode": "manual | copilot" }`

| 模式 | 行为 |
|------|------|
| `manual` | 仅冲突提醒与局部建议；顶栏自动编排、右栏 AI 动作禁用 |
| `copilot` | 可生成草案、发现空档、提出修复建议（仍须确认写入） |

前端：`ArrangeItineraryToolbar` 模式切换；`useArrangeItinerary.copilotEnabled` 门控 AI / 自动编排 / 移动分析入口。

#### 行程项锁定分类

```
GET /api/trips/:tripId/arrange-itinerary/item-locks
```

返回 `lockedItems` / `semiLockedItems` / `mustVisitItems` / `movableItems`。编排 Agent 优化路线时跳过 locked / semi-locked。

**用户手动锁定**：写入 `trip.metadata.userLockedItemIds`（行程项 ID 数组），通过 `PATCH /trips/:tripId` 更新。

前端：左栏 `ArrangeItineraryItemLocksPanel` 汇总；时间轴项旁锁定按钮（`WorkbenchDayDetailCard`）。

#### 拖拽局部影响分析

```
POST /api/trips/:tripId/arrange-itinerary/items/:itemId/analyze-move
```

**Body** `{ "dayIndex": 2, "startTime": "15:30", "endTime": "17:00" }`（`dayIndex` **1-based**）

返回 `MOVE_ITEM` 类型的 `PlanProposal`，含 `tradeoffs` 与 `validation`。不直接改行程，走草案确认链路。

前端：时间轴「分析移动」→ `ArrangeItineraryMoveItemDialog` → proposal 对话框。

#### 探索推荐增强

| 能力 | 说明 |
|------|------|
| 评分公式 | 第一组 / 顺路组综合兴趣、路线、成员、可插入性、体验稀缺、天气、口碑 |
| `experience_gap` 第四组 | 基于当前行程体验覆盖缺口；左栏推荐区高亮 |
| 顺路绕路标识 | `meta.detourMinutes` → badge `绕路约 N 分钟` |

#### 候选加入预检

`POST /attraction-explore/candidates` 响应新增 `precheck`：

```json
{
  "precheck": {
    "feasible": true,
    "warnings": [{ "code": "must_go_exceeds_days", "message": "...", "severity": "warn" }]
  }
}
```

仅写入候选池，不修改时间轴。前端加入候选后以 toast 展示 `warnings`（`warn` / `error` 分级）。

### 3.9 意图编译 · 绕路成本 · 地图联动（P3 · 前端已接入）

#### 编译探索意图

```
POST /api/trips/:tripId/attraction-explore/explore-intent
```

**Body** `{ "query": "适合老人、沿黄金圈、停车方便的自然景点" }`

**Response** — `themes` / `suitableFor` / `maxDetourMinutes` / `weatherMode` / `routeContext` 等结构化条件。

`POST /search` 响应新增 `compiledIntent`，并自动合并到检索与评分。

前端：搜索时先 `explore-intent` 编译条件 → 展示 `AttractionExploreCompiledIntentBar` 芯片 → 刷新 `search`；`compiledIntent` 亦从 search 响应同步。

#### 边际绕路成本

顺路推荐与评分使用冰岛路况启发式（BFF `estimateIcelandCoordinateTravelTime`）：

```
绕路成本 = drive(A→X) + drive(X→B) - drive(A→B)
```

体现在 `meta.detourMinutes`、顺路 badge、候选 `precheck` 与地图 `insertHint`（前端展示，计算在后端）。

#### 地图插入草案

```
POST /api/trips/:tripId/attraction-explore/map/place-proposal
```

**Body** `{ "placeId": 381382, "dayIndex": 2, "candidateId": "optional-uuid" }`

**Response** — `suggestions[]`（最多 3 个插入位置）+ `proposal`（`PlanProposal` 草案）

```
GET .../attraction-explore/map?dayIndex=2&includeInsertHints=true
```

候选 POI 附带 `insertHint: { suggestedDayIndex, detourMinutes, startTime }`。

前端：探索页地图视图 / 编排页右栏地图预览展示 `insertHint`；「插入草案」→ 多建议时 `AttractionExploreMapPlaceSuggestionsDialog` → `ArrangeItineraryProposalDialog` 确认写入。

### 3.10 实时路由 · LLM 意图 · Copilot 建议（P4 · 前端已接入）

#### 实时路由绕路成本

默认冰岛路况启发式。启用 Google/SmartRoutes 后（后端 `ATTRACTION_EXPLORE_LIVE_ROUTES=1` 或 `ENABLE_GOOGLE_ROUTE_DETOUR=1`；前端 `VITE_ATTRACTION_EXPLORE_LIVE_ROUTES=1`）：

- 影响 `map/place-proposal`、`map?includeInsertHints=true`、候选 `precheck` 绕路估算
- 推荐/搜索可选 `useLiveRoutes=true`（query 或 body）对顺路分组使用实时 API
- `meta.detourMethod`：`iceland_heuristic` | `generic_driving` | `live_route_api`（卡片与 insertHint 展示）

前端：探索搜索栏「实时路况绕路」开关（仅 env 启用时可见）；`useAttractionExplore.useLiveRoutes` 透传各 API。

#### LLM 增强探索意图

```
POST /api/trips/:tripId/attraction-explore/explore-intent
Body: { "query": "...", "useLlm": true }
```

规则引擎优先；条件不足时合并 LLM。响应 `source: "rules" | "rules+llm"`。

`POST /search` 支持 `useLlmIntent: true`。

前端：搜索栏「LLM 增强意图」开关；`AttractionExploreCompiledIntentBar` 展示来源徽章。

#### Copilot 协同建议

```
GET /api/trips/:tripId/arrange-itinerary/copilot-suggestions
```

扫描待确认草案、未编排必去、高绕路候选、日程空档。`copilot` 模式下附带 `actionHint`（`place-proposal` / `fill_gaps` / `review_proposal` 等），不自动写入。

前端：`ArrangeItineraryCopilotSuggestionsPanel`（编排左栏）；`planning-mode=copilot` 时轮询；点击执行对应草案/AI 动作。

### 3.11 协同动作 · 工作台快照 · 候选联动（P5 · 前端已接入）

#### 规划工作台快照

```
GET /api/trips/:tripId/arrange-itinerary/planning-workbench-snapshot
```

聚合 `planning-mode`、`orchestration-state`、overview 指标、item-locks 统计、行程冲突数、top-5 copilot 建议、待确认草案数。

前端：`usePlanningWorkbenchSnapshot` 作为探索页 + 编排页共享轮询入口（编排中 2s，空闲 30s）；`useArrangeItinerary` 优先从快照读取 planningMode / orchestration / copilotSuggestions。

#### 执行协同动作

```
POST /api/trips/:tripId/arrange-itinerary/copilot-actions
```

| action | 行为 |
|--------|------|
| `draft_for_candidate` | 为指定候选生成地图插入 `PlanProposal` |
| `draft_all_must_go` | 为首个未编排必去候选生成草案 |
| `fill_gaps` | 调用 ai-actions 填补空档（proposal 模式） |
| `execute_suggestion` | 根据 `copilot-suggestions` 的 `suggestionId` 一键执行 |

仅 `copilot` 模式可用；若已有待确认草案返回 400。前端 `arrange.runCopilotAction` → 草案确认对话框。

#### 添加候选时的协同提示

`POST .../candidates` 在 copilot 模式下，`must_go` / `very_interested` 可附带 `copilotNextAction`。探索页 toast 提供「生成插入草案」快捷按钮，仍须 apply 写入。

### 3.12 住宿建议 · 地图住宿层 · Copilot 住宿（P2 · 前端已接入）

#### 接口分工（BFF 已实现）

| 端点 | 字段 | 用途 |
|------|------|------|
| `GET .../arrange-itinerary/planning-workbench-snapshot` | `lodgingSuggestions[]` | 左栏候选列表 |
| `GET .../attraction-explore/map` | 住宿 POI + `lodgingLegs[]` | 右栏地图 |

#### lodgingSuggestions（快照 · 扁平工作台项）

`planning-workbench-snapshot.lodgingSuggestions` 为**扁平数组**（按 `nightIndex` / `dayIndex` 分组后展示）：

```json
{
  "id": "lodging-rec-1-381119",
  "nightIndex": 1,
  "dayIndex": 1,
  "placeId": 381119,
  "name": "尼达鲁尔山屋",
  "kind": "current | alternative | recommended",
  "priority": "primary | alternative | recommended",
  "coordinates": { "lat": 64.73, "lng": -18.1 },
  "reason": "距 斯普伦吉桑杜尔 约 14.2 km",
  "meta": {
    "distanceFromAnchorKm": 14.16,
    "anchorPlaceName": "斯普伦吉桑杜尔",
    "driveMinutesEstimate": 17
  }
}
```

前端：`normalizeLodgingWorkbenchItem` → `groupLodgingWorkbenchItems` → 按晚聚合为 UI 用的 `ArrangeLodgingSuggestion[]`；并与 `lodgingCoverage` 合并补全各晚 `dateLabel` / 已订状态。

| kind | 含义 |
|------|------|
| `current` | 当晚已订住宿 |
| `recommended` | 主推候选（`priority: primary` 标为推荐） |
| `alternative` | 备选候选 |

#### 地图 — 住宿 POI + lodgingLegs

`GET .../attraction-explore/map` 响应扩展：

- `points[].kind`: `lodging`（已订）\| `lodging_suggestion`（候选）
- `lodgingLegs[]`:

```json
{
  "id": "lodging-leg-1-381119",
  "nightIndex": 1,
  "from": { "kind": "day_anchor", "placeId": 381388, "label": "斯普伦吉桑杜尔" },
  "to": { "kind": "suggested_lodging", "placeId": 381119, "label": "尼达鲁尔山屋" },
  "distanceKm": 14.16,
  "driveMinutesEstimate": 17,
  "kind": "approach | relocation"
}
```

前端右栏展示 `from.label → to.label` 与车程/距离；无 `polyline` 时仍渲染标签。

#### Copilot 住宿建议

`copilot-suggestions` 可返回 `kind: suggest_lodging_for_day`；BFF 未下发时前端按未补齐夜晚合成。点击「采纳」向 Nara 发送候选 `reason` + `driveMinutesEstimate`。

#### 左栏 UI

- `ArrangeItineraryLodgingSection`：每晚住宿进度（P0/P1）
- `ArrangeItineraryLodgingSuggestionsPanel`：BFF 扁平项聚合后的候选列表 + 采纳 CTA（P2）

---

## 4. 前端文件索引

| 文件 | 说明 |
|------|------|
| `src/api/arrange-itinerary.ts` | 编排 BFF API 客户端 |
| `src/api/normalize-arrange-itinerary.ts` | proposal / direct 响应归一化 |
| `src/types/arrange-itinerary.ts` | 请求/响应类型 |
| `src/components/.../ArrangeItineraryProposalDialog.tsx` | 草案确认 UI |
| `src/components/.../ArrangeItineraryMoveItemDialog.tsx` | P2 移动影响分析对话框 |
| `src/components/.../ArrangeItineraryItemLocksPanel.tsx` | P2 锁定分类汇总 |
| `src/components/.../AttractionExploreCompiledIntentBar.tsx` | P3 编译意图芯片 |
| `src/components/.../AttractionExploreMapPlaceSuggestionsDialog.tsx` | P3 地图插入位置选择 |
| `src/lib/attraction-explore-route-options.util.ts` | P4 实时路由开关与 detourMethod 文案 |
| `src/components/.../ArrangeItineraryCopilotSuggestionsPanel.tsx` | P4 Copilot 协同建议 |
| `src/components/.../ArrangeItineraryLodgingSuggestionsPanel.tsx` | P2 住宿 BFF 候选 |
| `src/api/normalize-arrange-itinerary-lodging.ts` | P2 lodgingSuggestions 归一化 |
| `src/lib/arrange-itinerary-lodging-suggestions.util.ts` | P2 住宿 bundle / 地图 / Copilot 合并 |
| `src/components/.../usePlanningWorkbenchSnapshot.ts` | P5 工作台快照轮询 |
| `src/components/plan-studio/workbench/arrange-itinerary/PlanningWorkbenchArrangeItinerary.tsx` | 三栏主容器 |
| `src/components/plan-studio/workbench/arrange-itinerary/useArrangeItinerary.ts` | 聚合 explore + schedule-timeline |
| `src/api/attraction-explore.ts` | 探索景点 API 客户端 |
| `src/api/normalize-attraction-explore.ts` | BFF → 前端字段适配 |
| `src/lib/workbench-mode-context.util.ts` | 子模式 `arrange_itinerary` |
| `src/pages/plan-studio/index.tsx` | URL `arrangeItinerary=1` 路由 |

---

## 5. 联调检查清单

- [x] 打开 `?arrangeItinerary=1` 左栏显示 context + candidates + overview
- [x] 中栏加载 `schedule-timeline` 各天活动
- [x] 顶栏「自动编排」调用 `POST /auto-arrange` 并刷新时间轴
- [x] 右栏地图 `GET /map?dayIndex=` 按天过滤
- [x] AI 四按钮 `POST /arrange-itinerary/ai-actions`
- [x] 候选 DELETE 后左栏/右栏同步减少
- [x] 写入操作返回 proposal 时弹出确认对话框
- [x] apply / discard 草案
- [x] orchestration-state 恢复待确认草案
- [x] 规划模式 manual / copilot 切换与 AI 门控
- [x] item-locks 展示 + 用户手动锁定（metadata.userLockedItemIds）
- [x] analyze-move → MOVE_ITEM 草案
- [x] experience_gap 推荐组 + 绕路 badge
- [x] 加入候选 precheck 警告 toast
- [x] explore-intent 编译 + compiledIntent 芯片展示
- [x] map includeInsertHints + insertHint 展示
- [x] map/place-proposal 插入草案（探索页 + 编排页）
- [x] LLM 增强意图 + compiledIntent source 展示
- [x] 实时路况绕路开关（env 启用时）+ detourMethod 展示
- [x] copilot-suggestions 左栏展示与 actionHint 执行
- [x] planning-workbench-snapshot 共享轮询
- [x] copilot-actions 协同动作 + 草案确认
- [x] 加入候选 copilotNextAction toast 快捷草案
- [x] 编排左栏「每晚住宿」进度 + 添加住宿 Sheet（P0/P1）
- [x] lodgingSuggestions BFF 归一化 + 左栏候选采纳（P2）
- [x] 地图 lodging / lodging_suggestion 点位与 lodgingLegs 预览（P2）
- [x] Copilot suggest_lodging_for_day 客户端合成与执行（P2）
- [ ] 拖拽候选 → place（before/after）
- [ ] PATCH 候选排序
- [ ] AI preview apply

---

## 6. 错误与 Mock

- Mock 仅当 `VITE_ATTRACTION_EXPLORE_MOCK=1`（默认关闭）
- 调试日志：`VITE_ATTRACTION_EXPLORE_DEBUG=1`
- axios 拦截器已透传 BFF `error.message`
