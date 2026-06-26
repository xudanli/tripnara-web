# 约束求解器双阶段读模型 — 后端 DTO 对齐文档

> **产品定位**  
> - 行前：**Plan Validation**（方案验证器）—「这套行程能不能成立？」  
> - 行中：**Runtime Assurance**（执行守护器）—「按现在真实情况，今天还能不能继续？」  
>
> **前端契约**  
> - `src/types/trip-feasibility-report.ts` → `TripFeasibilityReportDto`  
> - `src/types/trip-execution-advisory.ts` → `TripExecutionAdvisoryDto`  
> - 聚合封装（过渡期）：`src/api/trip-constraint-solver.ts`  
> - 适配器：`src/lib/trip-feasibility-report.adapter.ts`、`src/lib/trip-execution-advisory.adapter.ts`  
>
> **Swagger Tag**：`trip-constraint-solver`  
> **Global prefix**：`/api`  
> **关联**：Loop 决策闭环见 [trip-loops-frontend.md](./trip-loops-frontend.md)（薄编排层，内部委托本模块 `feasibility-report` 链）

---

## 后端实现（P0）

> **Swagger Tag**: `trip-constraint-solver`  
> **响应**: `{ success, data, error }`

### 行前 — Plan Validation

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/trips/:tripId/feasibility-report` | 整趟可执行性报告 `TripFeasibilityReportDto` |
| `POST` | `/trips/:tripId/feasibility-report/validate` | 重验证并写入 `metadata.feasibilityReportSnapshot` |
| `GET` | `/trips/:tripId/feasibility-report/issues/:issueId/repair-options` | 修复选项（复用 readiness） |

**聚合来源**

- `CoverageMapService.getReadinessScore` → dimensions / issues
- `TripConflictsService.getConflicts` → schedule/transport issues + L3-PROOF
- `metadata.feasibilityReportSnapshot` → `verifiedAt` / `verifiedForTripVersion` / `isStale`

**版本字段**（`GET /trips/:id`）

- `revision` — 单调递增（`metadata.revision` 或 `updatedAt` 回退）
- `revisionLabel` — 如 `V12`

### 行中 — Runtime Assurance

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/trips/:tripId/in-trip/execution-advisory` | `TripExecutionAdvisoryDto` |

要求：`IN_TRIP_EXECUTION_ENABLED=true` 且行程 `status=TRAVELING`。

**聚合来源**

- `AnchorHandoffService` — 今日时间轴
- `CoverageMapService.getTodayReadinessScore` — `technicalFindings`
- `EnvironmentRadarService.listOpenEvents` — deviations / recommendations

### 错误码

| code | 场景 |
|------|------|
| `EXECUTION_ADVISORY_NOT_IN_TRIP` | 非 `TRAVELING` |
| `EXECUTION_ADVISORY_DISABLED` | 行中模块未启用 |
| `FEASIBILITY_REPORT_STALE` | 非错误；`isStale=true` 时仍 200 |

### 前端切换

P0 就绪后：`tripConstraintSolverApi` 直读本模块；**404/501** 时回退 adapter。  
`EXECUTION_ADVISORY_*` 错误**不回退**，由 `useTripExecutionAdvisory` 展示禁用/非行中状态。

| 前端封装 | 路径 |
|----------|------|
| `getFeasibilityReport` | `GET .../feasibility-report` |
| `revalidateFullTrip` | `POST .../feasibility-report/validate` |
| `getIssueRepairOptions` | `GET .../issues/:issueId/repair-options` |
| `getExecutionAdvisory` | `GET .../in-trip/execution-advisory` |

---

## 1. 设计原则

### 1.1 一个内核，两个读模型

底层可共用 **Constraint Solver、Gate、VERIFY、Readiness、Repair**，但**不要让两个页面读同一个大 DTO**。

