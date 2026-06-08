# 混合出行（embedded）— Trip.metadata 契约

> 与 PRD《混合出行行程中的徒步片段（Trip + HikePlan）》对齐。  
> 全局前缀 `/api` · 成功响应 `{ success, data }` · 错误 `{ success: false, error: { code, message } }`

---

## 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `metadata.hikingProfile` | `'none' \| 'embedded' \| 'primary'` | 行程徒步模式 |
| `metadata.hikingSegments` | `HikingSegment[]` | 嵌入徒步片段（MVP 存 JSON，无独立表） |

### `HikingSegment` 单条结构

```json
{
  "segmentId": "uuid",
  "startDate": "2026-03-10",
  "endDate": "2026-03-11",
  "routeDirectionId": 106,
  "hikePlanId": "uuid",
  "label": "Routeburn 2日",
  "readinessSnapshot": {
    "level": "ready",
    "score": 72,
    "evaluatedAt": "2026-05-20T12:00:00.000Z"
  }
}
```

前端类型：`src/types/hiking-embedded.ts`。

---

## 读写

| 操作 | 路径 | 行为 |
|------|------|------|
| 创建 | `POST /trips` | `CreateTripDto.metadata` 写入 `Trip.metadata`（与 preferences/constraints 合并） |
| 更新 | `PUT /trips/:id` | **深度合并**顶层 metadata；**`hikingSegments` 整数组替换**（非按 segmentId merge） |
| 读取 | `GET /trips/:id`、`GET /trips` | 返回完整 `metadata`（含 `hardTrekTrailPlan`、`generationProgress` 等既有键） |

### Q1 书面确认（联调阻塞项）

1. **PUT metadata 是否 merge？** 是。顶层对象键深度合并；发送 `hikingSegments` 时替换整个数组，未发送则保留库内原数组。
2. **创建时 hikingProfile 是否落库？** 是（`POST /trips` body.metadata）。
3. **embedded 无 tripId 创建 HikePlan 何时 400？** 见 [hike-plan-lifecycle.md](./hike-plan-lifecycle.md)（`FEATURE_FLAG_EMBEDDED_HIKING_SEGMENTS=true` 或与前端 Flag 同步开启）。

### 前端写入约定

- `saveSegments` / `mergeTripMetadata`：每次 PUT 携带**完整** `hikingSegments` 数组（与后端「整数组替换」一致）。
- 其它 metadata 键由 `mergeTripMetadata` 浅合并进请求体，不删除未改动的顶层键。

---

## 校验

| 规则 | 错误码 |
|------|--------|
| `hikingSegments.length` ≤ `TRIP_HIKING_SEGMENT_MAX`（默认 3） | `TRIP_SEGMENT_LIMIT` |
| 片段 `startDate`/`endDate` 落在 Trip `startDate`～`endDate` | `SEGMENT_DATE_OUT_OF_RANGE` |
| `hikePlanId` 存在且 `hikePlan.tripId ===` 当前 tripId | `HIKE_PLAN_TRIP_MISMATCH` |
| `hikingProfile` 非法枚举 | `VALIDATION_ERROR` |

客户端预检：`validateSegmentDates`、`MAX_SEGMENTS`（`src/lib/hiking-segments.ts`）。服务端仍为准。

---

## HikePlan 绑定（embedded）

| 场景 | 行为 |
|------|------|
| `FEATURE_FLAG_EMBEDDED_HIKING_SEGMENTS=true` | `POST /hiking/hike-plans` 无 `tripId` → **400** `MISSING_TRIP_ID` |
| `primary` / 无 profile / 旧客户端 | `tripId` 仍 optional |
| 带 `tripId` | Trip 须存在；调用方须为 `TripCollaborator`；禁止挂他人 Trip |

列表：`GET /hiking/hike-plans?tripId={uuid}` 仅返回该 Trip 下、当前用户的计划。

---

## 环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| `FEATURE_FLAG_EMBEDDED_HIKING_SEGMENTS` | `false` | 后端；与前端 `VITE_FF_EMBEDDED_HIKING` / `VITE_FF_EMBEDDED_HIKING_SEGMENTS` 对齐 |
| `TRIP_HIKING_SEGMENT_MAX` | `3` | 片段数量上限 |

---

## 联调用例（后端）

| ID | 检查点 |
|----|--------|
| UC-API-01 | embedded + Flag：`POST /hiking/hike-plans` 无 tripId → 400 `MISSING_TRIP_ID` |
| UC-API-02 | `GET /hiking/hike-plans?tripId=` 仅该 Trip |
| UC-API-03 | PUT metadata 后 GET Trip，`hikingSegments` round-trip |
| UC-API-04 | 片段日期越界 → 400 `SEGMENT_DATE_OUT_OF_RANGE` |
| UC-API-05 | 用户 A 不能把 HikePlan 挂到用户 B 的 tripId → 403 |

