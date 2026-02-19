# 用户端 API V2 技术方案

**文档类型**: 技术规格说明书  
**版本**: 1.0.0  
**编制**: 技术专家团队  
**依据**: 用户端 API 接口文档 (`/api/v2/user/*`)  
**最后更新**: 2026-02-15

---

## 1. 概述

本文档基于用户端 API 接口文档，从技术架构、数据流、集成方案、容错设计四个维度提供实施规格。

### 1.1 API 模块概览

| 模块 | 基础路径 | 核心能力 |
|------|----------|----------|
| 计划优化 | `/api/v2/user/optimization` | 8 维效用评估、计划比较、一键优化、Monte Carlo 风险评估、三守护者协商、反馈、偏好 |
| 团队协同 | `/api/v2/user/team` | 团队 CRUD、成员管理、团队协商、权重/约束聚合 |
| 实时状态 | `/api/v2/user/realtime` | 状态初始化、当前状态、预测、订阅、实地报告 |

### 1.2 技术栈与现状

- **前端**: React 18 + TypeScript + Vite
- **请求**: Axios (`apiClient`)
- **状态**: TanStack Query (React Query)
- **已实现**: API 客户端、类型定义、Hooks、部分 UI 组件

---

## 2. 计划优化模块 (`/api/v2/user/optimization`)

### 2.1 数据流架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端页面 / 组件                            │
│   trips/[id] | plan-studio | what-if | OptimizationDashboard    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   useOptimizationV2 Hooks                        │
│  useEvaluatePlan | useOptimizePlan | useRiskAssessment | ...     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  optimizationApi (apiClient)                     │
│  POST /v2/user/optimization/{evaluate|compare|optimize|...}      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        后端 API                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 关键类型与转换

#### RoutePlanDraft 构建

行程详情 (`TripDetail`) 需转换为 `RoutePlanDraft` 方可调用优化 API：

```typescript
// 建议工具函数: src/utils/plan-converters.ts
export function tripDetailToRoutePlanDraft(
  trip: TripDetail,
  routeDirectionId?: string
): RoutePlanDraft {
  const days = trip.itineraryItems
    .reduce((acc, item) => {
      const dayKey = item.dayNumber ?? 1;
      if (!acc[dayKey]) acc[dayKey] = [];
      acc[dayKey].push(item);
      return acc;
    }, {} as Record<number, ItineraryItem[]>);
  
  return {
    tripId: trip.id,
    routeDirectionId: routeDirectionId ?? trip.routeDirection?.id,
    days: Object.entries(days).map(([dayNum, items]) => ({
      dayNumber: Number(dayNum),
      date: items[0]?.date ?? '',
      segments: buildSegmentsFromItems(items),
    })),
    metadata: {
      totalDays: Object.keys(days).length,
      startDate: trip.startDate,
      endDate: trip.endDate,
    },
  };
}
```

#### WorldModelContext 构建

需聚合行程、用户、路线方向、天气等数据：

```typescript
// 建议工具函数: src/utils/world-context-builder.ts
export function buildWorldModelContext(
  trip: TripDetail,
  userProfile?: UserProfile,
  routeDirection?: RouteDirection,
  physicalOverrides?: Partial<PhysicalModelV2>
): WorldModelContext {
  return {
    physical: {
      weather: getWeatherFromTrip(trip) ?? physicalOverrides?.weather ?? DEFAULT_WEATHER,
      terrain: getTerrainFromTrip(trip) ?? physicalOverrides?.terrain ?? DEFAULT_TERRAIN,
      hazards: physicalOverrides?.hazards ?? [],
    },
    human: getUserHumanModel(userProfile) ?? DEFAULT_HUMAN,
    routeDirection: getRouteDirectionModel(routeDirection) ?? DEFAULT_ROUTE_DIRECTION,
  };
}
```

### 2.3 接口调用规格

| 接口 | 方法 | 幂等性 | 超时建议 | 重试策略 |
|------|------|--------|----------|----------|
| `/evaluate` | POST | 是 | 10s | 不重试 |
| `/compare` | POST | 是 | 10s | 不重试 |
| `/optimize` | POST | 否 | 30s | 不重试（有副作用）|
| `/risk-assessment` | POST | 是 | 20s | 不重试 |
| `/negotiation` | POST | 是 | 15s | 不重试 |
| `/feedback` | POST | 否 | 5s | 可重试（幂等设计）|
| `/preferences/:userId` | GET | 是 | 5s | 可重试 |

