# 徒步模块 — C 端对接说明

> 管理端写入 `metadata.hikingDetailOverride`，**C 端禁止读取**；后端 merge 后进 `hikingDetail`。  
> **2026-05 联调**：P0/P1 接口已上线，清单见 [`hiking-backend-api-summary.md`](./hiking-backend-api-summary.md)。

## 1. 整体链路

```
Admin  PUT/PATCH  metadata.hikingDetailOverride
         ↓
后端 DB  RouteDirection.metadata
         ↓
GET /route-directions/:id?longestHike=2
  fixture + POI + DEM + merge(override)
         ↓
data.hikingDetail（已合并）
         ↓
C 端     只绑定 hikingDetail
```

| 角色 | 读 | 写 |
|------|----|----|
| 管理端 | 表单 + metadata | `PUT/PATCH` → `metadata.hikingDetailOverride` |
| 后端 | DB metadata | 组装时 merge 进 `hikingDetail` |
| C 端 | `hikingDetail` | 不碰 `hikingDetailOverride` |

**缺口**：后端若未做 P0 merge，C 端 Tab 会显示「待补充」，运营在 Admin 填的内容不会出现。需后端按 `hiking-detail-override-api-requirements.md` 实现。

## 2. C 端调用的接口

### 发现 / 列表

```
GET /api/route-directions?tag=徒步&countryCode=IS
```

列表**不带**完整 `hikingDetail`。卡片读**根级**：`readinessScore`、`totalDistanceKm`、`totalAscentM`、`estimatedDays`、`startPoint` / `startPointLabel` / `center`（兼读 `metadata` 作 fallback）。

**注意**：`tag=徒步` 须 URL 编码；Axios `params` 会自动处理，手写 URL 勿用未编码中文。

前端实现：`src/pages/trails/explore.tsx` · 列表辅助函数 `listTotalDistanceKm` / `listEstimatedDays`（`src/lib/hiking-trail-detail-ui.ts`）。

### 徒步详情（主接口）

```
GET /api/route-directions/:routeDirectionId?longestHike={0-4}
```

- 前置：`tags` 含 **徒步**，否则无 `hikingDetail`
- C 端封装：`loadHikingRouteDirection` / `loadHikingRouteDetail`（`src/lib/load-hiking-route-detail.ts`）

### 生产环境不要用

- `GET /demo/hiking/laugavegur` — 仅独立 Demo 页 `/demo/hiking/laugavegur`
- 不要读取 `data.metadata.hikingDetailOverride`

### 路线 Readiness（P2，优先）

```
GET /api/readiness/route-directions/:routeDirectionId?longestHike=
```

- 组件：`HikingTrailReadinessPanel`（`/dashboard/readiness?trailId=`）
- 客户端：`hikingApi.getRouteDirectionReadiness` · `useRouteDirectionReadiness`
- 失败时回退 `computeTrailReadiness()`；日节奏优先用响应 `dayPaceVerdict`

### 行程徒步审计

```
GET /api/readiness/trip/:tripId/hiking-audit?longestHike=
```

- 组件：`HikingAuditCard`（行程详情 + **`/dashboard/readiness?tripId=`**）
- 展示 `tripPlannedDays` / `routeSuggestedDays`

## 3. hikingDetail → 页面 Tab

| Tab / 区块 | 字段 | 空态 |
|------------|------|------|
| 概览 / Hero | `summary`、`daySkeleton` | override 一般不覆盖日骨架 |
| 地图 / 剖面 | `geometry.polyline`、`elevationProfile`、`terrainSummary` | 待补充 |
| 风险与约束 | **`riskMatrixRows[]`**、`hardGates[]`、`emergency` | `pickRiskMatrixRows()` / `isHikingRiskSectionEmpty()` |
| 后勤与补给 | `access`、`permits[]`、`supplyPois[]`、`shelters[]`、`timeWindows` | `pickHikingPermits()` / `isHikingLogisticsSectionEmpty()` |
| 体能匹配 | `fitnessMatch` | 无则隐藏 |
| 替代方案 | `alternatives[]` | 多为 fixture |

风险矩阵（**`riskMatrixRows`**，勿用 fixture 枚举 `riskMatrix`）：

```ts
import { pickRiskMatrixRows } from '@/lib/hiking-trail-detail-ui';

pickRiskMatrixRows(hikingDetail).map((row) => ({
  id: row.id,
  title: row.labelCN ?? row.label,
  value: row.value,
  level: row.level,
}));
```

| Admin 写入 | C 端 `hikingDetail` |
|------------|---------------------|
| `riskMatrix[]` | `riskMatrixRows` |
| `hardGates` | `hardGates` |
| `emergency` | `emergency` |
| `access` | `access` |

## 4. 推荐代码

```ts
import { loadHikingRouteDetail } from '@/lib/load-hiking-route-detail';
import { resolveLongestHikeForPreview } from '@/lib/hiking-longest-hike';

const hd = await loadHikingRouteDetail(routeDirectionId, {
  longestHike: resolveLongestHikeForPreview(),
});
```

## 5. 与订行程 Template 的关系

| 能力 | 接口 |
|------|------|
| 路线详情展示 | `GET /route-directions/:id` → `hikingDetail` |
| 订行程 / 日计划 | `GET/PUT /route-directions/templates/:id` |

两套数据不要混在一个模型里。

## 6. HikePlan / GPS 存储模式（C 端可切换）

