# 徒步路线详情页 — 后端字段需求（给后端）

> 前端页面：`GET /dashboard/trails/:id`（`:id` = **route-directions 的 numeric id**）  
> 当前主接口：`GET /api/route-directions/:id?include=hikingDetail&longestHike=2`（前端已对接）  
> 响应信封：`{ success, data, error }` · 契约见 `HIKING_ROUTE_DIRECTION_DETAIL.md`

目标：**一条路线详情接口填满详情页四个 Tab + Hero + 地图**，避免前端写死「待补充」。

---

## 一、推荐接口形态（二选一）

### 方案 A（推荐）：扩展路线方向详情

```
GET /api/route-directions/:id?include=hikingDetail
```

在现有 `RouteDirection` 上增加 **`hikingDetail`** 对象（仅 `tags` 含 `徒步` 或 `routeDirectionName` 有值时返回完整结构）。

### 方案 B：独立徒步详情

```
GET /api/hiking/route-directions/:id/detail
```

返回下文 `HikingTrailDetail` 全量；前端按 id 并行请求。

---

## 二、已有字段（请保留 / 对齐）

| 字段路径 | 页面用途 | 状态 |
|----------|----------|------|
| `id`, `nameCN`, `nameEN`, `countryCode`, `regions[]`, `tags[]` | 标题、地区、标签 | ✅ 已有 |
| `seasonality.bestMonths`, `avoidMonths` | 季节徽章 | ✅ 已有 |
| `constraints.soft.maxElevationM`, `maxDailyAscentM` | Hero 最高点/爬升 | ✅ 已有 |
| `constraints.transportMode[]` | 路线类型是否徒步 | ✅ 已有 |
| `constraints.minDays`, `maxDays` | 建议天数范围 | ✅ 已有 |
| `riskProfile.level`, `factors[]`, `altitudeSickness`, `roadClosure` | Hero 难度、风险矩阵部分 | ✅ 已有 |
| `entryHubs[]` | 后勤 · 入口枢纽 | ✅ 已有（有则展示） |
| `description` | 可放 Hero 副文案 | ✅ 已有 |

---

## 三、Demo 接口已有（建议合并进 `hikingDetail`）

以下在 **`GET /api/demo/hiking/laugavegur`** 与 **`/preview`** 已存在，路线详情应 **按 routeDirection 关联**（如 `IS_LAUGAVEGUR`），不要只绑 Demo 硬编码：

| 字段 | 类型 | 页面区块 |
|------|------|----------|
| `polyline` | `{ lat, lng }[]` | Hero 地图折线 |
| `daySkeleton[]` | 见下 | Hero 天数/距离/爬升、Tab·路线结构 |
| `supplyPois[]` | 见下 | Tab·后勤补给/山屋、地图 marker |
| `elevationProfile[]` | 见下 | Tab·海拔剖面 |
| `terrainSummary` | 见下 | 剖面角标、Hero 汇总 |
| `fitnessMatch.dayPaceVerdict[]` | 见下 | 按日分段展开说明 |
| `weatherRisk` | `{ level, headlineZh, rules[] }` | 可放 Tab·风险或独立条 |

### `daySkeleton[]`

```ts
{
  day: number;           // 1-based
  theme: string;         // 如 "Landmannalaugar → Hrafntinnusker"
  distanceKm: number;
  ascentM: number;
  descentM?: number;     // 可选
  estimatedHours?: number;
}
```

### `supplyPois[]`

```ts
{
  id: string;
  nameCN: string;
  nameEN: string;
  subCategory: string;   // HUT | ROUTE_GATE | RIVER_CROSSING | WATER | ...
  lat: number;
  lng: number;
  role?: string;
  elevation_m?: number;
  capacity?: number;     // 山屋容量，可选
  bookingRequired?: boolean;
  feeEstimate?: string;
}
```

### `elevationProfile[]`

```ts
{
  distance: number;      // 米，沿程累计距离
  lat: number;
  lng: number;
  elevation: number;   // 米
  slope: number;         // %
  cumulativeAscent: number;
}
```

### `terrainSummary`（preview 建议始终返回，勿缺省）

```ts
{
  cumulativeAscentM: number;
  maxSlopePct: number;
  totalDistanceKm: number;
  effortScore: number;
  difficulty: string;
  dataSource: 'live_dem' | 'cached_fixture';
}
```

---

## 四、仍缺失字段（详情页「待补充」来源）

### 4.1 Hero 汇总 `summary`（建议顶层）