### 2.4 接口请求体规格

#### 2.4.1 比较两个计划 `POST /compare`

请求体支持驼峰与蛇形两种写法：

| 字段 | 驼峰 | 蛇形 | 类型 | 必填 | 说明 |
|------|------|------|------|------|------|
| 计划 A | planA | plan_a | RoutePlanDraft | 是 | 第一个计划 |
| 计划 B | planB | plan_b | RoutePlanDraft | 是 | 第二个计划 |
| 世界模型 | world | world | WorldModelContext | 是 | 上下文 |

**400 说明**：planA/plan_a、planB/plan_b、world 任一缺失或无效时返回。

#### 2.4.2 一键优化计划 `POST /optimize`

**方式一**：传 plan + world

| 字段 | 驼峰 | 蛇形 | 类型 | 必填 | 说明 |
|------|------|------|------|------|------|
| 计划 | plan | — | RoutePlanDraft | 方式一必填 | 待优化计划 |
| 世界模型 | world | — | WorldModelContext | 方式一必填 | 上下文 |

**方式二**：只传 tripId 或 trip_id，由后端根据行程 ID 加载 plan 与 world 再优化。

| 字段 | 驼峰 | 蛇形 | 类型 | 必填 | 说明 |
|------|------|------|------|------|------|
| 行程 ID | tripId | trip_id | string | 方式二必填 | 行程唯一标识 |

**400 说明**：未提供 (plan + world) 且未提供 (tripId 或 trip_id) 时返回「请提供 plan + world，或仅传 tripId / trip_id 由后端加载」。

#### 2.4.3 风险评估 `POST /risk-assessment`

**方式一**：传 plan + world（可选 sampleSize）

| 字段 | 驼峰 | 蛇形 | 类型 | 必填 | 说明 |
|------|------|------|------|------|------|
| 计划 | plan | — | RoutePlanDraft | 方式一必填 | 待评估计划 |
| 世界模型 | world | — | WorldModelContext | 方式一必填 | 上下文 |
| 样本数 | sampleSize | sample_size | number | 否 | Monte Carlo 样本数，默认 1000 |

**方式二**：只传 tripId、trip_id 或 id，由后端加载 plan 与 world。

| 字段 | 驼峰 | 蛇形 | 类型 | 必填 | 说明 |
|------|------|------|------|------|------|
| 行程 ID | tripId | trip_id / id | string | 方式二必填 | 行程唯一标识 |

**400 说明**：未提供 (plan + world) 且未提供 (tripId / trip_id / id) 时返回「请提供 plan + world，或仅传 tripId / trip_id 由后端加载」。

#### 2.4.4 获取协商结论 `POST /negotiation`

**方式一**：传 plan + world

| 字段 | 驼峰 | 蛇形 | 类型 | 必填 | 说明 |
|------|------|------|------|------|------|
| 计划 | plan | — | RoutePlanDraft | 方式一必填 | 待协商计划 |
| 世界模型 | world | — | WorldModelContext | 方式一必填 | 上下文 |

**方式二**：只传 tripId、trip_id 或 id，由后端加载 plan 与 world 再协商。

| 字段 | 驼峰 | 蛇形 | 类型 | 必填 | 说明 |
|------|------|------|------|------|------|
| 行程 ID | tripId | trip_id / id | string | 方式二必填 | 行程唯一标识 |

**400 说明**：未提供 (plan + world) 且未提供 (tripId / trip_id / id) 时返回「请提供 plan + world，或仅传 tripId / trip_id 由后端加载」。

#### 2.4.5 协商响应体与字段说明

**请求体（二选一）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| plan | RoutePlanDraft | 条件 | 与 world 同时传入时使用 |
| world | WorldModelContext | 条件 | 与 plan 同时传入时使用 |
| tripId / trip_id / id | string | 条件 | 仅在不传 plan+world 时使用，后端加载该行程的 plan 与 world 再协商 |

- **方式一**：传 `plan` + `world`
- **方式二**：只传 `tripId`、`trip_id` 或 `id`，后端加载 plan 与 world 再返回协商结论
- 若既未传 plan+world 也未传 tripId/trip_id/id，返回 **400**

**响应体**