| 维度 | 行前 `TripFeasibilityReportDto` | 行中 `TripExecutionAdvisoryDto` |
|------|--------------------------------|-----------------------------------|
| 核心问题 | 整趟方案是否成立 | 当前计划是否仍可执行 |
| 时间范围 | 全行程 | 今天 / 下一站 / 未来数小时 |
| 数据性质 | 静态约束 + 预测 | 实时事实 + 最新预测 |
| 默认动作 | 修改、替换、比方案 | 跳过、缩短、改道、保持 |
| Plan B 粒度 | 整趟 / 单日 / 单点替换 | 下一站 / 今日重排（最多 3 项） |
| 证据展示 | 详情折叠区（L3-PROOF） | 「为什么」折叠区 |
| 用户语言 | 「存在潜在风险」 | 「45 分钟后可能无法进入」 |

### 1.2 响应包装

与现有 BFF 一致：

```json
{
  "success": true,
  "data": { /* TripFeasibilityReportDto 或 TripExecutionAdvisoryDto */ },
  "error": null
}
```

错误时 `success: false`，`error: { code, message, details? }`。

### 1.3 版本与过期（行前 P0）

报告必须绑定**行程版本**，避免用户改行程后仍看到旧的「可执行」。

| 字段 | 说明 |
|------|------|
| `verifiedForTripVersion` | 验证时绑定的行程版本（建议单调递增整数或 UUID revision） |
| `currentTripVersion` | 当前行程版本（GET 时由服务端读取） |
| `isStale` | `verifiedForTripVersion !== currentTripVersion` 时为 `true` |
| `verifiedAt` | 验证完成时间 ISO 8601 |

前端过渡期用 `trip.updatedAt` 与 `score.calculatedAt` 启发式判断过期；**后端应提供权威 `tripRevision` 字段**（见 §3.1）。

---

## 2. API 清单

### 2.1 行前 — 可执行性报告

| 方法 | 路径 | 说明 | 优先级 |
|------|------|------|--------|
| `GET` | `/trips/:tripId/feasibility-report` | 获取整趟可执行性报告（读模型） | **P0** |
| `POST` | `/trips/:tripId/feasibility-report/validate` | 触发整趟重验证（异步可返回 jobId） | **P0** |
| `POST` | `/trips/:tripId/feasibility-report/validate-scope` | 局部验证（单日 / 单 issue / 单路线） | **P1** |
| `GET` | `/trips/:tripId/feasibility-report/issues/:issueId/repair-options` | 问题修复选项（可复用 readiness repair） | P0（可 redirect） |
| `POST` | `/trips/:tripId/feasibility-report/issues/:issueId/preview-repair` | 修复预览 diff（修改前/后/影响） | **P1** |
| `POST` | `/trips/:tripId/feasibility-report/issues/:issueId/apply-repair` | 应用修复（可复用 readiness apply-repair） | P0（可 redirect） |

### 2.2 行中 — 实时执行建议

| 方法 | 路径 | 说明 | 优先级 |
|------|------|------|--------|
| `GET` | `/trips/:tripId/in-trip/execution-advisory` | 今日执行守护读模型 | **P0** |
| `POST` | `/trips/:tripId/in-trip/execution-advisory/recommendations/:id/apply` | 应用推荐方案（缩短/跳过/改道） | **P1** |
| `GET` | `/trips/:tripId/in-trip/execution-advisory/recommendations/:id/preview` | 调整后果对比（可选，也可合并在 GET） | P2 |

### 2.3 与现有接口关系（过渡期）

前端当前**未直连**上表新路径，而是从下列接口拼装：

| 读模型 | 过渡期数据源 |
|--------|----------------|
| `TripFeasibilityReportDto` | `GET /readiness/trip/:tripId/score` + `GET /trips/:id` |
| 整趟重验证 | `POST /readiness/refresh-evidence` + 再 GET score |
| 局部验证 | `POST /readiness/refresh-evidence`（`evidenceId` = issueId） |
| 修复选项 / 应用 | `POST /readiness/repair-options`、`POST /readiness/apply-repair` |
| `TripExecutionAdvisoryDto` | `GET /trips/:id/in-trip/today` + `GET /trips/:id/state` + `GET .../environment/events` + `GET /v2/.../realtime/state/:id/predict` |

后端落地 P0 后，前端将改为直读 `feasibility-report` / `execution-advisory`，适配器仅作 fallback。

