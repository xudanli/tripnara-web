# 徒步模块 — 后端接口清单（给后端 / 联调）

> 全局前缀 **`/api`**，信封 **`{ success, data, error }`**。  
> **2026-05 联调状态**：P0 列表/体能/审计/离线包、P1 HikePlan、P2 路线 Readiness 已上线；详情 `hikingDetail` 满配仍依赖 DB 种子（`IS_LAUGAVEGUR`）与 Admin override merge。

---

## 优先级说明

| 级别 | 含义 | 联调状态 |
|------|------|----------|
| **P0** | 列表、详情、体能、行程审计、离线包 | 见下表 ✅ / 详情块待数据 |
| **P1** | HikePlan 全生命周期 + GPS | ✅ JWT；部署前 `npx prisma migrate deploy` |
| **P2** | 服务端 Readiness 分、Mapbox 矢量瓦片 | Readiness GET ✅；瓦片下载 ❌ |

---

## P0 — 发现列表

```
GET /api/route-directions?tag=徒步&countryCode=IS
```

**不带完整 `hikingDetail`**（`tag=徒步` 或 `include=hikingList` 时仅扩展卡片字段）。

| 字段 | 状态 | 位置 |
|------|------|------|
| `readinessScore` | ✅ | **根级**（非嵌套 `hikingDetail`） |
| `totalDistanceKm` / `totalAscentM` | ✅ | 根级；`totalDistanceKm` 常同时在 `metadata.totalDistanceKm` |
| `estimatedDays` | ✅ | 根级 |
| `startPoint` / `startPointLabel` / `center` | ✅ | 根级 |
| `routeDirectionName` | ✅ | 等于 `name`（硬徒步标识） |

**联调坑**：`curl "...?tag=徒步"`（未 URL 编码中文）→ `data: []`；应使用 `tag=%E5%BE%92%E6%AD%A5`。Axios `params` 会自动 UTF-8 编码；**手写 URL 须编码**。

C 端读取：`listReadinessScore` / `listTotalDistanceKm` / `listEstimatedDays`（`src/lib/hiking-trail-detail-ui.ts`），优先根级再 fallback `metadata`。

---

## P0 — 路线与徒步详情

### 1. （见上）发现列表

### 2. 管理端写入 override（P0）

| 接口 | Body |
|------|------|
| `PUT` / `PATCH` `/api/route-directions/:id` | `metadata.hikingDetailOverride`（metadata **浅合并**，只改 override 不冲其它键） |
| 可选分块 | `PATCH .../hiking-detail-override/risk`、`/logistics` |
| Admin 读原文 | `GET .../hiking-detail-override` |

**Admin 写入 → C 端 `hikingDetail`（merge 后）**：

| Admin override | C 端字段 |
|--------------|----------|
| `riskMatrix[]`（表格） | **`riskMatrixRows`**（不是枚举版 `riskMatrix`） |
| `hardGates` | `hardGates` |
| `emergency` | `emergency` |
| `access` | `access` |

---

### 3. C 端详情（主接口，P0）

```
GET /api/route-directions/:id?longestHike={0-4}
```

| 规则 | 后端 | C 端 |
|------|------|------|
| `tags` 含「徒步」才返回 `hikingDetail` | ✅ | ✅ |
| `HikingTrailDetailService.build()` 末尾 merge override | ✅ | — |
| 只读 `data.hikingDetail` | — | ✅ |
| 响应 `metadata` **不含** `hikingDetailOverride`（已剔除） | ✅ | ✅ 不解析 override |
| `longestHike` query | 0–4，与问卷同义 | URL 覆盖；**已登录且无 URL 时不传 query**，后端用 JWT profile |
| 未传 query + JWT | 用 profile 默认 longestHike | `useLongestHike().longestHikeForQuery` |

**验收**：Admin 保存后，`GET ...?longestHike=2` 的 `hikingDetail.hardGates` / `emergency` / `access` 与 Admin 一致；表格风险在 **`riskMatrixRows`**；`metadata` 无 `hikingDetailOverride`。

**前提**：DB 路线 `tags` 含「徒步」，且 name 能触发满配骨架（如 `IS_LAUGAVEGUR`），否则仅通用骨架 + override。

**`hikingDetail` 其它块**：`daySkeleton`、`geometry.polyline`、`supplyPois`、`fitnessMatch`、`weatherRisk` 等见 [`hiking-trail-detail-backend-requirements.md`](./hiking-trail-detail-backend-requirements.md)。

---