| 字段 | 类型 | 说明 |
|------|------|------|
| decision | APPROVE \| APPROVE_WITH_CONDITIONS \| REJECT \| NEEDS_HUMAN | 决策结果 |
| consensusLevel | number | 共识度 (0-1)，前端 ×100 显示为百分比 |
| keyTradeoffs | string[] | 分歧所在（如 "NEPTUNE 支持 vs DRE 反对"） |
| conditions | string[]（可选） | 附加条件（decision=APPROVE_WITH_CONDITIONS 时） |
| humanDecisionPoints | string[]（可选） | 需人类决策的点（decision=NEEDS_HUMAN 时） |
| evaluationSummary | object | 评估摘要 |
| evaluationSummary.abuUtility | number | 安全守护者 Abu 评分 (0-1)，前端 ×100 显示 |
| evaluationSummary.dreUtility | number | 节奏守护者 Dre 评分 (0-1)，前端 ×100 显示 |
| evaluationSummary.neptuneUtility | number | 修复守护者 Neptune 评分 (0-1)，前端 ×100 显示 |
| evaluationSummary.criticalConcerns | string[] | 具体问题（分歧产生的原因） |
| votingResult | object | 投票结果 |
| votingResult.approve | number | 赞成票数，非负整数 |
| votingResult.reject | number | 反对票数，非负整数 |
| votingResult.abstain | number | 弃权票数，非负整数 |

**字段与界面展示对应关系**

| 界面展示 | 接口字段 | 类型 | 前端处理 |
|----------|----------|------|----------|
| 附条件批准 / 批准 / 拒绝 / 需人类决策 | decision | 枚举 | 直接映射为「批准」「附条件批准」「拒绝」「需人工决策」 |
| 共识度 85% | consensusLevel | number (0–1) | consensusLevel × 100 显示为整数百分比 |
| 2 赞成 · 0 反对 · 1 弃权 | votingResult.approve/reject/abstain | number (非负整数) | 拼接为「X 赞成 · Y 反对 · Z 弃权」 |
| 安全守护者 64 · 节奏 44 · 修复 67 | evaluationSummary.abuUtility/dreUtility/neptuneUtility | number (0–1) | 各值 ×100 取整，对应 Abu/Dre/Neptune 的展示分数 |
| 可执行的调整 | evaluationSummary.criticalConcerns | string[] | 区块标题「可执行的调整」；与 conditions 去重 |
| 不同维度的评估意见 | keyTradeoffs | string[] | 区块标题「不同维度的评估意见」；弱化、可折叠；副标题：「安全、节奏、体验等角度看法不一，供参考」 |
| 行程优化建议 (N) | 无独立字段 | - | N = criticalConcerns.length + keyTradeoffs.length（去重后） |
| 出发前建议完成 | conditions | string[]（可选） | 区块标题「出发前建议完成」；`decision === "APPROVE_WITH_CONDITIONS"` 时展示；补充说明：「为保障行程安全与体验，建议在出发前完成以下调整。」；与 criticalConcerns 去重 |
| 需人类决策的点 | humanDecisionPoints | string[]（可选） | 仅在 `decision === "NEEDS_HUMAN"` 时展示 |

若 `criticalConcerns` 为空，用户只能看到抽象描述；可按天/时段细化需在 GuardianDebateService 中扩展。

#### 2.4.6 提交反馈 `POST /feedback`

记录用户对行程的满意度反馈。

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户 ID |
| tripId | string | 是 | 行程 ID |
| type | FeedbackType | 是 | SATISFACTION_RATING / FATIGUE_REPORT / PLAN_MODIFICATION / PREFERENCE_UPDATE / TRIP_COMPLETION / EARLY_TERMINATION |
| data | FeedbackData | 是 | 详见下表 |

**data 字段（FeedbackData）**

| 字段 | 类型 | 说明 |
|------|------|------|
| overallSatisfaction | number | 满意度评分 (1-5) |
| safetyPerception | number | 安全感知 |
| experienceQuality | number | 体验质量 |
| pacingComfort | number | 节奏舒适度 |
| philosophyMatch | number | 理念匹配度 |
| actualFatigueLevel | number | 实际疲劳数据 (0-2) |
| predictedFatigueLevel | number | 预测疲劳数据 (0-2) |
| modificationType | ModificationType | SPLIT_DAY / INSERT_REST / REMOVE_ACTIVITY / REORDER / OTHER |
| modificationReason | string | 修改原因 |
| completionRate | number | 完成率 |
| daysCompleted | number | 已完成天数 |
| totalDays | number | 总天数 |

