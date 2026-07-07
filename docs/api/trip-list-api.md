# 行程列表页 · 后端接口契约

> **版本**: 1.2.0  
> **Base**: `/api`  
> **状态**: 后端 `GET /trips/list` 已实现 · 前端 `tripsApi.getListPage` 已对接 · 卡片优先读 `listSummary`  
> **关联 UI**: `src/pages/trips/index.tsx`、`src/components/trips/list/*`  
> **关联文档**: [trip-detail-tabs-api.md](./trip-detail-tabs-api.md)（详情页 Tab 接口）、[trip-decision-profiling-api.md](./trip-decision-profiling-api.md)

**最后更新**: 2026-07-07

---

## 1. 页面结构与数据需求

行程列表页由两块 UI 组成：

| UI 区块 | 组件 | 当前数据来源 | 目标真源 |
|---------|------|--------------|----------|
| 行程卡片网格 | `TripListCard` | `GET /trips/list`（404 降级 `GET /trips`）+ `metadata` | **`listSummary` 嵌套字段** |
| 创建新行程 | `TripListCreateCard` | 纯前端，无接口 | — |

> **2026-07-07**：「需要你处理」横幅（`TripListNeedsAttention`）已从列表页移除，`urgentTasks` 相关接口**当前不需要**。

**原则**：卡片上的进度、可行性、冲突数、待确认数、封面、成员、旅行中快照等**展示文案与数值由 BFF 投影**；前端禁止在列表页拼装「AI 建议」或使用硬编码占位数值（如 62%、76）。

---

## 2. 接口总览

| 优先级 | 接口 | 状态 | 说明 |
|--------|------|------|------|
| **P0** | `GET /trips` | ✅ 已对接 | 列表主数据；BFF 404 时降级 |
| **P0** | `GET /countries` | ✅ 已对接 | ISO 码 → 中文名、货币 |
| **P0** | `GET /trips/:id` | ✅ 已对接 | 点击卡片前校验规划可用性 |
| **P1** | `GET /trips/list` | ✅ 已对接 | BFF：`listSummary` + `destinationLabel` / `currency` / `planningAvailability` |
| **P2** | 天气 API | ⚠️ 前端独立调 | 旅行中卡片「天气」列；可后续并入 `listSummary.traveling` |

**前端调用链**：`tripsApi.getListPage(query?)` → `GET /trips/list`（404 时降级 `GET /trips`）。响应经 `normalizeTripListPageResponse` 归一化（`TRAVELING` → `IN_PROGRESS`、`poi_itinerary` → `poi_timeline`）。

---

## 2.1 后端实现索引（TripListService）

| 模块 | 路径 | 说明 |
|------|------|------|
| 列表 BFF | `src/trips/services/trip-list.service.ts` | 轻量查询（TripDay + `_count`，不含完整 ItineraryItem） |
| 投影规则 | `src/trips/utils/trip-list-bff.projection.util.ts` | `displayStatus` / `feasibilityLabel` / `primaryAction` 等 |
| 类型 SSOT | `src/trips/dto/frontend-trip-list-api.types.ts` | 与前端 `src/types/trip-list.ts` 对齐 |

**实现要点**

- 批量加载国家档案 → `destinationLabel`、`currency`
- 批量加载协作者 → `memberAvatars`
- 每卡并行 `PlanningConflictsService.loadArtifactsFast()` → `hardConflictCount` / `pendingConfirmCount` / `feasibilityScore`
- 单卡 `listSummary` 失败时降级读 `metadata`，不阻塞整列表
- `tripContentMode`：`poi_itinerary` → 前端归一化为 `poi_timeline`
- Query `status` 支持 `TRAVELING`，后端映射为 `IN_PROGRESS`

---

## 3. 接口方案

### 3.1 方案 A（推荐）：列表 BFF 单接口

```
GET /trips/list
```

一次返回带 `listSummary` 的卡片列表，替代前端从 `metadata` 猜测指标。

**Query**