---

## 3. 行前 DTO：`TripFeasibilityReportDto`

### 3.1 完整 JSON 示例

```json
{
  "tripId": "trip-uuid",
  "tripTitle": "冰岛 8 日自驾",
  "dateRangeLabel": "7月12日—7月19日",

  "verdict": {
    "status": "ADJUST_REQUIRED",
    "headline": "当前方案基本可行，需要调整",
    "subheadline": "有 2 项阻塞、3 项风险"
  },

  "overallScore": 78,

  "verifiedAt": "2026-06-20T16:32:00+00:00",
  "verifiedForTripVersion": "12",
  "currentTripVersion": "15",
  "isStale": true,

  "dimensions": [
    {
      "key": "schedule",
      "label": "日程可行性",
      "score": 82,
      "statusLabel": "1项风险",
      "issueCount": 1,
      "blockerCount": 0
    },
    {
      "key": "transport",
      "label": "道路与交通",
      "score": 65,
      "statusLabel": "2项阻塞",
      "issueCount": 2,
      "blockerCount": 2
    },
    {
      "key": "booking",
      "label": "开放与预订",
      "score": 90,
      "statusLabel": "正常",
      "issueCount": 0,
      "blockerCount": 0
    },
    {
      "key": "environment",
      "label": "天气与环境",
      "score": 74,
      "statusLabel": "2项待确认",
      "issueCount": 2,
      "blockerCount": 0
    }
  ],

  "dayTimeline": [
    {
      "dayNumber": 1,
      "tripDayId": "day-uuid-1",
      "status": "ok",
      "summary": null,
      "issueIds": []
    },
    {
      "dayNumber": 3,
      "tripDayId": "day-uuid-3",
      "status": "blocked",
      "summary": "F-road 与车辆不匹配",
      "issueIds": ["issue-f208-vehicle"]
    }
  ],

  "issues": [
    {
      "id": "issue-f208-vehicle",
      "priority": "must_handle",
      "category": "transport",
      "title": "F-road 与车辆不匹配",
      "message": "第 3 天路线含 F208，当前车辆为两驱，不满足高地道路要求",
      "affectedDays": [3],
      "tripDayId": "day-uuid-3",
      "severity": "high",
      "actionRequired": "更换四驱车或替换为铺装道路路线",
      "repairOptions": [
        {
          "id": "repair-swap-4wd",
          "label": "更换四驱车",
          "description": "将租车类型升级为四驱",
          "impactSummary": "可执行性 65 → 92"
        }
      ],
      "proofs": [
        {
          "entity": "F208 路段",
          "constraint": "仅允许符合要求的四驱车辆通行",
          "currentFact": "车辆类型为 2WD",
          "evidenceSource": "冰岛道路管理规则",
          "observedAt": "2026-06-20T00:00:00Z",
          "validUntil": "2026-07-19T23:59:59Z",
          "ruleId": "is.froad.vehicle_class",
          "confidence": 0.95,
          "evidenceType": "L3-PROOF",
          "conclusion": "违反硬约束"
        }
      ]
    }
  ],

  "alternatives": [
    {
      "id": "current",
      "name": "当前方案",
      "score": 0.59,
      "executabilityRate": 82,
      "drivingHours": 19,
      "isCurrent": true
    },
    {
      "id": "variant-stable",
      "name": "方案 B：稳定优先",
      "score": 0.55,
      "executabilityRate": 100,
      "drivingHours": 16,
      "href": "/trips/:tripId/plan-variants#stable"
    }
  ],

  "summary": {
    "mustHandle": 2,
    "suggestAdjust": 3,
    "pendingConfirm": 2,
    "blockers": 2
  }
}
```

### 3.2 字段说明

