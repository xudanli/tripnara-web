# 全程地图 · Journey Map BFF 前端对接摘要

> **权威契约**：[`journey-map-bff-api.md`](./journey-map-bff-api.md)  
> **OpenAPI**：[`journey-map-bff-openapi.yaml`](./journey-map-bff-openapi.yaml)  
> **前端**：`src/api/journey-map.ts` · `useJourneyMapData` · `build-journey-map-model.ts`

---

## 加载策略（已实现）

| 阶段 | 请求 | 用途 |
|------|------|------|
| 首屏 | `?fields=minimal` + `If-None-Match` | 侧栏、marker、直线路线；ETag 304 |
| 二段 | `?fields=full&include=inspector` | 贴路 polyline、gaps、Inspector 证据 |

---

## 字段消费

| BFF 字段 | 前端 |
|----------|------|
| `members` / `memberGroups` | 侧栏成员筛选、`memberFilter` |
| `daySummaries` | 侧栏日程 `A → B`（前端优先 itinerary；BFF 应每天一条） |
| `dataFeeds` | 侧栏「约束与数据更新」；缺省时前端从 `dataFreshness` 推算 |
| `diversions` + `participantIds` | Inspector 分流 Tab、地图支路/标签 |
| `stats` | 侧栏行程统计 |
| `coverage.dataFreshness.inventory` | 「住宿库存」更新时间 |
| `coverage.segments[].polyline` | 主路线贴路（`buildRouteSegments`） |
| `diversions[].trunkSegmentIds` | 分叉前主路线截断 |
| `diversions[].groupA/B.polyline` | 分流支路 |
| `diversions[].merge.polylineA/B` | 汇合段 |
| `diversions[].forkAfterSegmentId` | 可选；`trunkSegmentIds` 缺省时前端可据 segment 序推算 |

---

## 后端改动摘要（2026-06-29）

| 问题 | 改动 | 文件 |
|------|------|------|
| ETag 304 不生效 | 统一计算 etag；controller 在序列化前做 304 短路；service 不再单独算 etag | `journey-map-etag.util.ts` · `trips.controller.ts` · `journey-map.service.ts` |
| `daySummaries` 缺天 | `buildDaySummaries()` 遍历全部 `TripDay`；fallback 顺序：itinerary → segment → POI → theme → `第 N 天` | `journey-map-enrichment.util.ts` |
| `dataFeeds` 空 | `buildDataFeeds()` 从 `dataFreshness` 生成 4 条（天气 / 道路 / 开放时间 / 住宿库存） | `journey-map-enrichment.util.ts` |
| POI 类型非标 | 输出前归一化为 `city` / `attraction` / `hotel` / `restaurant` / `transport` / `other`（如 `nature`→`attraction`，`accommodation`→`hotel`） | `coverage-map.service.ts` |
| `calculatedAt` 不稳定 | 改为 evidence 时间戳与 `trip.updatedAt` 的最大值；不再每次 `new Date()` | `coverage-map.service.ts` |

**ETag 验收**：`ETag` 响应头与 body `etag` 一致；带相同 `If-None-Match` 重请求返回 **304** 无 body。

**`daySummaries` 验收**：`daySummaries.length === TripDay.length`，`day` 为 1-based 连续。

---

## 前端回退

| 场景 | 行为 |
|------|------|
| 无 `tripId` | 冰岛 demo |
| BFF 404 | legacy 多请求 + coverage 推算 |
| 地图不可渲染 | demo 地图 + 真实标题 |
| segment 无 polyline | POI 直线 |
| BFF 缺 `dataFeeds` / 缺天 `daySummaries` | 前端仍可从 `coverage` / itinerary 推算（后端已补全时可忽略） |
| Header 帮助/分享/导出 | toast 占位 |

---

## 检查器（Inspector）

五 Tab UI 已实现：`活动详情` · `参与人` · `分流` · `证据` · `风险与影响`。  
后端字段需求见 [`journey-map-inspector-backend-requirements.md`](./journey-map-inspector-backend-requirements.md)。