**响应**

| 字段 | 类型 | 说明 |
|------|------|------|
| success | boolean | 是否成功 |
| feedbackId | string | 反馈 ID |

#### 2.4.7 优化接口响应映射（optimize）

后端响应体字段与前端期望字段的映射关系：

| 后端响应字段 | 前端期望字段 | 说明 |
|--------------|--------------|------|
| `plan` | `optimizedPlan` | 优化后的计划 |
| `logs` | `changes` | 变更记录列表 |
| `summary.finalUtility` | `finalUtility` | 最终效用值 |

前端 API 层需做响应映射以兼容后端命名。

以上与当前后端对「仅传 tripId / trip_id / id」及 compare 的 plan_a / plan_b 兼容行为一致。

#### 2.4.8 接口需求清单（前端展示所需）

以下为前端展示所需字段的汇总与约束，后端已保证返回有效数值（避免 NaN）及非负整数投票数。

| 接口 | 路径 | 需提供的字段 | 用途 |
|------|------|--------------|------|
| **协商结论** | `POST /api/v2/user/optimization/negotiation` | `evaluationSummary.criticalConcerns` | **必填**，用于展示「具体问题（分歧产生的原因）」 |
| 同上 | 同上 | `keyTradeoffs` | 展示「分歧所在（哪些评估维度有不同判断）」 |
| 同上 | 同上 | `votingResult.approve/reject/abstain` | 赞成/反对/弃权（非负整数） |
| 同上 | 同上 | `evaluationSummary.abuUtility/dreUtility/neptuneUtility` | 安全/节奏/修复 维度评分 |
| 同上 | 同上 | `consensusLevel`, `decision` | 共识度、决策结论 |
| **风险评估** | `POST /api/v2/user/optimization/risk-assessment` | `downsideRisk`, `expectedUtility`, `feasibilityProbability`, `confidenceInterval` | 有效数值（NaN 已防护） |
| **评估计划** | `POST /api/v2/user/optimization/evaluate` | `weightsUsed` | 各维度权重，用于展示「权重 X%」；缺省时前端用默认值 |
| **优化计划** | `POST /api/v2/user/optimization/optimize` | `summary.finalUtility`, `logs`, `plan` | `finalUtility` 已防 NaN；`logs` 为空时前端可展示「当前计划已较优」；`plan` 即优化后计划 |

**协商结论**：完整字段与界面映射见上文「2.4.5 协商响应体与字段说明」的「字段与界面展示对应关系」表。若 `criticalConcerns` 为空，用户只能看到抽象描述；可按天/时段细化需在 `GuardianDebateService` 中扩展。

**优化接口响应映射**：`optimizedPlan` = 响应体中的 `plan`；`changes` = 响应体中的 `logs`；`finalUtility` = 响应体中的 `summary.finalUtility`。

### 2.5 错误处理

```typescript
// 统一错误码映射
const OPTIMIZATION_ERROR_CODES = {
  400: 'OPTIMIZATION_INVALID_INPUT',
  422: 'OPTIMIZATION_VALIDATION_FAILED',
  429: 'OPTIMIZATION_RATE_LIMIT',
  500: 'OPTIMIZATION_SERVER_ERROR',
  503: 'OPTIMIZATION_UNAVAILABLE',
} as const;

// 建议：封装带业务语义的 ApiError
export class OptimizationApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'OptimizationApiError';
  }
}
```

---

## 3. 团队协同模块 (`/api/v2/user/team`)

### 3.1 数据流

```
团队列表/详情页 ──► useTeam / useCreateTeam / useTeamNegotiation
                         │
                         ▼
                teamApi.{get|create|addMember|negotiate|...}
                         │
                         ▼
                POST/GET /v2/user/team/*
```

### 3.2 成员权重模式映射

| decisionWeightMode | 前端行为 |
|--------------------|----------|
| EQUAL | 每人 decisionWeight = 1/n |
| LEADER_DOMINANT | 领队 0.5，其余均分 0.5/(n-1) |
| EXPERIENCE_WEIGHTED | 按 experienceLevel 映射权重 |
| FITNESS_WEIGHTED | 按 fitnessLevel 映射权重 |
| CUSTOM | 用户手动设置 slider |

### 3.3 最弱链约束展示