#### 顶层

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `tripId` | string | ✓ | |
| `tripTitle` | string | ✓ | 展示用标题 |
| `dateRangeLabel` | string | | 本地化日期范围，后端可返回或前端格式化 |
| `verdict` | object | ✓ | 首屏结论（**用户语言**，见 §4.1） |
| `overallScore` | number 0–100 | ✓ | 综合可执行性分数 |
| `verifiedAt` | string ISO | | 最近验证时间；未验证时省略 |
| `verifiedForTripVersion` | string | | 报告绑定版本 |
| `currentTripVersion` | string | | 当前行程版本 |
| `isStale` | boolean | ✓ | 报告是否过期 |
| `dimensions` | array | ✓ | 四维瓦片，固定 4 项 key |
| `dayTimeline` | array | ✓ | 按天聚合状态 |
| `issues` | array | ✓ | 扁平问题列表（详情用 id 关联） |
| `alternatives` | array | | Plan B 骨架方案摘要 |
| `summary` | object | ✓ | 计数汇总 |

#### `verdict`

| 字段 | 类型 | 说明 |
|------|------|------|
| `status` | enum | `EXECUTABLE` \| `ADJUST_REQUIRED` \| `NOT_EXECUTABLE` \| `STALE` \| `UNKNOWN` |
| `headline` | string | 主结论一句 |
| `subheadline` | string? | 副文案 |

#### `dimensions[].key`（固定枚举）

| key | 产品标签 | 建议后端聚合来源 |
|-----|----------|------------------|
| `schedule` | 日程可行性 | schedule feasibility、buffers、时间重叠 |
| `transport` | 道路与交通 | 道路等级、驾驶时长、交通衔接 |
| `booking` | 开放与预订 | 营业时间、预订库存、证据覆盖 |
| `environment` | 天气与环境 | 天气窗口、季节风险、safety risk |

> `environment.score` 建议语义：**越高越安全/越可执行**（与 `safetyRisk` 原始分方向一致时需在服务端转换）。

#### `issues[].priority`（产品优先级，非 Gate 协议）

| priority | 含义 | 典型来源 |
|----------|------|----------|
| `must_handle` | 必须处理 | blocker、硬约束违反、闭园后到达、车辆道路不匹配 |
| `suggest_adjust` | 建议调整 | 连续驾驶过长、缓冲不足、体验差但可执行 |
| `pending_confirm` | 待确认 | 营业时间未验证、天气未进可靠预测期、库存未确认 |

#### `issues[].category`

与 `dimensions.key` 同枚举，可扩展 string 但前端默认映射到四维瓦片。

#### `dayTimeline[].status`

| status | UI |
|--------|-----|
| `ok` | ✓ |
| `warning` | ⚠ |
| `blocked` | ✕ |

#### `proofs[]`（L3-PROOF / 证据原子）

| 字段 | 说明 |
|------|------|
| `entity` | 实体（路段、POI、车辆等） |
| `constraint` | 约束描述 |
| `currentFact` | 当前事实 |
| `evidenceSource` | 规则/数据源名称 |
| `observedAt` / `validUntil` | 证据时效 |
| `ruleId` | 规则 ID |
| `confidence` | 0–1 |
| `evidenceType` | 如 `L3-PROOF`、`coverage-gap` |
| `conclusion` | 结论句 |

**首屏不返回完整 proofs 列表亦可**：可仅在 `GET .../issues/:id` 详情接口返回，以减少 payload。

### 3.3 `POST validate` 请求体

```json
{
  "forceRefreshEvidence": true,
  "lang": "zh"
}
```

响应：同步返回完整 `TripFeasibilityReportDto`，或：

```json
{
  "jobId": "validate-job-uuid",
  "status": "running",
  "estimatedSeconds": 40
}
```

前端轮询 `GET /trips/:tripId/feasibility-report?jobId=...` 或 WebSocket。

### 3.4 `POST validate-scope` 请求体

```json
{
  "scope": {
    "type": "day",
    "dayNumber": 3
  }
}
```

```json
{
  "scope": {
    "type": "issue",
    "issueId": "issue-f208-vehicle"
  }
}
```

```json
{
  "scope": {
    "type": "route",
    "segmentId": "seg-day3-drive"
  }
}
```

响应：更新后的**局部问题子集** + 可选完整报告（推荐返回完整报告以简化前端）。

### 3.5 `POST preview-repair` 响应（P1）

