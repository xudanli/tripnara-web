# HikePlan 全生命周期 API

全局前缀 `/api`，信封 `{ success, data, error }`。

## 计划

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/hiking/hike-plans` | 创建 |
| GET | `/hiking/hike-plans` | 列表 `?status=&routeDirectionId=&tripId=` |
| GET | `/hiking/hike-plans/:id` | 详情 |
| PATCH | `/hiking/hike-plans/:id` | 更新元数据/准备标记 |
| POST | `/hiking/hike-plans/:id/start` | 开始徒步 → `in_progress`；`FEATURE_FLAG_HIKE_START_READINESS_REQUIRED=true` 且 prep 未完成 → 403 `READINESS_REQUIRED` |
| POST | `/hiking/hike-plans/:id/complete` | 结束 → `completed` |

### POST body（创建）

```json
{
  "routeDirectionId": 42,
  "tripId": "optional-trip-uuid",
  "plannedDate": "2026-06-15",
  "plannedStartTime": "08:00"
}
```

**embedded（混合出行）**：后端 `FEATURE_FLAG_EMBEDDED_HIKING_SEGMENTS=true` 时，`tripId` **必填**；缺失 → `400` `MISSING_TRIP_ID`。Trip.metadata 见 [embedded-hiking-trip-metadata.md](./embedded-hiking-trip-metadata.md)。

**列表**：`GET /hiking/hike-plans?tripId={uuid}` 仅返回该 Trip 下、当前用户的计划。

**P2 原子创建**：`POST /hiking/hike-plans/with-segment` — 一次创建 HikePlan 并追加 `Trip.metadata.hikingSegments[]`（见 [embedded-hiking-trip-metadata.md](./embedded-hiking-trip-metadata.md)）。

## 准备

| 方法 | 路径 |
|------|------|
| GET | `/hiking/hike-plans/:id/prep` |
| PATCH | `/hiking/hike-plans/:id/prep` |

返回/提交分组 `checklist[]`、`permits[]`、`transport` 及完成标记（`checklistComplete` / `permitsComplete` / `offlineReady`）。

- **POST** 创建 HikePlan：用当前 `hikingDetail`（含 Admin override）生成 prep 写入库  
- **GET** prep：若库内为空则按 `hikingDetail` 重新生成并写回；旧扁平 `labelZh` 数据会自动迁移  
- **PATCH** prep：用户勾选/许可；合并后服务端重算 `checklistComplete` / `permitsComplete`  
- **POST** `.../prep/refresh-template`（JWT）：运营改过模板后，按最新 `hikingDetail` 重生成 prep，**保留同 id 的 `checked` / `obtained`**

### 模板优先级（服务端）

| 来源 | 优先级 |
|------|--------|
| `hikingDetailOverride.checklistTemplates` / `permits` | 最高 |
| `HikingTrailDetailService` 代码种子 | 无 override 时 |
| 用户 `hike_plan.prep` | 仅 `checked` / `obtained` 等状态，不覆盖运营模板 |

Admin 验收：改完清单后用 `GET .../prep-preview` 或 `GET route-directions/:id` 看 `hikingDetail.checklistTemplates` / `permits`。  
详见后端 `HIKING_DETAIL_OVERRIDE_API.md`、`HIKING_ADMIN_API.md`。

字段约定：清单项用 `name` / `nameCN`、`checked`；许可用 `obtained`（勿用 `labelZh` / `titleZh` / `status`）。

## 执行（GPS + 实时状态）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/hiking/hike-plans/:id/live-state` | 执行页状态 |
| PATCH | `/hiking/hike-plans/:id/live-state` | 更新进度/事件；可选 `routeDeviationThresholdM`（默认 50m） |
| POST | `/hiking/hike-plans/:id/track-points` | 批量上传 GPS；服务端用最新点与 `hikingDetail.geometry.polyline` 算偏航 |
| GET | `/hiking/hike-plans/:id/track` | 轨迹点 + summary |

### 路线偏航（`live-state.events`）

- **时机**：`POST track-points` 写入后、`GET live-state`（`in_progress`）时刷新。
- **规则**：距 polyline 大于阈值 → 写入/更新 `type: "route"` 事件；回到阈值内 → 移除该事件。
- **阈值**：默认 50m；`PATCH live-state` 可设 `routeDeviationThresholdM`。

```json
{
  "id": "route-deviation",
  "type": "route",
  "at": "2026-06-15T10:05:00.000Z",
  "message": "您已偏离路线 80m，建议回到轨迹",
  "noteZh": "您已偏离路线 80m，建议回到轨迹",
  "threshold": { "metric": "distance_m", "current": 80, "value": 50 }
}
```

C 端：`pickOffRouteAlert({ events, activeRisks })` 优先读 `events` 中 `route`；GPS 上传后 `GET live-state` 刷新（`onTrackFlushed` + 20s 轮询）。

### POST track-points

```json
{
  "clientBatchId": "batch-uuid",
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

## 复盘

| 方法 | 路径 |
|------|------|
| GET | `/hiking/hike-plans/:id/review` |
| POST | `/hiking/hike-plans/:id/review/generate` |
| PATCH | `/hiking/hike-plans/:id/review` |

前端类型：`src/types/hike-plan.ts` · 客户端：`src/api/hike-plans.ts`

**C 端存储**：`auto` 模式下已登录仅调本 API；未登录或手动切换为本地 IndexedDB。GPS 云端模式下断网会本地队列，恢复后 `POST track-points` 同步。
