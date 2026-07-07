# 行程详情 Tab BFF · 前端集成

> **版本**: 1.7.0  
> **前端实现**: `src/api/trip-detail-tab.types.ts`、`src/api/trip-detail-tab-client.ts`  
> **Hook**: `src/hooks/useTripDetailTabBff.ts`  
> **压测**: `npm run trip-detail-tab:bff-perf`

**最后更新**: 2026-07-02

---

## 1. 接入步骤

| 后端 | 前端 |
|------|------|
| `dto/frontend-trip-detail-tab-api.types.ts` | `src/api/trip-detail-tab.types.ts` |
| `dto/frontend-trip-detail-tab-api-client.ts` | `src/api/trip-detail-tab-client.ts` |

鉴权默认走 `apiClient`，无需额外 `configureTripDetailTabApi`。

---

## 2. 三段加载（v1.7 推荐）

```typescript
import { tripDetailTabApi, tripTimelineApi } from '@/api/trip-detail-tab-client';

// Phase 1 — 首屏（~500ms）
const [trip, firstPaint] = await Promise.all([
  tripsApi.getById(tripId),
  tripDetailTabApi.loadFirstPaint(tripId),
]);
// 角标: firstPaint.timeline.stats.newSuggestionCount
// tasks / todayReminders 可能为空 — 正常

// Phase 2 — requestIdleCallback / 进入 Tab（~1.3s）
const phase2 = await tripDetailTabApi.loadPhase2(tripId);
// 合并: planning、tasks、todayReminders、collab 全量块

// Phase 3 — 打开「建议」面板
await tripTimelineApi.getOverviewWithSuggestions(tripId);
// 或继续用 GET /trips/:id/suggestions
```

**页面接入**: `src/pages/trips/[id].tsx` 使用 `useTripDetailTabBff(id)`，时间轴/成员 Tab 接收预加载数据。

---

## 3. API 速查

| 客户端 | 方法 | 说明 |
|--------|------|------|
| `tripDetailTabApi` | `loadFirstPaint` | Phase 1 四 Tab shell |
| `tripDetailTabApi` | `loadPhase2` | Phase 2 timeline + collab full |
| `tripTimelineApi` | `getShellOverview` | `preset=shell` → stats |
| `tripTimelineApi` | `getPhase2Overview` | `preset=full` |
| `tripTimelineApi` | `getOverviewWithSuggestions` | 含 suggestions 列表 |
| `tripCollabApi` | `getShellOverview` / `getPhase2Overview` | collab 分阶段 |
| — | `TRIP_DETAIL_TAB_BFF_INCLUDES` | include 字符串常量 |

---

## 4. 压测参考（冰岛 3e4a1058-…，12 次采样）

| 场景 | p95 | 说明 |
|------|-----|------|
| `loadFirstPaint` | ~497ms | shell timeline + shell collab + files + accommodation |
| `page-first-paint` | ~582ms | getById + loadFirstPaint 并行 |
| `loadPhase2` | ~1291ms | timeline + collab preset=full |
| 旧写法（4 Tab 无 preset） | ~1390ms | 不推荐 |

```bash
TRIP_ID=3e4a1058-9218-467f-988a-c18008a14385 npm run trip-detail-tab:bff-perf
```

---

## 5. 旧代码 → 新写法

| 旧 | 新 |
|----|-----|
| 进详情并行 4 个无参 `getOverview` | `loadFirstPaint` + 后续 `loadPhase2` |
| 首屏展示 `overview.tasks` | Phase2 后再展示（或 skeleton） |
| 建议角标来自 `suggestions.length` | `stats.newSuggestionCount` |
| 建议面板用 timeline 内嵌数据 | `getOverviewWithSuggestions()` 或 `GET /suggestions` |

---

## 6. 无需改的

- `GET /trips/:id`（行程主体）
- `GET /trips/:id/suggestions`（建议 CRUD）
- files / accommodation / activity-favorites BFF
- Decision Center / Gateway 写链

---

## 7. 接口变更与前端迁移（v1.7）

> Decision Runtime / E1 标定不要求前端改 Tab BFF 接口。

### 7.1 后端改了什么

| 接口 | 变更 | 兼容性 |
|------|------|--------|
| `GET /trips/:id/timeline-overview` | 新增 `preset=shell\|full`；**默认 include 去掉 suggestions** | ⚠️ 见 7.3 |
| `GET /trips/:id/collab-overview` | 新增 `preset=shell\|full` | ✅ 结构不变 |
| `GET /trips/:id/collaborative-tasks` | 无路径/字段变更 | ✅ |
| 其余 Tab BFF | 无变更 | ✅ |

**Query 优先级**: 显式 `include=` **始终优先于** `preset`。

| preset | timeline 等价 include | collab 等价 include |
|--------|----------------------|---------------------|
| `shell` | `stats` | `members,health` |
| `full` | `stats,pipeline,tasks,reminders` | 全量 |

### 7.2 Breaking（仅 1 处）

若代码依赖 timeline-overview **默认响应里的 suggestions 列表**（不是角标数字）：

```typescript
// 改前
await tripTimelineApi.getOverview(tripId);

// 改后
await tripTimelineApi.getOverviewWithSuggestions(tripId);
// 或
await tripTimelineApi.getOverview(tripId, {
  include: 'stats,pipeline,tasks,reminders,suggestions',
});
```

`stats.newSuggestionCount` **无需改** — shell / 默认 include 都会返回。

### 7.3 前端验收清单

- [x] 首屏 `loadFirstPaint` / shell preset，不再裸调无 preset overview
- [x] 角标可读 `stats.newSuggestionCount`（建议列表仍走 REST，互不冲突）
- [x] tasks / reminders / pipeline 在 Phase2 后渲染
- [x] `getOverviewWithSuggestions` 可用于建议面板 lazy 拉取
- [x] 首屏不再 eager 拉 `GET /suggestions`（角标用 `newSuggestionCount`，面板打开时再拉列表）
- [x] client + types 含 v1.7 preset / 常量 / merge util

### 7.4 仍走原 REST 的场景

| 能力 | 接口 |
|------|------|
| 建议完整 CRUD / 应用 | `GET/POST /trips/:id/suggestions` |
| 决策写链 | Decision Center / Gateway |
| 行程主体 | `GET /trips/:id` |

---

## 7. Tab 职责与术语

产品与交互约定见 **[trip-detail-tab-responsibility-matrix.md](./trip-detail-tab-responsibility-matrix.md)**。

前端术语常量：`src/lib/trip-detail-terminology.util.ts`  
Evidence ↔ 文件：`src/lib/trip-detail-evidence-files.util.ts`

---

## 8. 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2026-07-02 | 初版 Tab BFF 对接 |
| 1.7.0 | 2026-07-02 | preset 分阶段加载、压测脚本、页面 Hook 接入 |
| 1.8.0 | 2026-07-05 | Tab 职责矩阵、术语统一、Evidence↔文件跨 Tab、执行 Tab 重定向、时间轴 highlightItem |