```json
{
  "issueId": "issue-f208-vehicle",
  "optionId": "repair-swap-4wd",
  "before": {
    "dayNumber": 3,
    "drivingMinutes": 320,
    "highlights": ["含高地 F-road"]
  },
  "after": {
    "dayNumber": 3,
    "drivingMinutes": 350,
    "highlights": ["全部为铺装道路"]
  },
  "impact": {
    "drivingDeltaMinutes": 30,
    "experienceLoss": ["-1 个高地体验"],
    "feasibilityScoreBefore": 65,
    "feasibilityScoreAfter": 92
  }
}
```

---

## 4. 系统协议 → 用户语言映射

### 4.1 行前 `verdict.status`

| 内部 Gate / 协议 | `verdict.status` | `headline` 示例 |
|------------------|------------------|-----------------|
| `ALLOW` / PASS | `EXECUTABLE` | 当前方案可执行 |
| `ADJUST_REQUIRED` / WARN | `ADJUST_REQUIRED` | 当前方案基本可行，需要调整 |
| `BLOCK` / REJECT | `NOT_EXECUTABLE` | 当前方案暂不可执行 |
| 行程版本落后 | `STALE` | 报告已过期 |
| 未跑过 VERIFY | `UNKNOWN` | 尚未完成验证 |

**禁止**在 `headline` 中直接暴露 `ALLOW`、`BLOCK` 等协议词。

### 4.2 行中 `verdict.status`

| 内部状态 | `verdict.status` | 说明 |
|----------|------------------|------|
| 进度正常、无活跃冲突 | `ON_TRACK` | |
| 有延误或中等风险 | `AT_RISK` | |
| 需重排今日 / 末站不可完成 | `REPLAN_REQUIRED` | |
| 安全停止（不建议继续） | `STOP` | |

`headline` 必须是**后果句**，例如「预计晚 45 分钟，最后一站可能无法完成」，而非「scheduleFeasibility 65」。

---

## 5. 行中 DTO：`TripExecutionAdvisoryDto`

### 5.1 完整 JSON 示例

```json
{
  "tripId": "trip-uuid",
  "tripDayId": "day-uuid-4",
  "dayNumber": 4,
  "date": "2026-07-15",
  "routeSummary": "维克 → 黑沙滩 → 斯科加瀑布 → 塞里雅兰瀑布",

  "currentState": {
    "currentTime": "2026-07-15T14:20:00+00:00",
    "currentLocation": { "lat": 63.42, "lng": -19.01 },
    "activeItemId": "item-drive-2",
    "delayMinutes": 35
  },

  "verdict": {
    "status": "REPLAN_REQUIRED",
    "headline": "预计晚 45 分钟，最后一站可能无法完成",
    "validUntil": "2026-07-15T15:00:00+00:00"
  },

  "impacts": {
    "affectedItems": [
      {
        "itemId": "item-poi-1",
        "title": "黑沙滩",
        "status": "completed",
        "projectedArrival": null,
        "note": null
      },
      {
        "itemId": "item-poi-2",
        "title": "斯科加瀑布",
        "status": "active",
        "projectedArrival": "2026-07-15T15:05:00+00:00",
        "note": null
      },
      {
        "itemId": "item-poi-3",
        "title": "塞里雅兰瀑布",
        "status": "at_risk",
        "projectedArrival": "2026-07-15T17:42:00+00:00",
        "note": "预计到达晚于建议游览窗口"
      }
    ],
    "estimatedHotelArrival": "2026-07-15T19:40:00+00:00",
    "drivingAfterDarkRisk": 0.35
  },

  "deviations": [
    {
      "id": "dev-departure-late",
      "message": "实际出发晚了 35 分钟",
      "minutesImpact": 35
    },
    {
      "id": "dev-road-delay",
      "message": "当前道路增加 15 分钟",
      "minutesImpact": 15
    }
  ],

  "recommendations": [
    {
      "id": "rec-shorten-skoga",
      "label": "缩短斯科加停留",
      "description": "减少当前景点停留 30 分钟，尽量保留全部景点",
      "isRecommended": true,
      "impactSummary": "节省 30 分钟",
      "estimatedHotelArrival": "2026-07-15T18:20:00+00:00",
      "drivingAfterDarkRisk": 0.12,
      "actionType": "shorten"
    },
    {
      "id": "rec-skip-last",
      "label": "取消最后一站",
      "description": "跳过塞里雅兰瀑布，降低赶路风险",
      "impactSummary": "降低赶路风险",
      "actionType": "skip"
    },
    {
      "id": "rec-keep",
      "label": "保持原计划",
      "description": "继续按当前安排执行",
      "actionType": "keep"
    }
  ],

  "realtimeRisks": {
    "road": "正常",
    "weather": "1小时后降雨",
    "openingHours": "已确认",
    "nextCheckAt": "15:00"
  },

  "evidence": {
    "weatherAsOf": "2026-07-15T14:15:00+00:00",
    "roadAsOf": "2026-07-15T14:10:00+00:00",
    "openingHoursAsOf": "2026-07-15T08:00:00+00:00"
  },

  "technicalFindings": [
    {
      "id": "finding-closure-skoga",
      "type": "schedule",
      "message": "塞里雅兰瀑布 18:00 闭园，预计到达 17:42",
      "score": 72
    }
  ]
}
```

