# 行程详情 · 时间轴 Tab 聚合 BFF API

> **版本**: 1.0.0  
> **Base**: `/api/trips/:tripId/timeline-overview`  
> **状态**: 后端已实现 · 前端已对接 `TripDetailTimelineTab`  
> **关联 UI**: `TripDetailTimelineTab`  
> **关联文档**: [trip-files-api.md](./trip-files-api.md)、[trip-detail-tabs-api.md](./trip-detail-tabs-api.md)

**最后更新**: 2026-07-02

---

## 1. 概述

时间轴 Tab 顶部统计（可行性 / 节奏 / 冲突）与侧栏（规划进度、待办、今日提醒）原先为前端 mock 或多接口拼装。本 BFF **一次聚合**以下读模型：

| 聚合源 | 原路径 |
|--------|--------|
| 冲突 → 可行性分数 | `GET /trips/:id/conflicts` |
| 指标 → 节奏分数 | `GET /trips/:id/metrics` |
| 规划进度 | `GET /trips/:id/pipeline-status` |
| 待办 | `GET /trips/:id/tasks` |
| 提醒 | `GET /trips/:id/persona-alerts` |
| 新建议数 | `GET /trips/:id/suggestions?status=new` |
| 待确认预订 | DB `ItineraryItem.bookingStatus` |
| 待补充文件 | `GET /trips/:id/files/stats`（可选） |

---

## 2. `GET /api/trips/:tripId/timeline-overview`

### Query

| 参数 | 必填 | 默认 | 说明 |
|------|------|------|------|
| `include` | 否 | `stats,pipeline,tasks,reminders,suggestions` | 逗号分隔：`stats` `pipeline` `tasks` `reminders` `suggestions` `health` |

### 响应 `data`

```typescript
interface TimelineOverviewResponse {
  tripId: string;
  stats: {
    feasibilityScore: number;
    paceScore: number;
    conflictCount: number;
    pendingConfirmationCount: number;
    filesPendingCount?: number;
    newSuggestionCount: number;
  };
  planning: {
    progressPercent: number;
    completedStages: number;
    totalStages: number;
    currentStageName?: string;
    stages: PipelineStage[];
  };
  tasks: Task[];
  incompleteTaskCount: number;
  todayReminders: PersonaAlert[];
  health?: TripHealth;
  generatedAt: string;
}
```

### 分数计算规则

| 字段 | 规则 |
|------|------|
| `feasibilityScore` | 100 − Σ(冲突扣分)；HIGH −25、MEDIUM −15、LOW −5，上限扣 95 |
| `paceScore` | `100 − avg(每日 fatigue)`，fatigue 来自 metrics |
| `progressPercent` | `completedStages / totalStages × 100` |
| `pendingConfirmationCount` | `NEED_BOOKING`/`PENDING`/`UNBOOKED`，或需预订类型且无确认状态 |

### 容错

子数据源失败时 **降级为空/默认值**，不阻断整包响应；失败项写入服务端 warn 日志。

---

## 3. 前端对接

```typescript
// src/api/trip-timeline.ts
tripTimelineApi.getOverview(tripId, { include?: string })

// TripDetailTimelineTab 首屏（与 trip 并行）
const overview = await tripTimelineApi.getOverview(tripId);
```

| 文件 | 说明 |
|------|------|
| `src/api/trip-timeline.ts` | API 客户端 |
| `src/types/timeline-overview.ts` | 类型 SSOT |
| `src/lib/timeline-overview.util.ts` | 分数标签 |
| `src/components/trips/detail/tabs/TripDetailTimelineTab.tsx` | Tab UI |

---

## 4. 代码索引（后端）

| 路径 | 说明 |
|------|------|
| `services/timeline-overview.service.ts` | BFF 聚合 |
| `utils/timeline-overview.util.ts` | 分数 / 进度计算 |
| `dto/timeline-overview.dto.ts` | 响应类型 |
| `trips.controller.ts` | 路由 |

---

## 5. 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2026-07-02 | 初版：时间轴 Tab P1 BFF + 前端对接 |