---

## 实现位置（后端）

- `src/trips/utils/embedded-hiking-trip-metadata.util.ts`
- `src/trips/trips.service.ts`（create/update）
- `src/hiking-plans/hiking-plans.service.ts`

## 前端联调三项（后端已就绪）

### 1. `PUT /trips/:id` metadata

- Body：`UpdateTripDto.metadata`，与创建字段一致。
- 服务端**深度合并**顶层键；**仅当 body 含 `hikingSegments` 时整数组替换**（未带则保留库内数组）。
- 前端 `mergeTripMetadata` + `saveSegments` 每次提交**完整** `hikingSegments[]`。
- 错误码：`TRIP_SEGMENT_LIMIT`、`SEGMENT_DATE_OUT_OF_RANGE`、`HIKE_PLAN_TRIP_MISMATCH`、`METADATA_TOO_LARGE` → `embedded-hiking-api-errors.ts`。

联调：PUT 后 `GET /trips/:id` 核对 round-trip（UC-API-03）。

### 2. `GET /trips/:tripId/hiking-summary`

- JWT + Trip 协作者；Plan Studio / 侧栏优先用此接口（`useEmbeddedHikingTrip`）。
- 字段：`tripId`、`hikingPhase`、`phaseHintZh`、`segments[].hikePlan`、`hikePlans[]`。
- 失败时回退 `metadata` + `GET /hiking/hike-plans?tripId=`。

### 3. Flag 对齐

| 前端 | 后端 |
|------|------|
| `VITE_FF_EMBEDDED_HIKING_SEGMENTS`（DEV 默认开） | `FEATURE_FLAG_EMBEDDED_HIKING_SEGMENTS=true` |

两端同时开启后：`POST /hiking/hike-plans` 无 `tripId` → `400` `MISSING_TRIP_ID`。

### 片段评估

`GET /trips/:tripId/hiking-segments/:segmentId/evaluate` → `tripsApi.evaluateHikingSegment`（片段面板「片段评估」按钮）。

---

## P1 扩展

| 项 | 路径 | 前端 |
|----|------|------|
| 徒步摘要 | `GET /trips/:tripId/hiking-summary` | `tripsApi.getHikingSummary` → `useEmbeddedHikingTrip` |
| Readiness 上下文 | `GET /readiness/route-directions/:id?plannedDate=&hikePlanId=` | `hikingApi.getRouteDirectionReadiness`；仅归因 |
| 出发门禁 | `POST /hiking/hike-plans/:id/start` | Flag 开时 prep 未完成 → 403 `READINESS_REQUIRED` |
| 历史扫描 | `scripts/scan-embedded-hiking-candidates.ts` | 后端脚本，无 C 端 |

### `hikingPhase` 枚举（P1）

`idle` · `configure_segments` · `link_plans` · `prep` · `on_trail` · `wrap_up`

标签见 `HIKING_PHASE_LABELS`（`src/lib/hiking-phase.ts`）。摘要接口优先；失败时客户端 `computeHikingPhase` 回退。

无 `hikingProfile` 时 REL2：`hardTrekTrailPlan` 或徒步 tags → `primary`（`getTripHikingProfile`）。

---

## P2 扩展

| 项 | 路径 / 行为 | 前端 |
|----|-------------|------|
| 删 Trip 级联 | `DELETE /trips/:id` 事务内删关联 HikePlan + TrackPoint | 删除确认文案提示；见 `[id].tsx` |
| 原子创建 | `POST /hiking/hike-plans/with-segment` | `hikePlansApi.createWithSegment`；404 回退 create + PUT |
| metadata 大小 | `TRIP_METADATA_MAX_BYTES`（默认 64KB） | `METADATA_TOO_LARGE` 文案映射 |
| generate-plan | `hikingProfile=embedded` | `buildGeneratePlanRequestForHiking`：`durationDays`、片段 `startDate`、`signals.embeddedHiking`、按片段日过滤 `candidatesByDate` |

### generate-plan 协作

`POST /decision-engine/v1/generate-plan` 带 `tripId` 时后端会读 `Trip.metadata` 并写入 `state.signals.embeddedHiking`、覆盖 `durationDays`。前端仍应在请求体中附带相同信号（`src/lib/hiking-generate-plan.ts`），便于联调与旧版引擎对齐。

---

## 实现位置（前端）

- `src/types/hiking-embedded.ts`、`src/types/trip-hiking-summary.ts`
- `src/lib/hiking-segments.ts`、`src/lib/trip-hiking.ts`、`src/lib/hiking-phase.ts`
- `src/hooks/useEmbeddedHikingTrip.ts`
- `src/lib/embedded-hiking-api-errors.ts`
- `src/api/trips.ts`（`getHikingSummary`）、`src/api/hiking.ts`
