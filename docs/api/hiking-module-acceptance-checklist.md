# 徒步模块 — 验收表 & 分工清单

> 配套文档：[`hiking-backend-api-summary.md`](./hiking-backend-api-summary.md) · [`hiking-client-integration.md`](./hiking-client-integration.md) · [`hike-plan-lifecycle.md`](./hike-plan-lifecycle.md)  
> 更新：2026-05 · 前端主链路已接；「待补充」多为 **hikingDetail / prep 数据未填满**。

---

## 一、按页面验收表（联调时逐项打勾）

| 页面 | 路径 | 关键接口 | 通过标准 | 负责人 |
|------|------|----------|----------|--------|
| 徒步中心 | `/dashboard/trails` | — | 四个入口可跳转 | C 端 ✅ |
| 发现 | `/dashboard/trails/explore` | `GET /route-directions?tag=徒步` | 列表 ≥1 条；卡片有里程/天数/可走指数；地图 marker 有坐标；**curl 须编码 tag** | 后端数据 + C 端 ✅ |
| 路线详情 | `/dashboard/trails/:id` | `GET /route-directions/:id?longestHike=` | `hikingDetail` 存在；四 Tab 非全「待补充」；后勤见 **FÍ 山屋** 等许可名；**勿读** `hikingDetailOverride` | 后端 ✅ id=106 · C 端 ✅ |
| 路线 Readiness | `/dashboard/readiness?trailId=` | 上 + `GET /readiness/route-directions/:id` | 分数来源「服务端评估」；日节奏有 `noteZh`（可与 `daySkeleton` 天数一致） | 后端 + C 端 ✅/⬜ 数据 |
| 行程 Readiness | `/dashboard/readiness?tripId=` | `GET /readiness/trip/:id/hiking-audit` | 徒步行程出现审计卡；**行程 X 天 vs 路线 Y 天** 有数 | 后端 metadata + C 端 ✅ |
| 准备 | `/dashboard/trails/prep/:hikePlanId` | `GET/PATCH .../prep`，`POST .../refresh-template`，离线包 | 许可显示真实 `nameCN`；勾选 PATCH 成功；进度 3/3 可「开始徒步」；旧 prep 点同步模板后更新 | **后端模板** ⬜ |
| 行中 | `/dashboard/trails/on-trail/:id` | `live-state`，`track-points`，`GET track` | 页不白屏；进度数字为 0 而非 undefined；GPS 可录；离线 GeoJSON 地图 | C 端 ✅ · live-state 数字 ⬜ 后端 |
| 复盘 | `/dashboard/trails/review/:id` | `review`，`review/generate`，`track` | 可生成复盘；GPS 海拔图有数据 | P1 API + C 端 ✅ |
| 我的徒步 | `/dashboard/trails/my-hikes` | `GET /hiking/hike-plans` | 登录后列表为云端计划；可进 prep | P1 ✅ |
| 收藏/离线 | `/dashboard/trails/saved` | 离线包同上 | 已下载包可列；收藏为本地 ID 列表 | 离线 ✅ · 收藏云 ⬜ P2 |
| 行程详情 | `/dashboard/trips/:id` | `hiking-audit` | 含徒步 metadata 时出现「行前装备·地形」卡 | C 端 ✅ |
| Demo（非生产） | `/demo/hiking/laugavegur` | `/demo/hiking/*` | 仅演示，生产详情不用 | — |

**冰岛验收路线（分工）**：

| id | `routeDirectionName` | 用途 |
|----|----------------------|------|
| **106** | `IS_LAUGAVEGUR` | **四 Tab 满配**（`riskMatrixRows`、FÍ/safe.is/巴士 许可、`permits` 等） |
| **42** | `IS_TREKKING_WILDERNESS` | **7 日荒野变体**；`daySkeleton` 已为真实 Laugavegur 四段 + 缓冲日（非均分 11.4/500 占位） |

```bash
# 满配四 Tab（106）
curl -s "http://localhost:3000/api/route-directions/106?longestHike=2" \
  -H "Authorization: Bearer <token>" | jq '.data | {
    hasOverride: (.metadata.hikingDetailOverride != null),
    suggestedDays: .hikingDetail.summary.suggestedDays,
    riskRows: (.hikingDetail.riskMatrixRows | length),
    permits: [.hikingDetail.permits[]?.nameCN]
  }'

# 7 日日段（42）
curl -s "http://localhost:3000/api/route-directions/42?longestHike=2" \
  | jq '.data.hikingDetail.daySkeleton[:3]'
# 期望：各异 distanceKm/ascentM（如 12/470、12/100、15/200），非七天 11.4/500
```