### 5.2 字段说明

#### `currentState`

| 字段 | 说明 |
|------|------|
| `currentTime` | 服务端「现在」或用户时区 now |
| `delayMinutes` | 相对计划的累计延误 |
| `activeItemId` | 当前执行项 |
| `currentLocation` | 可选，来自 GPS / trip state |

#### `impacts.affectedItems[].status`

| status | UI |
|--------|-----|
| `completed` | ✓ 已完成 |
| `active` | ● 进行中 / 前往中 |
| `upcoming` | 待执行 |
| `at_risk` | ⚠ 有风险 |

#### `recommendations`（最多 3 个展示）

| `actionType` | 含义 |
|--------------|------|
| `shorten` | 缩短停留 |
| `skip` | 跳过站点 |
| `reroute` | 改道 |
| `replace` | 替换 POI |
| `keep` | 保持原计划 |

**必须**在推荐项上提供后果字段（`estimatedHotelArrival`、`drivingAfterDarkRisk`、`impactSummary`），供「后果对比」UI 使用。

#### `technicalFindings`

Readiness / L3 技术项，**不得作为首屏主信息**；与 `GET /in-trip/readiness/today` 可同源，但本 DTO 仅作折叠区。

### 5.3 刷新策略

| 触发 | 说明 |
|------|------|
| 客户端轮询 | 建议 30–60s（前端当前 30s） |
| `validUntil` | 服务端声明建议刷新时间 |
| 事件推送 | 环境事件创建、实地报告、执行状态变更 |

### 5.4 `POST recommendations/:id/apply` 请求体

```json
{
  "confirm": true,
  "clientTimestamp": "2026-07-15T14:25:00+00:00"
}
```

响应：

```json
{
  "applied": true,
  "executionAdvisory": { /* 最新 TripExecutionAdvisoryDto */ },
  "scheduleMutations": [
    { "type": "SHORTEN_STAY", "itemId": "item-poi-2", "deltaMinutes": -30 }
  ]
}
```

---

## 6. 后端聚合逻辑建议

### 6.1 行前报告生成流水线

```
Trip snapshot (revision N)
  → Constraint Solver / VERIFY
  → Gate verdict (internal)
  → Readiness score breakdown
  → Map to FeasibilityIssueDto (priority 三层)
  → Aggregate dimensions + dayTimeline
  → Attach proofs (lazy per issue)
  → User-language verdict + version binding
  → TripFeasibilityReportDto
```

### 6.2 行中建议生成流水线

```
Trip state + GPS + field reports
  → Today timeline (planned vs actual)
  → Realtime predict (weather, feasibility prob)
  → Environment events (open/voting)
  → Constraint re-check (today scope only)
  → Generate ≤3 recommendations with impact comparison
  → User-language verdict + validUntil
  → TripExecutionAdvisoryDto
```

### 6.3 同一约束的两阶段表达（示例）

**约束**：景点 18:00 闭园

