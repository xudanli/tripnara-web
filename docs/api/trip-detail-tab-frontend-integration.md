# 行程详情 Tab · 前端集成指南

> **版本**: 1.0.0  
> **状态**: 已对接 `TripDetailTimelineTab`、`TripDetailMembersTab`、`TripDetailFilesTab`、`TripDetailAccommodationTab`、`TripDetailActivitiesTab`（收藏）  
> **后端契约**: `src/trips/dto/frontend-trip-detail-tab-api.types.ts`、`frontend-trip-detail-tab-api-client.ts`  
> **前端实现**: `src/api/trip-detail-tab.types.ts`、`src/api/trip-detail-tab-client.ts`  
> **关联文档**: [trip-detail-tabs-api.md](./trip-detail-tabs-api.md)、[trip-files-api.md](./trip-files-api.md)、[trip-timeline-overview-api.md](./trip-timeline-overview-api.md)、[trip-collab-overview-api.md](./trip-collab-overview-api.md)

**最后更新**: 2026-07-02

---

## 1. 接入步骤

### 1.1 文件位置

| 后端文件 | 前端路径 |
|----------|----------|
| `dto/frontend-trip-detail-tab-api.types.ts` | `src/api/trip-detail-tab.types.ts` |
| `dto/frontend-trip-detail-tab-api-client.ts` | `src/api/trip-detail-tab-client.ts` |

细粒度类型仍保留在 `src/types/timeline-overview.ts`、`collab-overview.ts`、`trip-files.ts`，由 `trip-detail-tab.types.ts` 统一 re-export。

### 1.2 鉴权

本项目 Tab client **默认走 `apiClient`**（已配置 `baseUrl` 与 `Authorization`），**无需**额外调用 `configureTripDetailTabApi`。

独立 fetch 场景（无 axios 封装）可调用：

```typescript
import { configureTripDetailTabApi } from '@/api/trip-detail-tab-client';

configureTripDetailTabApi({
  baseUrl: '/api',
  getHeaders: () => ({
    Authorization: `Bearer ${getAccessToken()}`,
  }),
});
```

### 1.3 兼容 re-export

以下路径仍可用，内部转发至 `trip-detail-tab-client`：

- `src/api/trip-files.ts`
- `src/api/trip-timeline.ts`
- `src/api/trip-collab.ts`
- `src/api/trip-accommodation.ts`
- `src/api/trip-activity-favorites.ts`

---

## 2. Tab 首屏调用

### 时间轴 Tab（默认）

```typescript
import { tripsApi } from '@/api/trips';
import { tripTimelineApi } from '@/api/trip-detail-tab-client';

const [trip, overview] = await Promise.all([
  tripsApi.getById(tripId),
  tripTimelineApi.getOverview(tripId),
]);

overview.stats.feasibilityScore;  // 可行性 %
overview.stats.paceScore;         // 节奏
overview.stats.conflictCount;
overview.tasks;                   // 侧栏待办
overview.todayReminders;
overview.planning.progressPercent;
```

**组件**: `TripDetailTimelineTab.tsx`

### 成员 Tab

```typescript
import { tripCollabApi } from '@/api/trip-detail-tab-client';

const collab = await tripCollabApi.getOverview(tripId);

collab.teamHealth.progressPercent;   // 替代 collab-team-health heuristic
collab.teamHealth.discussionCount;
collab.collaborators;
collab.collaborativeTasks;

// Optimization V2 团队（二段）
if (collab.team?.teamId) {
  await teamApi.get(collab.team.teamId);
}
```

**组件**: `TripDetailMembersTab.tsx`

### 文件 Tab

```typescript
import { tripFilesApi } from '@/api/trip-detail-tab-client';

const overview = await tripFilesApi.loadTabData(tripId);
// overview.stats.categories → 分类卡片
// overview.items → 合并列表（trip_file + itinerary 资料/缺口）
// overview.sources → 各数据源计数
```

**组件**: `TripDetailFilesTab.tsx`（首屏 `loadTabData` → `GET /files/overview`；上传/删除后刷新 overview）

### 住宿 Tab

```typescript
import { tripAccommodationApi } from '@/api/trip-detail-tab-client';

const overview = await tripAccommodationApi.loadTabData(tripId);
overview.stats.totalNights;
overview.nights;
overview.reminders;
```