| 参数 | 类型 | 说明 |
|------|------|------|
| `limit` | number | 分页条数，默认 50 |
| `offset` | number | 偏移，默认 0 |
| `status` | string | 可选，逗号分隔：`PLANNING,IN_PROGRESS,...` |
| `includeCancelled` | boolean | 是否包含已取消，默认 true（排末尾） |

**Response 200**

```typescript
interface TripListPageResponse {
  trips: TripListCardDto[];
  total: number;
}
```

### 3.2 方案 B（过渡）：扩展现有 `GET /trips`

在现有 `TripListItem[]` 上增加 **`listSummary`** 嵌套对象；或先在 `metadata` 写入兼容键（见 §5.2）。

可选单卡刷新：

```
GET /trips/:tripId/list-summary   // 单卡强制重算（P2）
```

过渡期前端已兼容：优先读 `listSummary`，缺失时读 `metadata.*`（见 §6）。

---

## 4. 主接口定义

### 4.1 `GET /trips/list`（推荐 BFF）

#### Response 结构

```typescript
/** 卡片读模型 */
interface TripListCardDto {
  // —— 现有 TripListItem 基础字段 ——
  id: string;
  name?: string;
  destination: string;          // ISO 国家码，如 IS
  destinationLabel?: string;      // 中文名，如「冰岛」
  startDate: string;              // ISO 8601
  endDate: string;
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  totalBudget: number;
  currency?: string;              // 如 CNY、ISK
  days: Array<{ id: string; date: string }>;
  createdAt: string;
  updatedAt: string;

  /** 规划可用性（与详情页 resolveTripPlanningAvailability 对齐） */
  planningAvailability?: 'collecting_info' | 'ready_to_generate' | 'generating' | 'ready' | 'failed';
  generatingItems?: boolean;
  tripContentMode?: 'poi_timeline' | 'hiking_primary' | 'skeleton_only';
  metadata?: Record<string, unknown>;

  /** 列表专用摘要（BFF 投影，禁止前端重算） */
  listSummary: TripListSummaryDto;
}

interface TripListSummaryDto {
  /** UI 展示态（可与 status 不同，如 PLANNING + 14 天内 → pre_trip） */
  displayStatus: 'planning' | 'pre_trip' | 'traveling' | 'completed' | 'cancelled';
  displayStatusLabel: string;     // 规划中 / 行前准备 / 旅行中 / 已完成 / 已取消

  coverImageUrl?: string | null;

  durationDays: number;
  memberCount: number;
  /** 成员头像 URL，最多 4 个；不足时前端用字母/人数占位 */
  memberAvatars?: Array<{ userId?: string; name?: string; avatarUrl?: string | null }>;

  /** 规划 / 行前卡片指标；null 时前端显示「规划进度待同步」/「暂无」 */
  progressPercent?: number | null;  // 0–100
  feasibilityScore?: number | null; // 0–100
  feasibilityLabel?: string | null; // 良好 / 待优化 / 需关注
  hardConflictCount?: number | null;
  pendingConfirmCount?: number | null;
  budgetPerPerson?: number | null;

  /** 旅行中卡片快照（displayStatus === traveling 时建议填） */
  traveling?: {
    weatherCelsius?: number | null;
    weatherLabel?: string | null;   // 晴 / 多云
    nextStopName?: string | null;
    nextStopEta?: string | null;    // ISO 或 HH:mm
  };

  /** 主 CTA（BFF 决定文案，前端只渲染；缺失时前端按 displayStatus 写死） */
  primaryAction?: {
    label: string;                // 继续规划 / 去确认 / 进入今日行程 / 查看复盘
    intent: 'open_detail' | 'open_execute' | 'open_plan_studio' | 'open_insights';
  };
}
```

#### 示例 Response