`GET /team/:teamId/constraints` 返回 `constraintSources`，前端应展示约束来源：

```typescript
// 示例：展示 "maxDailyAscentM: 800m (来自 张三)"
constraintSources.map(s => ({
  label: `${s.constraint}: ${constraints[s.constraint]} (${s.sourceDisplayName})`,
}));
```

---

## 4. 实时状态模块 (`/api/v2/user/realtime`)

### 4.1 初始化与状态获取流程

**推荐流程**：使用 `autoInit=true` 简化前端逻辑：

```
进入行程页 ──► GET /state/:tripId?autoInit=true
                    │
                    ├─ 状态存在 ──► 直接返回
                    └─ 状态不存在 ──► 服务端自动初始化 ──► 返回
```

**可选流程**（需自定义初始化参数时）：

```
1. GET /state/:tripId/exists
2. 若 !exists ──► POST /state/initialize { tripId, weather?, human?, roads? }
3. GET /state/:tripId
```

### 4.2 订阅与 SSE

```typescript
// 1. 订阅
const { subscriptionId } = await realtimeApi.subscribe({
  tripId,
  userId,
  eventTypes: ['WEATHER_CHANGE', 'ROAD_STATUS_CHANGE', 'HAZARD_DETECTED', ...],
  minSeverity: 'WARNING',
  updateIntervalSeconds: 60,
  includePredictions: true,
});

// 2. 建立 SSE 连接
const es = realtimeApi.createEventSource(subscriptionId);
es.addEventListener('WEATHER_CHANGE', (e) => handleWeatherChange(JSON.parse(e.data)));

// 3. 组件卸载时取消订阅
await realtimeApi.unsubscribe(subscriptionId);
```

### 4.3 轮询 vs SSE 选择

| 场景 | 建议 |
|------|------|
| 行程页常规展示 | 轮询 `GET /state/:tripId`，间隔 60s |
| 执行中/需及时告警 | SSE 订阅 |
| 预测视图 | 单独 `GET /state/:tripId/predict?hoursAhead=24`，staleTime 10min |

---

## 5. 集成点与页面映射

| 页面/模块 | 计划优化 | 团队 | 实时状态 |
|-----------|----------|------|----------|
| `trips/[id]` | 评估、优化、协商、风险、反馈 | 团队协商（若有 teamId）| 状态 Banner、预测 |
| `plan-studio` | 评估、比较、优化 | 团队管理 | — |
| `what-if` | 比较、风险评估 | — | — |
| 执行页 `execute` | — | — | 状态、实地报告 |

---

## 6. 安全与性能

### 6.1 认证

- 所有 `/api/v2/user/*` 需用户认证
- 建议：通过 `apiClient` 统一注入 `Authorization` 或 Cookie

### 6.2 限流与缓存

- `evaluate` / `compare` / `risk-assessment`：可做客户端防抖 (300–500ms)
- `GET preferences`：staleTime 5min
- `GET state`：轮询间隔不低于 30s，避免频繁请求

### 6.3 离线与降级

- 实时状态不可用时：展示「状态暂时不可用，请稍后刷新」
- 优化/协商失败：展示错误信息 + 重试按钮，不阻塞主流程

---

## 7. 测试建议

| 类型 | 覆盖范围 |
|------|----------|
| 单元测试 | `plan-converters`, `world-context-builder` |
| 集成测试 | Hooks + MSW 模拟 API |
| E2E | 行程页完整优化流程、团队创建与协商 |

---

## 8. 附录：现有实现清单

| 类别 | 文件 | 状态 |
|------|------|------|
| API 客户端 | `src/api/optimization-v2.ts` | ✅ 已实现 |
| 类型定义 | `src/types/optimization-v2.ts` | ✅ 已实现 |
| Hooks | `src/hooks/useOptimizationV2.ts` | ✅ 已实现 |
| UI 组件 | `PlanEvaluationCard`, `NegotiationResultCard`, `RiskAssessmentCard`, `RealtimeStatusBanner`, `TeamManagementPanel`, `OptimizationDashboard`, `PlanComparisonView`, `FeedbackForm`, `FieldReportForm` | ✅ 已实现 |
| 转换工具 | `tripDetailToRoutePlanDraft`, `buildWorldModelContext` | ⚠️ 待实现 |
| 错误封装 | `OptimizationApiError` | ⚠️ 待实现 |
