# 行程详情 · 活动收藏 API

> **版本**: 1.0.0  
> **Base**: `/api/trips/:tripId/activity-favorites`  
> **状态**: 后端已实现 · 前端已对接 `TripDetailActivitiesTab`  
> **关联 UI**: `TripDetailActivitiesTab`  
> **关联文档**: [trip-detail-tabs-api.md](./trip-detail-tabs-api.md) §3.6、[trip-detail-tab-frontend-integration.md](./trip-detail-tab-frontend-integration.md)

**最后更新**: 2026-07-02

---

## 1. 概述

活动 Tab 卡片与侧栏详情支持收藏/取消收藏。数据按 **当前用户 + 行程** 维度持久化（`TripActivityFavorite` 表）。

| 目标 | 说明 |
|------|------|
| 收藏 ACTIVITY 行程项 | `itineraryItemId` |
| 收藏 POI | `placeId`（与行程项二选一） |
| 便捷读模型 | 响应含 `itineraryItemIds[]`、`placeIds[]` |

---

## 2. 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/trips/:tripId/activity-favorites` | 当前用户收藏列表 |
| POST | `/trips/:tripId/activity-favorites` | 设置/取消收藏 |

### POST Body

```typescript
{
  itineraryItemId?: string;  // ACTIVITY 行程项（与 placeId 二选一）
  placeId?: number;          // POI
  favorited: boolean;        // true 收藏，false 取消
}
```

### 响应 `data`

```typescript
interface ActivityFavoritesResponse {
  tripId: string;
  userId?: string;
  items?: ActivityFavoriteItem[];
  itineraryItemIds: string[];
  placeIds: number[];
}
```

POST 返回更新后的完整列表（含便捷 ID 数组）。

---

## 3. 前端对接

```typescript
import { tripActivityFavoritesApi } from '@/api/trip-detail-tab-client';

const { itineraryItemIds } = await tripActivityFavoritesApi.list(tripId);
await tripActivityFavoritesApi.toggleItineraryItem(tripId, item.id, true);
await tripActivityFavoritesApi.togglePlace(tripId, placeId, false);
```

| 文件 | 说明 |
|------|------|
| `src/types/activity-favorites.ts` | 类型 |
| `src/api/trip-detail-tab-client.ts` | `tripActivityFavoritesApi` |
| `src/components/trips/detail/tabs/TripDetailActivitiesTab.tsx` | 卡片/侧栏 Heart 交互 |

## 4. 部署依赖

后端需执行 migration `20260702140000_trip_activity_favorites`，否则 GET/POST 返回：

```
Cannot read properties of undefined (reading 'findMany')
```

前端已做容错：加载失败时收藏列表为空，不阻塞 Tab 渲染。

---

## 5. 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2026-07-02 | 初版：list + toggle；活动 Tab 对接 |