```json
{
  "success": true,
  "data": {
    "trips": [
      {
        "id": "trip-abc",
        "name": "冰岛 2026-11-01",
        "destination": "IS",
        "destinationLabel": "冰岛",
        "startDate": "2026-06-27T00:00:00.000Z",
        "endDate": "2026-07-03T00:00:00.000Z",
        "status": "PLANNING",
        "totalBudget": 89300,
        "currency": "CNY",
        "days": [{ "id": "d1", "date": "2026-06-27" }],
        "planningAvailability": "ready",
        "listSummary": {
          "displayStatus": "planning",
          "displayStatusLabel": "规划中",
          "coverImageUrl": "https://cdn.example.com/trips/trip-abc/cover.jpg",
          "durationDays": 5,
          "memberCount": 3,
          "memberAvatars": [
            { "name": "Danny", "avatarUrl": null },
            { "name": "Catherine", "avatarUrl": null }
          ],
          "progressPercent": 45,
          "feasibilityScore": 82,
          "feasibilityLabel": "良好",
          "hardConflictCount": 0,
          "pendingConfirmCount": 2,
          "budgetPerPerson": 17860,
          "primaryAction": {
            "label": "继续规划",
            "intent": "open_plan_studio"
          }
        }
      }
    ],
    "total": 1
  }
}
```

---

### 4.2 `GET /trips`（现有 · 过渡）

**路径**: `GET /api/trips`  
**前端调用**: `tripsApi.getAll`（`getListPage` 404 降级时）

#### 当前已用字段（P0）

| 字段 | 用途 |
|------|------|
| `id` | 路由、key |
| `name` | 卡片标题 |
| `destination` | 目的地码 → 国家名、货币、天气 |
| `startDate` / `endDate` | 日期范围、行前判定 |
| `status` | 排序、展示态 |
| `totalBudget` | 人均预算推导 |
| `days[]` | 天数 |
| `metadata` | 封面、指标、nextStop（见 §5.2） |
| `generatingItems` / `tripContentMode` | 规划可用性 |

#### 过渡期内 `metadata` 兼容键（前端已读）

后端在无法上 BFF 前，可先写入 `metadata`：

| metadata 键 | 类型 | UI 位置 |
|-------------|------|---------|
| `coverImageUrl` / `coverImage` / `heroImage` | string | 卡片封面 |
| `progressPercent` / `planningProgress` | number | 规划进度条 |
| `feasibilityScore` / `healthScore` / `overallScore` | number | 可行性 |
| `hardConflictCount` / `conflictCount` | number | 硬冲突（指标列） |
| `pendingConfirmCount` / `pendingItems` | number | 待确认 |
| `travelerCount` / `memberCount` | number | 成员数 |
| `collaboratorCount` | number | 成员数（+1 推导） |
| `nextStop` | `{ placeName, startTime }` | 旅行中「下一站 / 到达」 |
| `nextStopName` | string | 同上 fallback |
| `totalItems` / `itemCount` | number | 进度估算（item 数 ÷ 天数，过渡用） |
| `generationProgress` | object | 规划可用性（`status: failed/completed`） |

> **注意**：`metadata` 为过渡方案；上线 `listSummary` 后应标记 deprecated。前端**不再**对缺失字段写入 62%、76 等假数值。

---

### 4.3 `GET /countries`（P0 · 已对接）

**路径**: `GET /api/countries`  
**用途**：`destination` ISO 码 → `nameCN`（卡片标题/占位）、`currencyCode`（人均预算格式化）。

若 BFF 返回 `destinationLabel` + `currency`，可减少对此接口的依赖。

---

### 4.4 `GET /trips/:id`（P0 · 已对接）

**用途**：用户点击卡片时，前端拉取详情校验 `planningAvailability === ready` 后再导航；非 ready 时 toast 提示。

---

## 5. UI 字段映射表

### 5.1 行程卡片 `TripListCard`