### 4. Demo（仅演示页，C 端生产不用）

| 方法 | 路径 |
|------|------|
| GET | `/api/demo/hiking/laugavegur` |

**C 端生产不要用**；不要依赖 `metadata.hikingDetailOverride`。

---

## P0 — 体能 `longestHike`

| 路径 | 状态 |
|------|------|
| `GET /api/v1/fitness/profile` | ✅ 当前用户（JWT） |
| `GET /api/v1/fitness/profile/:userId` | ✅ 仅本人 |
| `GET /api/v1/fitness/profile/me` | ❌ 无此别名；用 **`profile`** |
| `profile.longestHike` 0–4 | ✅ |
| 详情未传 `longestHike` + Bearer | ✅ 从问卷默认档位 |
| `POST /api/v1/fitness/questionnaire/submit` | ✅ body 含 `longestHike` 等 |

**约定**：详情与 `hiking-audit` 请统一传同一 `longestHike`，或**都依赖 JWT 默认**（C 端已登录且无 URL 覆盖时不传 query）。

C 端：`fitnessApi.getCurrentProfile()` → `GET /profile`；`useLongestHike().longestHikeForQuery`。

**longestHike 档位含义**（与问卷一致）：

| 值 | 含义 |
|----|------|
| 0 | 未有多日徒步 |
| 1 | 最长连续 1 天 |
| 2 | 最长连续 2 天 |
| 3 | 最长连续 3 天 |
| 4 | 最长连续 4 天及以上 |

---

## P0 — 行程审计

```
GET /api/readiness/trip/:tripId/hiking-audit?longestHike={0-4}
```

| 项 | 状态 |
|----|------|
| 基础审计（terrain、must、装备） | ✅ |
| `tripPlannedDays` vs `routeSuggestedDays` | ✅ |
| `?longestHike=` | ✅ 可选 |

**触发**（前端）：`metadata.routeDirectionName` + `tags` 含「徒步」。  
**建议**：`trip.metadata` 带 `routeDirectionId` 或 `routeDirectionName`，或先建绑定 trip 的 HikePlan。

C 端：`HikingAuditCard` · `hikingApi.getTripHikingAudit(tripId, { longestHike })`。

---

## P0 — 硬核徒步自动规划（可选开关）

```
POST /api/decision-engine/v1/generate-plan
```

- 环境变量：`ENABLE_HARD_TREK_TRAIL_PLANNING=true`
- 当路线为 hard-trek 时返回 **`hardTrekTrailPlan`** 结构（前端 `src/lib/hiking-generate-plan.ts`）

---

## P1 — HikePlan 全生命周期 ✅

**部署**：`npx prisma migrate deploy` 后可用；**不必再纯本地 Mock**（未登录仍可 IndexedDB）。

**详细契约**：[`hike-plan-lifecycle.md`](./hike-plan-lifecycle.md) · `src/types/hike-plan.ts` · `src/api/hike-plans.ts`

| 能力 | 路径 | 状态 |
|------|------|------|
| CRUD | `POST/GET/PATCH /api/hiking/hike-plans` | ✅ JWT |
| prep | `GET/PATCH .../prep`，`POST .../prep/refresh-template` | ✅ |
| 执行 | `start` / `complete`，`live-state`，`track-points`，`track` | ✅ |
| 复盘 | `review`，`review/generate` | ✅ |

C 端默认 `auto`：已登录 → API（`VITE_HIKE_PLAN_STORAGE` / `HikePlanStorageSwitch`）。