**前端页面**：`/dashboard/trails/106`（四 Tab 满配）· `/dashboard/trails/42`（7 日、真实日段，无琥珀占位条）。

---

## 二、只改前端（可独立排期）

| # | 任务 | 文件/位置 | 优先级 | 状态 |
|---|------|-----------|--------|------|
| F1 | 更新 `HIKING-SYSTEM-ARCHITECTURE.md`（地图/GPS/Readiness 已实现） | `HIKING-SYSTEM-ARCHITECTURE.md` | P2 | ✅ |
| F2 | 发现页 Chips 与 `estimatedDays`/标签本地筛选 + 说明文案 | `explore.tsx`，`filter-trails.ts` | P2 | ✅ |
| F3 | 收藏路线上云 `GET/PUT/DELETE /hiking/trail-bookmarks` | `trail-bookmarks.ts`，`saved.tsx` | P2 | ✅ |
| F4 | Mapbox 矢量瓦片按 `tileManifest` 下载与行中离线渲染 | `download-offline-tiles.ts`，`MapboxTrailMap` | P2 | ✅ |
| F5 | 行中：偏航接 `live-state.events`（`type=route`）+ `activeRisks` 兜底 | `on-trail-elevation.ts`，on-trail | P2 | ✅ |
| F6 | 行中：`ElevationProfile` + 事件钉子（GPS 剖面优先） | `on-trail-elevation.ts`，on-trail | P2 | ✅ |
| F7 | 详情页「收藏」接 `toggleTrailBookmark` | `trails/[id].tsx` | P3 | ✅ |
| F8 | 硬徒步 `generate-plan` → `trip.metadata.hardTrekTrailPlan` 展示 | plan-studio，`trips/[id].tsx` | P2 | ✅ |
| F9 | Readiness `factors` 四象限接 P2 API | `map-route-readiness.ts`，Readiness 面板 | P3 | ✅ |

**本轮已完成（供对照）**：P2 路线 Readiness、`HikingAuditCard` 上行程 Readiness、prep 许可 `titleZh`/PATCH 回滚、行中 `normalizeOnTrailState`、JSX 语法修复。

---

## 三、只列后端契约（前端已对接，验收在后端）

### P0 — 必过

| 接口 | 方法 | 验收要点 |
|------|------|----------|
| 徒步列表 | `GET /api/route-directions?tag=徒步` | 根级：`readinessScore`，`totalDistanceKm`，`totalAscentM`，`estimatedDays`，`startPoint`/`center`；**tag UTF-8 编码** |
| 路线详情 | `GET /api/route-directions/:id?longestHike=0-4` | `tags` 含徒步 → 完整 `hikingDetail`；响应 **无** `metadata.hikingDetailOverride`；merge 后 `riskMatrixRows` |
| 体能 | `GET /api/v1/fitness/profile` | JWT；`longestHike` 0–4；无 `/profile/me` |
| 详情默认档位 | 同上，省略 query + Bearer | 用 profile `longestHike` |
| 行程审计 | `GET /api/readiness/trip/:tripId/hiking-audit?longestHike=` | `tripPlannedDays`，`routeSuggestedDays`；trip 带 `routeDirectionId` 或 `routeDirectionName` |
| 离线包 | `GET /api/hiking/route-directions/:id/offline-pack` | `geojsonUrl`，`checksum`，`bounds`；生产 `HIKING_OFFLINE_PACK_BASE_URL` |

### P0 — `hikingDetail` 数据块（详见 `hiking-trail-detail-backend-requirements.md`）

| 块 | 验收 |
|----|------|
| `summary` | `suggestedDays`，`totalDistanceKm`，`readinessScore` |
| `daySkeleton` | 天数与产品一致（如 Laugavegur 4 或 7） |
| `fitnessMatch` | `suggestedDays` 非 null；`dayPaceVerdict[].noteZh` / `verdict` |
| `permits[]` | 见下 JSON；写入 prep 模板 |
| `riskMatrixRows`，`hardGates`，`emergency`，`access`，`timeWindows` | 详情 Tab 非空 |
| Admin override | `PUT metadata.hikingDetailOverride` → GET 详情与 Admin 一致 |