| UI 元素 | 字段 | 优先级 | 无数据时前端行为 |
|---------|------|--------|------------------|
| 封面图 | `listSummary.coverImageUrl` | P1 | 中性占位 + 目的地名 |
| 状态徽章 | `listSummary.displayStatusLabel` | P0 | 前端按 `status` + 14 天规则推导 |
| 标题 | `name` 或 `destinationLabel + startDate` | **P0** | — |
| 目的地 · N天 | `destinationLabel` + `durationDays` | **P0** | 依赖 `GET /countries` + `days[]` |
| 日期范围 | `startDate` → `endDate` | **P0** | 「日期待定」 |
| 成员 | `memberCount` / `memberAvatars` | P1 | 默认 1 人 |
| 规划进度 | `progressPercent` | P1 | 「规划进度待同步」 |
| 可行性 + 标签 | `feasibilityScore` + `feasibilityLabel` | P1 | 「暂无」 |
| 硬冲突 / 待确认 | `hardConflictCount` / `pendingConfirmCount` | P1 | 「暂无」 |
| 预算(人均) | `budgetPerPerson` + `currency` | P1 | 「未设置」 |
| 旅行中 · 天气 | `traveling.*` 或独立天气 API | P1 | 「—」 |
| 旅行中 · 下一站 / 到达 | `traveling.nextStopName` / `nextStopEta` | P1 | 「—」 |
| 主按钮 | `primaryAction.label` | P1 | 前端按状态写死 |
| 查看详情 | 固定前端文案 | — | — |

### 5.2 `displayStatus` 判定规则（BFF 应实现）

| displayStatus | 条件 |
|---------------|------|
| `cancelled` | `status === CANCELLED` |
| `completed` | `status === COMPLETED` |
| `traveling` | `status === IN_PROGRESS` |
| `pre_trip` | `status === PLANNING` 且 `startDate` 在 14 天内 |
| `planning` | 其余 `PLANNING` |

与前端 `resolveTripListDisplayStatus()` 保持一致，避免双端分歧。

### 5.3 可行性标签（BFF 投影）

| 分数区间 | `feasibilityLabel` | 语义 |
|----------|-------------------|------|
| ≥ 70 | 良好 | gate-allow |
| 50–69 | 待优化 | gate-confirm |
| < 50 | 需关注 | gate-confirm |
| null | — | 不展示标签 |

---

## 6. 优先级与排期建议

### P0 — 列表页可用（当前已对接）

- `GET /trips` — 基础字段 + `generatingItems` / `metadata.generationProgress`
- `GET /countries` — 目的地中文名、货币
- `GET /trips/:id` — 点击前可用性校验

### P1 — 消除占位 / 空指标

| 能力 | 接口 / 字段 | 状态 |
|------|-------------|------|
| 列表 BFF | `GET /trips/list` | ✅ |
| 封面 | `listSummary.coverImageUrl` | ✅ BFF `CoverImageService` |
| 进度 / 可行性 | `progressPercent`, `feasibilityScore`, `feasibilityLabel` | ✅ BFF 投影 |
| 冲突 / 待确认 | `hardConflictCount`, `pendingConfirmCount` | ✅ BFF 投影 |
| 成员 | `memberCount`, `memberAvatars[]` | ✅ BFF 投影 |
| 旅行中快照 | `listSummary.traveling.*` | 待数据 |
| 人均预算 | `budgetPerPerson`, `currency` | ✅ BFF 投影 |
| 展示态 | `displayStatus`, `displayStatusLabel` | ✅ BFF 投影 |
| 规划可用性 | 顶层 `planningAvailability` | ✅ BFF 投影 |

### P2 — 增强

| 能力 | 说明 |
|------|------|
| `GET /trips/list?status=` | 服务端筛选 |
| ETag / 304 | 列表缓存 |
| `GET /trips/:id/list-summary` | 单卡强制重算摘要 |
| `isCollected` | 收藏排序（当前前端 localStorage） |
| `memberAvatars` 渲染 | 前端目前仍用字母/人数占位，有数据后可接 |

### 已移除 · 不需要

以下能力随「需要你处理」横幅删除，**无需实现**：

- `GET /trips/urgent-tasks`
- `TripListPageResponse.urgentTasks[]`
- `metadata.pendingSplitConfirmCount` / `pendingChecklistCount`（仅原横幅用）

---