```ts
hikingDetail.summary: {
  totalDistanceKm: number;
  totalAscentM: number;
  totalDescentM?: number;
  suggestedDays: number;
  estimatedTimeMin?: number;      // 全程建议耗时
  maxElevationM: number;
  minElevationM?: number;
  difficulty: string;             // 与 riskProfile.level 可对齐
  readinessScore?: number;        // 0–100，发现页卡片「可走指数」
  loopType?: 'point_to_point' | 'loop' | 'out_and_back';
}
```

### 4.2 地图 `geometry`（若与 polyline 分开）

```ts
hikingDetail.geometry: {
  polyline: { lat: number; lng: number }[];
  startPoint?: { lat, lng, nameCN };
  endPoint?: { lat, lng, nameCN };
}
```

### 4.3 Tab「路线结构」— 地理分段 `segments[]`（可选，比 daySkeleton 更细）

```ts
hikingDetail.segments: Array<{
  index: number;
  nameZh: string;
  distanceKm: number;
  ascentM: number;
  maxSlopePct?: number;
  exposureLevel?: 'low' | 'medium' | 'high';
  estimatedHours?: number;
  keyNodes?: Array<{
    type: 'water' | 'river_crossing' | 'shelter' | 'viewpoint' | 'exit';
    nameZh: string;
    lat?: number;
    lng?: number;
    noteZh?: string;
  }>;
}>;
```

### 4.4 Tab「风险与约束」

#### 风险矩阵（结构化，替代前端写死「待评估」）

```ts
hikingDetail.riskMatrix: {
  weatherSensitivity: 'low' | 'medium' | 'high';
  exposureLevel: 'low' | 'medium' | 'high';
  riverCrossing: boolean;
  altitudeSickness: boolean;
  roadClosureRisk: boolean;
  signalBlackout: boolean;
  riskTags?: string[];            // exposure, river_crossing, snow, ...
};
```

#### 硬门控（替换前端静态三条）

```ts
hikingDetail.hardGates: Array<{
  id: string;
  category: 'wind' | 'precipitation' | 'temperature' | 'visibility' | 'other';
  titleZh: string;
  ruleZh: string;                   // 展示文案
  threshold?: string;               // 如 ">12m/s"
}>;
```

#### 备案与救援

```ts
hikingDetail.emergency: {
  rescuePhone?: string;
  registrationPointZh?: string;     // 登记点
  nearestExitPoints?: Array<{
    nameZh: string;
    lat?: number;
    lng?: number;
    distanceKm?: number;
    noteZh?: string;
  }>;
};
```

### 4.5 Tab「后勤与补给」

#### 到达方式

```ts
hikingDetail.access: {
  driving?: {
    parkingNameZh: string;
    parkingLat?: number;
    parkingLng?: number;
    driveDurationMin?: number;
    driveDistanceKm?: number;
    noteZh?: string;
  };
  transit?: {
    scheduleZh: string;             // 班次窗口
    bookingUrl?: string;
    seasonNoteZh?: string;
  };
};
```

#### 补给设施

```ts
hikingDetail.supplies: {
  waterDensity?: 'low' | 'medium' | 'high';  // 水源点密度
  waterSources?: Array<{ nameZh, lat?, lng?, seasonal?: string }>;
  toilets?: Array<{ nameZh, lat?, lng? }>;
  // supplyPois 可与上文合并，subCategory 区分类型
};
```

#### 营地/山屋（扩展 supplyPois 或独立）

```ts
hikingDetail.shelters: Array<{
  id: string;
  nameCN: string;
  nameEN?: string;
  lat: number;
  lng: number;
  elevation_m?: number;
  capacity?: number;
  bookingRequired: boolean;
  bookingUrl?: string;
  feeZh?: string;                   // 费用说明
  openSeason?: string;
}>;
```

#### 时间窗口

```ts
hikingDetail.timeWindows: {
  suggestedDepartTime?: string;     // "07:00" 或 ISO
  lastReturnBusTime?: string;
  sunsetBufferMin?: number;         // 日落前需到达下撤段
  daylightHoursNoteZh?: string;
};
```

### 4.6 Tab「替代与修复」

```ts
hikingDetail.alternatives: {
  planBRoutes: Array<{
    id: string;
    titleZh: string;
    summaryZh: string;              // 同景观更稳 / 距离更短
    distanceKm?: number;
    reasonZh?: string;
    routeDirectionId?: number;      // 可跳转另一条路线
  }>;
  exitPoints: Array<{
    id: string;
    nameZh: string;
    distanceAlongTrailKm: number;
    lat?: number;
    lng?: number;
    noteZh?: string;
  }>;
  repairHints: Array<{
    scenario: 'delay' | 'fatigue' | 'weather' | 'injury';
    titleZh: string;
    actionZh: string;               // 如何改路线
  }>;
};
```