| 阶段 | 输入事实 | 结论 | 修复动作 |
|------|----------|------|----------|
| 行前 | 计划 17:20 到达 + 游览 90min | `must_handle`：无法完整执行 | 提前出发、换日、换 POI |
| 行中 | 现在 16:55，预计 17:42 到达 | `REPLAN_REQUIRED`：不建议继续前往 | 替换附近全天开放 POI |

规则 ID 可相同（`ruleId`），**DTO 与 priority/verdict 必须分阶段计算**。

### 6.4 `must_handle` 判定表（产品 × 研发）

**原则**：`must_handle` = 硬阻塞（不修复则方案不成立）；`severity` 仅作展示，**不单独**升格 readiness finding。

前端实现：`src/lib/feasibility-issue-priority.ts`（BFF 与 adapter fallback 共用）。显式 `issues[].priority` / `findings[].priority` 优先；readiness 与 conflict/timing 信号取较高档。

#### Readiness findings → `issues[].priority`

| 上游 `type` | 典型场景 | priority |
|-------------|----------|----------|
| `blocker` | 覆盖缺口 high、POI uncovered、树形 blockers | **must_handle** |
| `must` / `warning` | 单日过满、长途偏长、medium 缺口 | suggest_adjust |
| `should` / `suggestion` | 低优先级建议 | pending_confirm |

> 勿再用 `severity === 'high'` 单独升格 readiness finding（已在 assembler / adapter 移除）。

#### Conflicts → `issues[].priority`

| 条件 | priority |
|------|----------|
| `priority` 字段显式指定 | 沿用 |
| `severity === HIGH`（且带 `conflictType`） | **must_handle** |
| `CLOSURE_RISK` / `TRANSPORT_INSUFFICIENT` | **must_handle** |
| 交通衔接 `isStartTooEarly`（到站过早） | **must_handle** |
| 交通缓冲偏紧（能到但紧，`gapMinutes ≤ 30`） | suggest_adjust |
| 时刻缺失 `missing_times` | pending_confirm |
| `severity === MEDIUM`（且带 `conflictType`） | suggest_adjust |

交通衔接信号可通过 `issueKind`（`inter_day_travel` / `same_day_travel`）+ `anchors` 表达；冲突类 issue 建议附带 `conflictType`（与 Plan Studio `ConflictType` 同枚举）。

#### Verdict 门控

| summary | verdict | `canStartExecute`（已 validate 且非 stale） |
|---------|---------|------------------------------------------|
| `mustHandle > 0` | NOT_EXECUTABLE | false |
| 仅 suggest / pending | ADJUST_REQUIRED | false |
| 全 0 | EXECUTABLE | true |

`verdict.status` 与 `summary.*` 计数必须一致；勿再用 readiness `summary.blockers` 直接驱动 verdict。

#### P1 待细化（证据分级）

| 证据缺口 | 目标 priority |
|----------|---------------|
| 核心 POI + `booking_confirmation` 缺失 | must_handle（上游标 `blocker`） |
| 天气等可临行前补 | suggest_adjust / pending_confirm |

---

## 7. 行程版本字段（建议在 `GET /trips/:id` 扩展）

```json
{
  "id": "trip-uuid",
  "revision": 15,
  "revisionLabel": "V15",
  "updatedAt": "2026-06-20T12:00:00Z"
}
```

| 字段 | 说明 |
|------|------|
| `revision` | 单调递增整数；任意 itinerary / budget / constraint 变更 +1 |
| `revisionLabel` | 展示用，可选 |

`feasibility-report.verifiedForTripVersion` 应存 `revision` 或 `revisionLabel` 字符串化。

---

## 8. 错误码

| code | 场景 |
|------|------|
| `FEASIBILITY_NOT_VALIDATED` | 从未验证，`verdict.status = UNKNOWN` |
| `FEASIBILITY_VALIDATION_RUNNING` | 整趟验证进行中 |
| `FEASIBILITY_REPORT_STALE` | 可读但 `isStale=true`（非错误，正常返回 200） |
| `EXECUTION_ADVISORY_NOT_IN_TRIP` | 行程非 IN_PROGRESS / TRAVELING |
| `EXECUTION_ADVISORY_DISABLED` | 行中模块未开启 |
| `REPAIR_OPTION_NOT_FOUND` | issueId / optionId 无效 |
| `RECOMMENDATION_EXPIRED` | `validUntil` 已过，需重新 GET |