## 7. 前端行为（当前实现）

### 7.1 无数据时的降级展示

| 字段 | 前端行为 |
|------|----------|
| `progressPercent` | 不渲染进度条，显示「规划进度待同步」 |
| `feasibilityScore` | 显示「暂无」 |
| `pendingConfirmCount` / `hardConflictCount` | 显示「暂无」 |
| `budgetPerPerson` | 显示「未设置」 |
| `coverImageUrl` | 中性占位 + 目的地名称 |
| `memberAvatars` | 1 人显示「1 人」；多人字母占位 |
| 旅行中天气 | 独立调天气 API（`TripListCompactWeather`） |

> **已移除**：`ready → 62%`、`ready → 76` 等硬编码 fallback。

### 7.2 切换条件

当 `GET /trips` 或 `GET /trips/list` 返回的每项含 **`listSummary`** 时：

1. 卡片指标**优先**读 `listSummary`
2. `listSummary` 缺失字段时，**仅**读 `metadata` 对应键
3. 仍无数据则走 §7.1 降级文案，**不**填充假数值

TypeScript SSOT：`src/types/trip-list.ts`

---

## 8. BFF 聚合读源（实现参考）

```
GET /trips/list
├── TripRepository.list(userId)
└── 对每个 tripId（建议批量）：
    ├── PlanningAvailabilityService.status     → planningAvailability
    ├── TripHealthService.overallScore         → feasibilityScore
    ├── PlanningConflictsService.hardCount     → hardConflictCount
    ├── ReadinessChecklistService.pending      → pendingConfirmCount
    ├── TripStateService.snapshot              → traveling.nextStop*（IN_PROGRESS）
    ├── CoverImageService.resolve              → coverImageUrl
    │     1. metadata.coverImageSource=user/poi → metadata.coverImageUrl
    │     2. metadata.coverImageSource=auto   → hash(tripId) % poiImages
    │     3. 无配置                           → 同 (2) 默认随机 POI
    │     4. POI 图池仍为空                   → Country.coverImageUrl / 目的地注册表
    │     5. 仍无图                           → null（前端可走本地目的地兜底）
    ├── CollaboratorService.summary            → memberCount / memberAvatars
    └── BudgetService.perPerson                → budgetPerPerson
```

---

## 9. 错误与空态

| 场景 | HTTP | 前端行为 |
|------|------|----------|
| 无行程 | 200 `trips: []` | 空态 + 创建按钮 |
| BFF 404 | — | 降级 `GET /trips` |
| 部分 summary 失败 | 200 + `listSummary: null` | 卡片降级展示「暂无 / 待同步」，不阻塞列表 |
| 未授权 | 401 | 跳转登录 |
| 服务不可用 | 503 | 全页错误 + 重试 |

---

## 9.1 行程封面配置（P1）

### 前端已实现

- 列表卡片菜单 **「设置封面」** → `TripCoverDialog`
- 保存：`PUT /trips/:id`，写入 `metadata`：
  - `coverImageSource`: `'auto' | 'poi' | 'user'`
  - `coverPlaceId`: 指定 POI 时写入
  - `coverImageUrl` / `coverImage`: 指定 POI 或自定义 URL
- 工具：`src/lib/trip-cover.util.ts`、`src/components/trips/list/TripCoverDialog.tsx`

### 后端已实现（CoverImageService + CountryProfile）

| 能力 | 接口 / 字段 | 状态 |
|------|-------------|------|
| **列表封面（含目的地兜底）** | `GET /trips/list` → `listSummary.coverImageUrl` | ✅ BFF 批量解析；POI 为空时回退 `CountryProfile.coverImageUrl` |
| **目的地封面真源** | `GET /countries/:code/profile` → `coverImageUrl` | ✅ `assembleCountryProfileResponse` 透出，与 BFF **同一数据源** |
| **读取用户配置** | `trip.metadata.coverImageSource` | ✅ poi/user 用 metadata URL；auto 走 hash 选 POI 图 |
| **保存封面** | `PUT /trips/:id` | ✅ metadata 合并写入 |
| **POI 图片来源** | Place 上传图 + metadata 图 | ✅ 与 `collectPlaceImages()` 对齐 |