---

## 五、完整 `hikingDetail` 示例 JSON

```json
{
  "success": true,
  "data": {
    "id": 42,
    "nameCN": "朗格迈维卢尔步道",
    "countryCode": "IS",
    "tags": ["徒步"],
    "routeDirectionName": "IS_LAUGAVEGUR",
    "hikingDetail": {
      "summary": {
        "totalDistanceKm": 55,
        "totalAscentM": 2100,
        "suggestedDays": 4,
        "estimatedTimeMin": 1440,
        "maxElevationM": 1120,
        "difficulty": "challenging",
        "readinessScore": 72
      },
      "geometry": {
        "polyline": [{ "lat": 63.99, "lng": -19.06 }]
      },
      "daySkeleton": [
        { "day": 1, "theme": "Landmannalaugar → Hrafntinnusker", "distanceKm": 12, "ascentM": 470 }
      ],
      "elevationProfile": [],
      "terrainSummary": {
        "totalDistanceKm": 55,
        "cumulativeAscentM": 2100,
        "maxSlopePct": 28,
        "effortScore": 7.2,
        "difficulty": "challenging",
        "dataSource": "live_dem"
      },
      "supplyPois": [],
      "riskMatrix": {
        "weatherSensitivity": "high",
        "exposureLevel": "high",
        "riverCrossing": true,
        "altitudeSickness": false,
        "roadClosureRisk": false,
        "signalBlackout": true
      },
      "hardGates": [
        { "id": "wind", "category": "wind", "titleZh": "风速", "ruleZh": "超过 12m/s 禁止暴露山脊路段" }
      ],
      "emergency": {
        "rescuePhone": "112",
        "registrationPointZh": "Landmannalaugar 访客中心"
      },
      "access": {
        "driving": { "parkingNameZh": "Landmannalaugar 停车场", "driveDurationMin": 180 },
        "transit": { "scheduleZh": "夏季巴士 08:00–10:00 班次有限" }
      },
      "supplies": { "waterDensity": "medium" },
      "timeWindows": { "suggestedDepartTime": "07:00", "lastReturnBusTime": "17:30" },
      "alternatives": {
        "planBRoutes": [],
        "exitPoints": [],
        "repairHints": []
      }
    }
  }
}
```

---

## 六、发现页列表额外字段（`GET /route-directions?tag=徒步`）

| 字段 | 类型 | 用途 |
|------|------|------|
| `readinessScore` | `number` 0–100 | 卡片「可走指数」 |
| `totalDistanceKm` | `number` | 卡片距离 |
| `totalAscentM` 或 `elevationGainM` | `number` | 卡片爬升 |
| `estimatedDays` | `number` | 卡片天数 |
| `center` 或 `startPoint` | `{ lat, lng }` | 地图模式打点（**当前用国家中心近似**） |

---

## 七、优先级（后端排期）

| 优先级 | 字段组 | 解锁页面区域 |
|--------|--------|----------------|
| **P0** | `geometry.polyline` + `supplyPois` + `daySkeleton` + `elevationProfile` + `terrainSummary` | 地图、路线结构、后勤补给、Hero 数字 |
| **P0** | `summary.*` | Hero 五项指标不再「待计算」 |
| **P1** | `riskMatrix` + `hardGates` + `emergency` | 风险 Tab 全显示 |
| **P1** | `access` + `timeWindows` + `supplies` | 后勤 Tab 到达/时间/厕所 |
| **P2** | `alternatives.*` + `segments[]` | 替代 Tab + 更细分段 |
| **P2** | 列表 `readinessScore` + `center` | 发现页地图/卡片 |

---

## 八、与现有接口关系

| 接口 | 关系 |
|------|------|
| `GET /demo/hiking/laugavegur` | 融资 Demo；字段应能按 `routeDirectionName` 挂到 `route-directions/:id` |
| `GET /readiness/trip/:tripId/hiking-audit` | **行程级**行前装备，不是路线详情 |
| `POST /decision-engine/v1/generate-plan` | **行程级** Trail 计划，不是路线详情 |

---

## 九、前端对接说明

后端补齐后，前端将：

1. 优先读 `GET /route-directions/:id` 的 `hikingDetail`；
2. 删除占位「待补充」文案，改为字段驱动；
3. 冰岛 Demo 仅作 `routeDirectionName === 'IS_LAUGAVEGUR'` 的过渡，最终统一走路线详情接口。

文档维护：`src/types/hiking.ts`（Demo 类型）、`src/pages/trails/[id].tsx`（页面绑定清单）。