| 模式 | 行为 |
|------|------|
| **云端 API**（默认：已登录） | `GET/POST /api/hiking/hike-plans/*`，需登录 |
| **本地** | IndexedDB（未登录或手动切换） |

- 环境变量：`VITE_HIKE_PLAN_STORAGE=api|local|auto`（默认 `auto`）
- UI：`HikePlanStorageSwitch`（我的徒步 / 准备页）
- 实现：`src/services/hike-plan-repository.ts` + `src/lib/hike-plan-storage.ts`

## 7. longestHike 来源

- **档案**：`GET /api/v1/fitness/profile`（JWT，无 `/me` 别名）· `fitnessApi.getCurrentProfile()`
- **展示**：URL `?longestHike=` > profile `longestHike` / `longestHikeDays` > 默认 `2`
- **请求 query**：有 URL 覆盖 → 必传；**已登录且无 URL** → **省略** query，后端用 JWT profile；未登录 → 传默认 `2`
- **审计**：`GET readiness/trip/:tripId/hiking-audit?longestHike=` 与详情同一档位（或都省略靠 JWT）
- Hook：`useLongestHike()` → `longestHike`（UI）、`longestHikeForQuery`（API，可为 `undefined`）

## 8. 离线包三步（详情 → 准备页 → IndexedDB）

| 步骤 | 页面 | 接口 |
|------|------|------|
| 1 展示 | `/dashboard/trails/:id` | `GET /route-directions/:id?longestHike=` → `hikingDetail`（地图/Tab） |
| 1b 预览（可选） | 同上 | `hikingDetail.offlinePackHints.geojsonUrl` 仅链接预览，**非唯一来源** |
| 2 元数据 | `/dashboard/trails/prep/:hikePlanId` | `GET /hiking/route-directions/:routeDirectionId/offline-pack` |
| 3 资源 | 准备页下载 | GeoJSON + `tileManifest` → 包记录；按 manifest **预取底图瓦片**（≤600 张）→ `tripnara-trail-offline-tiles` |

`:id` / `routeDirectionId` 均为 **route-directions 数字 ID**，不是 hikePlanId。

实现：`src/api/hiking-offline-pack.ts`、`src/services/ensure-hiking-offline-pack.ts`、`src/services/download-offline-tiles.ts`、`useTrailOfflineDownload`。

行中地图：`MapboxTrailMap` + `tripnara-offline://` 协议（栅格 OSM 或 Mapbox `.pbf` / `vectorTiles[]`）。轨迹/POI 仍来自 GeoJSON（`src/lib/hiking-offline-geojson.ts`）。

## 9. HikePlan prep 与路线模板

| 场景 | C 端 |
|------|------|
| 新建 HikePlan | 进入准备页 `GET .../prep` 即可（创建时后端已用 `hikingDetail` 生成） |
| 用户勾选装备/许可 | `PATCH .../prep` 传 `checklist` / `permits`；读响应里的 `*Complete` |
| 运营更新 override 后 | `POST .../prep/refresh-template`（需登录）；准备页「同步路线模板」 |

模板种子优先级（服务端）：`hikingDetailOverride` > 代码种子 > 用户 prep 仅保留 `checked` / `obtained`。

### `hikingDetail.permits`（详情 → prep）

```json
{
  "id": "fi-hut",
  "nameCN": "FÍ 山屋预订",
  "name": "FÍ hut booking",
  "titleZh": "FÍ 山屋预订",
  "required": true,
  "bookingUrl": "https://www.fi.is"
}
```

| 步骤 | 操作 |
|------|------|
| 验收 | 后端热加载后 → 路线详情 **后勤** Tab 见许可列表，或 DevTools 看 `hikingDetail.permits` |
| 刷新旧 prep | 准备页 **「同步路线模板」** → `POST /hiking/hike-plans/:id/prep/refresh-template` |
| 标签 | C 端 `titleZh` → `nameCN` → `name` |

## 10. 联调检查清单

- [x] 列表 `tag=徒步` 编码正确（Axios params）
- [x] 列表读根级 `readinessScore` / `totalDistanceKm` / `estimatedDays`
- [x] 路线 `tags` 含「徒步」；冰岛满配验收 **`/dashboard/trails/106`**（`IS_LAUGAVEGUR`）
- [ ] 只读 `data.hikingDetail`，不读 `metadata.hikingDetailOverride`
- [ ] 风险 Tab：**`riskMatrixRows`**、`hardGates`、`emergency`、`access`
- [x] `hiking-audit` 展示 `tripPlannedDays` / `routeSuggestedDays`（Readiness 行程页 + 行程详情）
- [x] 路线 Readiness 面板优先 P2 GET
- [ ] HikePlan 走 `/api/hiking/hike-plans`（JWT）；`prisma migrate deploy`
- [ ] 详情 Tab「待补充」→ 补 `hikingDetail` 数据或 Admin override，非接口未接

## 相关文档

- [`hiking-module-acceptance-checklist.md`](./hiking-module-acceptance-checklist.md) — 按页面验收表 & 前后端分工
- [`hiking-backend-api-summary.md`](./hiking-backend-api-summary.md) — 全量接口清单
- [`hiking-trail-detail-backend-requirements.md`](./hiking-trail-detail-backend-requirements.md) — hikingDetail 字段
- [`hike-plan-lifecycle.md`](./hike-plan-lifecycle.md) — HikePlan 生命周期