---

## 9. 前端切换计划

| 阶段 | 前端行为 |
|------|----------|
| **当前（过渡期）** | `tripConstraintSolverApi` 多接口拼装 + adapter |
| **P0 后端就绪** | `getFeasibilityReport` → `GET feasibility-report`；`getExecutionAdvisory` → `GET execution-advisory` |
| **P1** | `preview-repair`、`validate-scope`、`apply recommendation` 直连 |
| **Fallback** | 新接口 404 / 501 时回退 adapter（保留 1–2 个版本） |

切换开关建议：环境变量 `FEASIBILITY_REPORT_API=v2` / feature flag。

---

## 10. 实现优先级

| 优先级 | 后端交付 | 前端依赖 |
|--------|----------|----------|
| **P0** | `GET feasibility-report` + `trip.revision` + 用户语言 verdict | 可执行性 Tab、摘要卡 |
| **P0** | `GET execution-advisory` + recommendations ≤3 + impacts | 实时状态卡、建议抽屉 |
| **P0** | `POST validate`（整趟） | 重新验证按钮 |
| **P1** | `validate-scope`、`preview-repair` | 局部验证、预览修改 |
| **P1** | `POST recommendations/:id/apply` | 应用方案 |
| **P2** | WebSocket 推送 advisory 更新 | 减少轮询 |
| **P2** | alternatives 与 plan-variants 服务打通 | 其他方案区 |

---

## 11. TypeScript 类型索引（前端）

后端 OpenAPI 生成时建议与下列文件保持字段名一致：

| 类型 | 文件 |
|------|------|
| `TripFeasibilityReportDto` | `src/types/trip-feasibility-report.ts` |
| `TripExecutionAdvisoryDto` | `src/types/trip-execution-advisory.ts` |
| `FeasibilityVerdictStatus` | 同上 |
| `ExecutionVerdictStatus` | 同上 |
| `FeasibilityIssuePriority` | 同上 |
| priority 映射（`mapReadinessFindingPriority` 等） | `src/lib/feasibility-issue-priority.ts` |

---

## 12. 联调检查清单

### 行前

- [ ] 未验证行程返回 `UNKNOWN`，不抛 500
- [ ] 修改日程后 `isStale=true`，`verdict.status` 可为 `STALE`
- [ ] `issues` 中 blocker 均映射为 `must_handle`；`must`/`warning` 为 `suggest_adjust`，`should`/`suggestion` 为 `pending_confirm`
- [ ] 冲突类：`CLOSURE_RISK` / `TRANSPORT_INSUFFICIENT` / `isStartTooEarly` → `must_handle`；`missing_times` → `pending_confirm`
- [ ] `verdict.status` 与 `summary.mustHandle|suggestAdjust|pendingConfirm` 一致（见 §6.4）
- [ ] `canStartExecute` 仅在 `EXECUTABLE` 且无 `mustHandle`、已验证、非 stale 时为 true
- [ ] `dimensions` 固定 4 key，缺数据时 score=0 而非 omit
- [ ] `proofs` 含 `observedAt` / `ruleId` 时可折叠展示
- [ ] `repair-options` 与现有 readiness 选项 id 兼容

### 行中

- [ ] 非行中阶段返回 403 或 `EXECUTION_ADVISORY_NOT_IN_TRIP`
- [ ] `recommendations` 不超过 3 条且含 `keep`
- [ ] `impacts.drivingAfterDarkRisk` 为 0–1
- [ ] `verdict.headline` 无 CGUS / scheduleFeasibility 等技术词
- [ ] 环境事件方案可映射为 `actionType=replace`
- [ ] `validUntil` 过期后 GET 仍成功但 headline 提示重新评估

---

*文档版本：v1.0 · 对齐前端 constraint-solver 双阶段读模型 · 2026-06-20*
