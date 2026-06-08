# 徒步模块 — 后端 API 摘要（前端 F3–F9）

> 全局前缀 `/api` · 信封 `{ success, data, error }`  
> C 端对接状态见 [`hiking-module-acceptance-checklist.md`](./hiking-module-acceptance-checklist.md)  
> 详细验收：[HIKING_TRAIL_DETAIL_BACKEND_REQUIREMENTS.md](./HIKING_TRAIL_DETAIL_BACKEND_REQUIREMENTS.md)

---

## 路线分享（带权限 / 过期 token）— 待后端

| 方法 | 路径 | 鉴权 |
|------|------|------|
| POST | `/hiking/route-directions/:routeDirectionId/share` | JWT |
| GET | `/hiking/route-directions/shared/:shareToken` | 公开（校验 token + 过期） |

**请求体（POST）：** `{ permission?: "VIEW" \| "EDIT", expiresAt?: ISO8601 }`  
**响应（POST）：** `{ shareToken, shareUrl: "/trails/shared/{token}", permission, expiresAt, ... }`  
**响应（GET）：** `{ routeDirection, permission, shareToken, expiresAt? }` — `routeDirection` 含 `hikingDetail`（可与 GET `/route-directions/:id` 只读字段对齐）

**C 端：** `src/api/route-direction-share.ts`（`apiClient` 与收藏同源，自动 `Authorization: Bearer`）· `ShareTrailDialog` · `/trails/shared/:shareToken`

---

## F3 — 收藏路线上云 ✅

| 方法 | 路径 | 鉴权 |
|------|------|------|
| GET | `/hiking/trail-bookmarks` | JWT |
| PUT | `/hiking/trail-bookmarks/:routeDirectionId` | JWT |
| DELETE | `/hiking/trail-bookmarks/:routeDirectionId` | JWT |

**C 端：** `src/api/trail-bookmarks.ts` · `src/lib/trail-bookmarks.ts`（已登录走 API + 本地 ID 缓存；未登录仅 localStorage）

---

## F4 — Mapbox 矢量瓦片离线 ✅

`GET /hiking/route-directions/:id/offline-pack`：`vectorTileManifestUrl` + `tileManifestUrl`

**C 端：** `downloadOfflineAssets` 拉双 manifest → `pickTileManifestForDownload` 矢量优先 → `download-offline-tiles.ts` → 行中 `tripnara-offline://`

---

## F8 — generate-plan 行程闭环 ✅

**C 端：** Plan Studio 生成后 `GET /trips/:id` 刷新；行程详情读 `metadata.hardTrekTrailPlan`

---

## F9 — Readiness 四象限 factors ✅

`GET /readiness/route-directions/:id` 响应 `factors.{season,weather,terrain,fitness}`

**C 端：** `mapRouteReadinessToTrailResult` · Readiness 面板展示 `detailZh`

---

## 行中偏航 ✅

`live-state.events` + `activeRisks`（`type: route`）— C 端 `pickOffRouteAlert({ events, risks })`
