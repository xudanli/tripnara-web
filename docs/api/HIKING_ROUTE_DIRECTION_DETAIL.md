# Hiking Route Direction Detail API

## 路线详情（推荐）

```
GET /api/route-directions/:id?include=hikingDetail&longestHike=2
```

- 响应：`{ success, data: RouteDirection & { hikingDetail?: HikingTrailDetail } }`
- `longestHike`：0–4，与体能问卷一致，影响 `fitnessMatch.dayPaceVerdict`
- 前端类型：`src/types/hiking-trail-detail.ts`

### `data.hikingDetail` 覆盖 UI

| 区块 | 字段 |
|------|------|
| Hero 指标 | `summary.*` |
| 地图 | `geometry.polyline` 或 `polyline` |
| Tab 路线结构 | `daySkeleton`, `elevationProfile`, `terrainSummary`, `fitnessMatch` |
| Tab 风险 | `riskMatrix`, `hardGates`, `weatherRisk`, `emergency` |
| Tab 后勤 | `access`, `supplyPois`, `shelters`, `supplies`, `timeWindows` |
| Tab 替代 | `alternatives` |

## 发现列表

```
GET /api/route-directions?tag=徒步
```

列表项建议附带：`readinessScore`, `totalDistanceKm`, `totalAscentM`, `estimatedDays`, `startPoint { lat, lng }`, `routeDirectionName`。

## Phase 2

| 方法 | 路径 |
|------|------|
| GET | `/readiness/trip/:tripId/hiking-audit` |
| POST | `/demo/hiking/trail-plan/preview` |

### hiking-audit 触发

```json
{ "routeDirectionName": "IS_LAUGAVEGUR", "tags": ["徒步"] }
```

### trail-plan/preview body

```json
{
  "routeDirectionName": "IS_LAUGAVEGUR",
  "longestHike": 2,
  "placeIds": []
}
```

支持：`IS_LAUGAVEGUR`、`IS_TREKKING_WILDERNESS`、`NEPAL_EBC_TREK`

## Phase 2.5 generatePlan

`ENABLE_HARD_TREK_TRAIL_PLANNING` 默认开启；硬徒步路线写入 `log.hardTrekTrailPlan`。关闭：`ENABLE_HARD_TREK_TRAIL_PLANNING=false`。