**BFF 解析优先级（CoverImageService）**

1. `metadata.coverImageSource === 'poi'|'user'` 且 `coverImageUrl` 有效 → 使用该 URL
2. `metadata.coverImageSource === 'auto'` 或未配置 → 从行程 POI 图池按 `hash(tripId)` 取模
3. POI 图池为空 → `CountryProfile.coverImageUrl`（批量按 destination 加载）
4. 仍无图 → `coverImageUrl: null`

**前端列表展示规则**

1. **优先** `listSummary.coverImageUrl`（BFF 已含 POI 图或目的地图）
2. `coverImageSource === 'poi'|'user'` 且无 listSummary 时，读 `metadata.coverImageUrl`
3. BFF 封面为空时，读已缓存的 `CountryProfile.coverImageUrl`（列表页对缺封面行程补拉 profile）
4. 仍无图 → 占位 UI

> 前端**不再**维护静态目的地封面注册表；与 BFF / profile 共用 `CountryProfile.coverImageUrl`。

**数据层（CountryProfile.coverImageUrl）**

| 项 | 说明 |
|----|------|
| Migration | `20260708120000_country_profile_cover_image` |
| 字段 | `CountryProfile.coverImageUrl`（`GET /countries/:code/profile` 透出） |
| 冰岛种子 | `IS` → `https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=1200`（杰古沙龙冰河湖；与项目内 inspiration 资产同源） |
| BFF | `CoverImageService` POI 图池为空时批量读 destination → 写入 `listSummary.coverImageUrl` |

**可选增强（P2）**

```
GET /trips/:tripId/cover-candidates
→ { candidates: [{ placeId, placeName, imageUrl }] }
```

用于减轻封面弹窗对完整 `GET /trips/:id` 的依赖；非必须。

---

## 10. 前端代码索引

| 路径 | 说明 |
|------|------|
| `src/pages/trips/index.tsx` | 列表页入口、`tripsApi.getListPage` |
| `src/components/trips/list/TripListCard.tsx` | 卡片 UI |
| `src/components/trips/list/TripListCreateCard.tsx` | 创建占位 |
| `src/components/trips/list/trip-list-ui.tsx` | 视觉 token |
| `src/lib/trip-list.util.ts` | 读模型解析（`listSummary` / `metadata`） |
| `src/lib/trip-cover.util.ts` | 封面配置读写、POI 候选、确定性随机 |
| `src/lib/destination-cover.util.ts` | CountryProfile.coverImageUrl 读取 |
| `src/components/trips/list/TripCoverDialog.tsx` | 封面选择弹窗 |
| `src/lib/normalize-trip-list.ts` | BFF 响应归一化 |
| `src/api/trips.ts` → `getListPage` / `getAll` | API 客户端 |
| `src/types/trip-list.ts` | BFF 类型 SSOT |
| `src/types/trip.ts` → `TripListItem` | 基础列表项类型 |

---

## 11. 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.5.0 | 2026-07-08 | CountryProfile.coverImageUrl 落库（migration `20260708120000`）；冰岛 IS 种子图；前端对齐 BFF/profile 同源 |
| 1.4.0 | 2026-07-08 | 目的地封面兜底：前端 `destination-cover.util` + 后端 Country.coverImageUrl 契约 |
| 1.2.0 | 2026-07-07 | 后端 `GET /trips/list` 上线；前端对接 query 参数、响应归一化、`memberAvatars` / `planningAvailability` |
| 1.1.0 | 2026-07-07 | 移除「需要你处理」/`urgentTasks`；更新无数据降级行为；移除 62/76 fallback；补充 `getListPage`、P0 接口总览、排期建议 |
| 1.0.0 | 2026-07-02 | 初版：列表 BFF 契约、字段映射、过渡 metadata 键、P0/P1 分级 |