**`hikingDetail.permits[]` 单项：**

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

### P1 — HikePlan（部署前 `npx prisma migrate deploy`）

| 接口 | 验收 |
|------|------|
| `POST/GET/PATCH /api/hiking/hike-plans` | JWT；创建时用当前 `hikingDetail` 初始化 prep |
| `GET/PATCH .../prep` | 分组 checklist/permits/transport；`checklistComplete`，`permitsComplete`，`offlineReady` |
| `POST .../prep/refresh-template` | 刷新模板；**保留** `checked`/`obtained` |
| `POST .../start`，`.../complete` | 状态机 |
| `GET/PATCH .../live-state` | 数字字段建议默认 **0**（勿 `undefined`） |
| `POST .../track-points`，`GET .../track` | 批量 GPS + summary |
| `GET/POST/PATCH .../review`，`POST .../review/generate` | 复盘 |

**prep 许可逻辑建议**：`permitsComplete === true` 当且仅当所有 `required: true` 的项 `obtained: true`（与 C 端 `clientPermitsComplete` 一致）。

### P2 — 可选

| 接口 | 验收 |
|------|------|
| `GET /api/readiness/route-directions/:id?longestHike=` | `score`，`level`，`blockers[]`，`dayPaceVerdict[]` |
| Mapbox 矢量瓦片 CDN | 非当前 manifest 范围；单独项目 |

---

## 四、端到端冒烟路径（15 分钟）

1. 登录 → `/dashboard/trails/explore` → 打开 **id=106**（朗格迈维卢尔 / IS_LAUGAVEGUR）→ 后勤 Tab 见 **FÍ 山屋预订**、safe.is、巴士  
2. 填写体能问卷 → 详情/Readiness 日节奏有文案  
3. 「开始准备」→ 准备页 → **同步路线模板** → 许可名正确 → 勾选装备/许可 → 下载离线包  
4. **开始徒步** → 行中页正常 → 录 GPS → **结束徒步** → 复盘生成  
5. 创建含「徒步」tag 的行程 → `/dashboard/readiness?tripId=` → 审计卡 + 天数对比  

---

## 五、问题对照（常见现象 → 原因）

| 现象 | 原因 | 处理 |
|------|------|------|
| 发现页 0 条路线 | `tag=徒步` 未 URL 编码 | 用 Axios params 或 `%E5%BE%92%E6%AD%A5` |
| 详情/Tab 全「待补充」 | `hikingDetail` 空或仅通用骨架 | 四 Tab 用 **id=106** |
| 按日分段七天一模一样 | 旧 seed 均分占位（已修） | 刷新后 **id=42** 应有各异 `distanceKm`/`ascentM`；前端琥珀提示会自动消失 |
| 准备页「许可 1/2/3」 | 旧 prep 占位 | `POST refresh-template` |
| Readiness 只 4 天 | `dayPaceVerdict` 仅 4 条 | 后端补天数与 `summary.suggestedDays` |
| 点击许可无报错但不保存 | 未登录 / PATCH 401 | JWT；看 Network |
| 行中白屏 `toFixed` | live-state 缺数字 | 后端默认 0；C 端已兜底 |
| 偏航黄条不出现 | 未偏离 / 未上传 GPS / 路线无 polyline | `in_progress` + `POST track-points`；`events` 含 `type: route` |
| HikePlan 只在本地 | 未登录或 storage=local | 登录 + `auto`/API 模式 |

---

## 六、相关代码索引

| 领域 | 路径 |
|------|------|
| 详情加载 | `src/lib/load-hiking-route-detail.ts` |
| 列表字段 | `src/lib/hiking-trail-detail-ui.ts` |
| 准备归一化 | `src/lib/normalize-hike-plan-prep.ts` |
| 许可 UI | `src/lib/prep-permits-ui.ts` |
| HikePlan 仓储 | `src/services/hike-plan-repository.ts` |
| 离线包 | `src/services/ensure-hiking-offline-pack.ts` |
| 行中状态 | `src/lib/on-trail-state.ts` |
| 类型 | `src/types/hiking-trail-detail.ts`，`src/types/hike-plan.ts` |