### 计划 CRUD

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/hiking/hike-plans` | 创建；body: `routeDirectionId`, `tripId?`, `plannedDate?`, `plannedStartTime?` |
| GET | `/api/hiking/hike-plans` | 列表；query: `status`, `routeDirectionId` |
| GET | `/api/hiking/hike-plans/:id` | 详情（`:id` = UUID） |
| PATCH | `/api/hiking/hike-plans/:id` | 元数据、准备完成标记 |
| POST | `/api/hiking/hike-plans/:id/start` | → `in_progress` |
| POST | `/api/hiking/hike-plans/:id/complete` | → `completed` |

### 准备阶段

| 方法 | 路径 |
|------|------|
| GET | `/api/hiking/hike-plans/:id/prep` |
| PATCH | `/api/hiking/hike-plans/:id/prep` |

**Body/Response**（与前端 `HikePlanPrepData` 对齐）：

```json
{
  "checklist": [{ "id": "gear-core", "category": "gear", "items": [{ "id": "boots", "name": "防水徒步靴", "nameCN": "防水徒步靴", "required": true, "checked": false }] }],
  "permits": [{ "id": "fi-hut", "name": "FÍ 山屋预订", "nameCN": "FÍ 山屋预订", "required": true, "obtained": false, "bookingUrl": "https://..." }],
  "transport": { "type": "mixed", "toTrailhead": { "method": "…", "estimatedDuration": 180 }, "fromTrailhead": { "method": "…", "lastDeparture": "17:30" } },
  "checklistComplete": false,
  "permitsComplete": false,
  "offlineReady": false
}
```

来源：`hikingDetail.checklistTemplates` / **`permits`** / `access`+`timeWindows`（override 优先）。PATCH 后后端重算完成态；C 端用 `offlineReady`。

**`hikingDetail.permits[]` 单项示例**：

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

已有 HikePlan 若 prep 仍为占位：准备页 **POST `.../prep/refresh-template`** 或重新 GET prep；C 端标签优先级 `titleZh` → `nameCN` → `name`。

| 场景 | 接口 |
|------|------|
| 新建计划 | `POST /hiking/hike-plans` → 服务端用当前 `hikingDetail` 初始化 prep |
| 用户勾选 | `PATCH /hiking/hike-plans/:id/prep` |
| 运营更新模板后 | `POST /hiking/hike-plans/:id/prep/refresh-template`（JWT，保留 checked/obtained） |

C 端：`hikePlansApi.refreshPrepTemplate` · 准备页「同步路线模板」按钮（云端 + 已登录）。

### 执行中（GPS + 实时）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/hiking/hike-plans/:id/live-state` | 当前段、事件、进度；`in_progress` 时含偏航 `events` |
| PATCH | `/api/hiking/hike-plans/:id/live-state` | 更新段/打卡；可选 `routeDeviationThresholdM`（默认 50m） |
| POST | `/api/hiking/hike-plans/:id/track-points` | 批量 GPS；写入后按 polyline 刷新偏航 `events` |
| GET | `/api/hiking/hike-plans/:id/track` | 完整轨迹 + summary |

**POST track-points 示例**：

```json
{
  "clientBatchId": "uuid-batch",
  "points": [
    {
      "lat": -45.1,
      "lng": 168.2,
      "altitudeM": 1200,
      "accuracyM": 8,
      "recordedAt": "2026-06-15T10:00:00.000Z"
    }
  ]
}
```

**偏航事件**（`live-state.events`，距 `hikingDetail.geometry.polyline` 超阈值时写入 `type: "route"`，回到轨迹则移除）：

```json
{
  "id": "route-deviation",
  "type": "route",
  "at": "2026-06-15T10:05:00.000Z",
  "message": "您已偏离路线 80m，建议回到轨迹",
  "threshold": { "metric": "distance_m", "current": 80, "value": 50 }
}
```

C 端行中黄条：`pickOffRouteAlert({ events, activeRisks })`；GPS flush 后 `GET live-state`。

**GET track 建议返回**：

```json
{
  "points": [ /* 同上 */ ],
  "summary": {
    "distanceKm": 52.3,
    "durationSec": 28800,
    "elevationGainM": 2100,
    "elevationLossM": 1950
  }
}
```

### 复盘

| 方法 | 路径 |
|------|------|
| GET | `/api/hiking/hike-plans/:id/review` |
| POST | `/api/hiking/hike-plans/:id/review/generate` |
| PATCH | `/api/hiking/hike-plans/:id/review` |

**generate**：根据 GPS + 计划元数据生成初稿；前端可再 PATCH 用户编辑。

---

## P2 — 路线级 Readiness（可选）

| 项 | 状态 |
|----|------|
| `GET /api/readiness/route-directions/:id?longestHike=` | ✅ `score` / `level` / `blockers` / `dayPaceVerdict`（可 7 日） |
| 前端 | `HikingTrailReadinessPanel` 优先 P2；失败回退 `computeTrailReadiness()` |
| 详情 Hero | 仍有 `summary.readinessScore` |

| 项 | 状态 |
|----|------|
| Mapbox 矢量瓦片离线下载 | C 端 ✅：`tileManifest` XYZ 或 `vectorTiles[]` → IndexedDB；行中 `tripnara-offline://` 协议 |

---

## P0 — 离线包 ✅

```
GET /api/hiking/route-directions/:routeDirectionId/offline-pack
```

