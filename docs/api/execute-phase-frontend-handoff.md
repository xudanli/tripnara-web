# 执行阶段 · 前端接入说明

**后端仓库：** 本文档供前端仓库 `/dashboard/execute` 联调使用。  
**Global prefix：** `/api`  
**统一响应：** `{ success: boolean, data?: T, error?: { code, message } }`

**关联：** [execute-phase-backend-tasks.md](./execute-phase-backend-tasks.md)

**前端实现索引：**

| 模块 | 文件 |
|------|------|
| 应用推荐方案 API | `src/api/trip-constraint-solver.ts` → `applyExecutionRecommendation` |
| 类型 SSOT | `src/types/trip-execution-advisory.ts` |
| 行中守护 Hook | `src/hooks/useTripExecutionAdvisory.ts` |
| 执行页接入 | `src/pages/execute/index.tsx` → `handleApplyAdvisoryPlan` |
| 关键证据 | `placesApi.getEvidence` · `loadPlaceEvidence` |
| 因果链 Tier-3 | `src/hooks/useExecuteCausalInsight.ts` |
| 下一步导航 | `src/lib/execute-navigation.util.ts` → `resolveNextStopCoordinates` |

---

## 1. Plan B 应用（T-04）

### API

```
POST /api/trips/:tripId/in-trip/execution-advisory/recommendations/:recommendationId/apply
```

### 请求体

```typescript
interface ApplyExecutionRecommendationRequest {
  confirm: true;
  clientTimestamp?: string; // ISO 8601
}
```

### 响应体

```typescript
interface ApplyExecutionRecommendationResponse {
  applied: boolean;
  executionAdvisory: TripExecutionAdvisoryDto;
  scheduleMutations: Array<{
    type: 'SHORTEN_STAY' | 'SKIP_ITEM' | 'REPLACE_ITEM';
    itemId: string;
    deltaMinutes?: number;
  }>;
  updatedSchedule: {
    date: string;
    schedule: {
      items: Array<{
        placeId: number | string;
        placeName: string;
        startTime: string;
        endTime: string;
        status?: 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
      }>;
    };
  };
}
```

### 错误码

| code | 场景 | 前端处理 |
|------|------|----------|
| `RECOMMENDATION_NOT_FOUND` | id 无效 | toast + 重新 GET advisory |
| `RECOMMENDATION_EXPIRED` | validUntil 已过 | 重新 GET advisory 后展示新方案 |
| `RECOMMENDATION_NO_OP` | actionType=keep | 不调用 apply；按钮 disabled 或隐藏 |
| `WRITE_CHAIN_BLOCKED` | 决策写链开启 | `handleWriteChainBlockedError` → 决策空间 |

### 前端封装

`tripConstraintSolverApi.applyExecutionRecommendation(tripId, recommendationId, body)`

写链开启时客户端前置拦截：`assertExecutionApplyRecommendationAllowed`

### 执行页接入

`handleApplyAdvisoryPlan` → `ExecuteDecisionSidebar.onApplyPlan`（advisory `recommendations[]` 优先于 Neptune fallback）

---

## 2. 地点关键证据（T-05）

### API

```
GET /api/places/:placeId/evidence?date=YYYY-MM-DD&includeWeather=true&includeTraffic=true
```

### 响应 SSOT

对齐 `src/api/places.ts` → `PlaceEvidenceResponse`

**增强点（2026-07-07）：**

- `date` 参数驱动 `OpeningHoursUtil.getHoursForDate`（非仅 today）
- `businessHours.exceptions` 按 `date` 过滤
- 有 PostGIS 坐标时优先 Open-Meteo 逐日预报（含 `wind.speed` m/s）
- 无实时预报时降级 `Place.metadata.weather`

### 前端行为

- `loadPlaceEvidence`：`nextStop.placeId` 变化时自动加载
- 404 / `NOT_FOUND`：toast + `placeEvidenceEmpty` 空态文案（非静默）
- 「查看预测证据」：`onViewEvidence` 触发加载

---

## 3. 读模型轮询（T-01 / T-02）

`useTripExecutionAdvisory` · 30s 轮询 · `tripConstraintSolverApi.getExecutionAdvisory`

**causalInsight Tier-3 规则：**

- `advisory.causalInsight.causalStory.chain.length >= 3` → 不拉 `GET .../causal-trace`
- 仅 `linkedProblemId` 无 chain → 懒拉 Tier-3

---

## 4. nextStop 导航（T-03）

**SSOT：** `GET /api/trips/:id/state`（**无需**传 `STATE_NOW` / `now` 查询参数；服务端按行程时区计算）

```typescript
import { resolveNextStopCoordinates, buildGoogleMapsDirectionsUrl } from '@/lib/execute-navigation.util';

const coords = resolveNextStopCoordinates(tripState?.nextStop);
if (coords) window.open(buildGoogleMapsDirectionsUrl(coords));
```

字段直读：

```typescript
const lat = tripState?.nextStop?.Place?.latitude;
const lng = tripState?.nextStop?.Place?.longitude;
const eta = tripState?.nextStop?.estimatedArrivalTime ?? tripState?.eta;
```

`estimatedArrivalTime` 已叠加 `metadata.inTripDelayMinutes`。

---

## 5. 联调检查清单

- [ ] Live 右栏 Plan B 来自 `recommendations[]`，非 `DEFAULT_PLANS`
- [ ] 「应用此方案」调用 POST apply，成功后刷新 advisory + schedule
- [ ] 因果链 Tab 有 `chain[]` 时不请求 causal-trace
- [ ] 下一步卡片 `latitude/longitude` 非空，Maps 导航可用
- [ ] 证据面板 404 有空态；冰岛场景顶栏可展示 `evidence.weatherWindow.wind.speed`

---

## 6. 联调行程（2026-07-07）

| 字段 | 值 |
|------|-----|
| **tripId** | `1ae5cd8b-84ba-457d-9e0b-50ac3813a104` |
| **status** | `TRAVELING` |
| **页面** | `/dashboard/execute?tripId=1ae5cd8b-84ba-457d-9e0b-50ac3813a104` |
| **脚本** | `BACKEND_HOST=10.107.226.174 TRIP_ID=... ./scripts/test-execute-phase-apis.sh` |
| **MVP** | `TEST_WRITE_CHAIN=1 TRIP_ID=... npm run test:execute-phase-mvp`（后端 `EFFECTIVE_PLAN_WRITE_CHAIN=1`） |

### 实测结果

| 接口 | 结果 | 备注 |
|------|------|------|
| GET execution-advisory | ✅ | 2 recommendations + causalInsight chain=4 |
| GET in-trip/today | ✅ | environmentAlerts=1 |
| GET schedule | ✅ | 3 items |
| GET places/evidence | ✅ | wind.speed 有值 |
| POST apply | ⚠️ | `WRITE_CHAIN_BLOCKED`（决策写链开启，符合预期） |
| GET state.nextStop | ✅ | `Place.latitude/longitude` 已返回（如蓝湖 63.8804, -22.4495） |

---

*文档版本：v1.2 · 2026-07-07*