**组件**: `TripDetailAccommodationTab.tsx`（BFF 失败时降级 `trip` 前端推导）

### 活动 Tab · 收藏

```typescript
import { tripActivityFavoritesApi } from '@/api/trip-detail-tab-client';

const { itineraryItemIds } = await tripActivityFavoritesApi.list(tripId);
await tripActivityFavoritesApi.toggleItineraryItem(tripId, item.id, true);
```

**组件**: `TripDetailActivitiesTab.tsx`（卡片与侧栏 Heart 按钮）

---

## 3. API 速查

| 客户端 | 方法 | HTTP |
|--------|------|------|
| `tripFilesApi` | `getOverview` | `GET /trips/:id/files/overview` |
| `tripFilesApi` | `getList` | `GET /trips/:id/files` |
| `tripFilesApi` | `getStats` | `GET /trips/:id/files/stats` |
| `tripFilesApi` | `loadTabData` | 优先 `overview`，降级 `stats` + `list` |
| `tripFilesApi` | `upload` | `POST /trips/:id/files` |
| `tripFilesApi` | `createPending` | `POST /trips/:id/files/pending` |
| `tripFilesApi` | `getDownloadUrl` | `GET /trips/:id/files/:fileId/download` |
| `tripFilesApi` | `delete` | `DELETE /trips/:id/files/:fileId` |
| `tripAccommodationApi` | `getOverview` / `loadTabData` | `GET /trips/:id/accommodation-overview` |
| `tripActivityFavoritesApi` | `list` | `GET /trips/:id/activity-favorites` |
| `tripActivityFavoritesApi` | `toggle` / `toggleItineraryItem` / `togglePlace` | `POST /trips/:id/activity-favorites` |
| `tripTimelineApi` | `getOverview` | `GET /trips/:id/timeline-overview` |
| `tripCollabApi` | `getOverview` | `GET /trips/:id/collab-overview` |

---

## 4. 与现有 `tripsApi` 的关系

| 数据 | 仍用页面级 `tripsApi` | 改用 Tab BFF |
|------|-------------------------|--------------|
| 行程主体 / 日程项 | `getById` | — |
| 时间轴顶部统计 + 侧栏 | — | `tripTimelineApi.getOverview` |
| 成员协作聚合 | — | `tripCollabApi.getOverview` |
| 文件列表/统计 | — | `tripFilesApi.*` |
| 住宿 Tab 首屏 | — | `tripAccommodationApi.loadTabData` |
| 活动收藏 | — | `tripActivityFavoritesApi.*` |
| 预算 / 地图 / 决策记录 | 各 Tab 原 API | 不变 |

进入详情页 `loadTrip()` 建议保留 `getById` + `getMetrics`；各 Tab 在 mount 时拉对应 BFF（或首屏与 `getById` 并行以去掉 loading 闪烁）。

### 联调脚本

```bash
# 默认行程 807b3c54-4793-4006-a66d-67e79faa6fc2（.env.development）
TRIP_ID=3e4a1058-9218-467f-988a-c18008a14385 ./scripts/test-trip-detail-tab-apis.sh
```

---

## 5. 前端代码索引

| 路径 | 说明 |
|------|------|
| `src/api/trip-detail-tab.types.ts` | Tab BFF 类型聚合 |
| `src/api/trip-detail-tab-client.ts` | 统一 client |
| `src/lib/timeline-overview.util.ts` | 时间轴展示推导 |
| `src/lib/collab-overview.util.ts` | 成员 Tab 任务/待办映射 |
| `src/lib/trip-files.util.ts` | 文件分类分组 |
| `src/components/trips/detail/tabs/TripDetailTimelineTab.tsx` | 时间轴 Tab |
| `src/components/trips/detail/tabs/TripDetailMembersTab.tsx` | 成员 Tab |
| `src/components/trips/detail/tabs/TripDetailFilesTab.tsx` | 文件 Tab |

---

## 6. 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2026-07-02 | 初版：files + timeline-overview + collab-overview 类型与 client；三 Tab 对接 |
| 1.1.0 | 2026-07-02 | 文件 Tab 对接 `GET /files/overview` 聚合 BFF |
