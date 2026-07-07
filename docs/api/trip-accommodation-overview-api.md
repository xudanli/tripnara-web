# 行程详情 · 住宿 Tab 聚合 BFF API

> **版本**: 1.0.0  
> **Base**: `/api/trips/:tripId/accommodation-overview`  
> **状态**: 后端已实现 · 前端已对接 `TripDetailAccommodationTab`  
> **关联 UI**: `TripDetailAccommodationTab`  
> **关联文档**: [trip-files-api.md](./trip-files-api.md)、[trip-detail-tab-frontend-integration.md](./trip-detail-tab-frontend-integration.md)

**最后更新**: 2026-07-02

---

## 1. 概述

住宿 Tab 原先从 `GET /trips/:id` 全量行程中由前端推导（`trip-accommodation.util.ts`）。本 BFF **一次聚合**：

| 聚合源 | 说明 |
|--------|------|
| 住宿行程项 | `ItineraryItem`（REST/HOTEL/ACCOMMODATION） |
| 跨天 / 退房 | 与 timeline 同源 `buildTimelineDayItems` + `crossDayInfo` |
| 预订状态 | `bookingStatus` / `bookingConfirmation` / `bookingUrl` |
| 资料 | `note.bookingDocuments` + `trip_files`（`itineraryItemId` 关联） |
| 替代方案 / 房型 | `note` JSON metadata |
| 路线影响 | `travelFromPreviousDuration/Distance` |
| 提醒 | 待预订 / 缺凭证 / 长途 / 退房 |

---

## 2. `GET /api/trips/:tripId/accommodation-overview`

### Query

| 参数 | 必填 | 默认 | 说明 |
|------|------|------|------|
| `include` | 否 | `stats,nights,reminders,travel,files` | 逗号分隔 |

### 响应 `data`

见 `src/types/accommodation-overview.ts` → `AccommodationOverviewResponse`。

```typescript
interface AccommodationOverviewResponse {
  tripId: string;
  stats: {
    totalNights: number;
    bookedCount: number;
    needBookingCount: number;
    missingDocumentCount: number;
    checkoutDaysCount: number;
  };
  nights: AccommodationNightCard[];
  reminders: AccommodationReminder[];
  travelSummary?: {
    totalDistance: number;
    totalDuration: number;
    longSegmentCount: number;
  };
  generatedAt: string;
}
```

### `AccommodationNightCard` 关键字段

| 字段 | 来源 |
|------|------|
| `crossDayInfo` | 由 `startTime`/`endTime` 计算连住晚数 |
| `alternatives[]` | `note` JSON → `accommodationAlternatives` |
| `roomType` / `roomCount` | `note` JSON metadata |
| `bookingDocuments[]` | note 内嵌 + `trip_files` + 确认号 |
| `place.photoUrl` / `tags` | `Place.metadata` |
| `travelToAccommodation` | `travelFromPrevious*` 字段；≥120min 或 ≥250km 标记 `isLongSegment` |

### 示例

```bash
curl -s "http://localhost:3000/api/trips/{tripId}/accommodation-overview"
curl -s "http://localhost:3000/api/trips/{tripId}/accommodation-overview?include=stats,nights,reminders"
```

---

## 3. 前端对接

```typescript
import { tripAccommodationApi } from '@/api/trip-detail-tab-client';

const overview = await tripAccommodationApi.loadTabData(tripId);
overview.stats.totalNights;
overview.nights;    // 按晚卡片
overview.reminders; // 顶部提醒条
```

| 文件 | 说明 |
|------|------|
| `src/types/accommodation-overview.ts` | 响应类型 |
| `src/lib/accommodation-overview.util.ts` | BFF → 现有 UI view 映射 |
| `src/components/trips/detail/tabs/TripDetailAccommodationTab.tsx` | Tab UI |

BFF 不可用时降级为 `adaptAccommodationFromTrip(trip)`（原 `trip-accommodation.util.ts` 推导）。

---

## 4. 与 `GET /trips/:id` 的关系

| 场景 | 建议 |
|------|------|
| 住宿 Tab 首屏 | 使用本 BFF，无需解析全量 trip |
| 编辑预订 / 跳转 POI | 仍用既有 itinerary-items API |
| 文件上传 | `tripFilesApi.upload` + `itineraryItemId` |

---

## 5. 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2026-07-02 | 初版：stats + nights + reminders + travel + files；前端 Tab 对接 |