| 项 | 状态 |
|----|------|
| `geojsonUrl` / `tileManifestUrl` / `checksum` / `bounds` | ✅（已实测 id=42） |
| 静态文件 | `GET /api/hiking/offline-packs/:packKey/route.geojson` 等 |
| 生产 | 设 **`HIKING_OFFLINE_PACK_BASE_URL`** |

**tile-manifest**：`tiles.templateUrl` + `recommendedCacheZoom`（OSM 栅格或 Mapbox `.pbf` 模板）；或 **`vectorTiles[]`** 显式清单（Mapbox 矢量 CDN）。C 端按 `bounds` 预取 ≤600 张写入 IndexedDB。

```json
{
  "packKey": "laugavegur-2026",
  "bounds": { "south": 63.8, "west": -19.5, "north": 64.2, "east": -18.9 },
  "tiles": {
    "provider": "mapbox-vector",
    "templateUrl": "https://cdn.example.com/tiles/{z}/{x}/{y}.pbf",
    "minZoom": 10,
    "maxZoom": 14,
    "attribution": "© Mapbox"
  },
  "recommendedCacheZoom": [11, 12, 13],
  "vectorTiles": [{ "z": 12, "x": 1024, "y": 2048, "url": "https://cdn.../12/1024/2048.pbf" }]
}
```

C 端：先 `offline-pack`，再 `fetch` URL → IndexedDB；详情 `offlinePackHints` 仅预览。

---

## 前端页面 ↔ 接口对照

| 页面 | 主要接口 |
|------|----------|
| `/dashboard/trails/explore` | `GET route-directions?tag=徒步` |
| `/dashboard/trails/:id` | `GET route-directions/:id?longestHike=` → 仅 `hikingDetail` |
| `/dashboard/readiness?trailId=` | P2 `GET readiness/route-directions/:id` + `hikingDetail` |
| `/dashboard/readiness?tripId=` | 通用 Readiness + `HikingAuditCard`（`hiking-audit`） |
| `/dashboard/trails/prep/:hikePlanId` | HikePlan prep + 体能问卷 + 离线包 |
| `/dashboard/trails/on-trail/:hikePlanId` | live-state + track-points |
| `/dashboard/trails/review/:hikePlanId` | review + track |
| `/dashboard/trails/my-hikes` | `GET hike-plans` |
| Trip Readiness | `GET readiness/trip/:id/hiking-audit` |

---

## 前端联调要点（避免「待补充」）

1. **发现页**：`GET route-directions?tag=徒步`（Axios 自动编码 tag）；读根级 `readinessScore`、`totalDistanceKm`、`estimatedDays`、`startPoint`。
2. **详情页**：`GET route-directions/:id?longestHike=`（或 JWT 默认）；**不要**解析 `metadata.hikingDetailOverride`。
3. **行程 Readiness**：`GET readiness/trip/:tripId/hiking-audit`；展示 `tripPlannedDays` / `routeSuggestedDays`。
4. **离线**：`offline-pack` → 拉 GeoJSON；瓦片按 manifest `bounds` 自行缓存（非 Mapbox 矢量服务）。
5. **HikePlan**：`/api/hiking/hike-plans`，JWT 必填。
6. **冰岛验收**：四 Tab 满配 **`GET /route-directions/106`**（`IS_LAUGAVEGUR`）；7 日变体 **`/42`**（`IS_TREKKING_WILDERNESS`，`daySkeleton` 为真实四段+缓冲，非均分占位）。

## 仍待数据/产品（非接口缺失）

- `hikingDetail` 各 Tab 满配（`fitnessMatch.noteZh`、`riskMatrixRows` merge 等）→ Admin + 种子
- Readiness 路线面板已接 P2 GET；行程 Readiness 已挂 `hiking-audit` 卡片

---

## 相关文档

- [**`hiking-module-acceptance-checklist.md`**](./hiking-module-acceptance-checklist.md) — **按页面验收表 / 前端待办 / 后端契约 / 冒烟路径**
- [`hiking-trail-detail-backend-requirements.md`](./hiking-trail-detail-backend-requirements.md) — hikingDetail 字段逐项
- [`hike-plan-lifecycle.md`](./hike-plan-lifecycle.md) — HikePlan API 表
- [`HIKING_ROUTE_DIRECTION_DETAIL.md`](./HIKING_ROUTE_DIRECTION_DETAIL.md) — 类型契约
- [`hiking-client-integration.md`](./hiking-client-integration.md) — C 端对接与禁止项
- [`HIKING-SYSTEM-ARCHITECTURE.md`](../../HIKING-SYSTEM-ARCHITECTURE.md) — 系统架构
