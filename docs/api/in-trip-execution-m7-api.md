# 行中执行阶段 — 前端接口文档（M7 + M8）

> 完整规范见用户提供的 M7+M8 文档。本文档为前端实现索引。

**Global prefix**：`/api`  
**Swagger Tags**：`trip-in-trip-execution` / `trip-in-trip-environment`

## 功能开关

| 变量 | 作用 |
|------|------|
| `IN_TRIP_EXECUTION_ENABLED=true` | 行中模块总开关 |
| `IN_TRIP_ENVIRONMENT_MONITOR_ENABLED=true` | 环境 30min 自动扫描 |

## 前端实现索引

| 模块 | 文件 |
|------|------|
| M7 类型 + M8 环境类型 | `src/types/in-trip-execution.ts` |
| API 封装 | `src/api/in-trip-execution.ts` |
| 工具函数 | `src/lib/in-trip-execution.ts` |
| Today 数据 | `src/hooks/useInTripToday.ts` |
| 移交校验 | `src/hooks/useInTripHandoff.ts` |
| 环境事件列表 | `src/hooks/useInTripEnvironmentEvents.ts` |
| 环境事件详情/投票 | `src/hooks/useInTripEnvironmentEvent.ts` |
| UI 组件 | `src/components/in-trip/*` |
| 执行页集成 | `src/pages/execute/index.tsx` |

## M7 接口

- `POST /trips/:tripId/in-trip/anchor-snapshot/verify`
- `GET /trips/:tripId/in-trip/anchor-snapshot`
- `POST /trips/:tripId/in-trip/anchor-snapshot/materialize`
- `GET /trips/:tripId/in-trip/today`

## M8 接口（Environment Radar）

- `GET /trips/:tripId/in-trip/environment/events`
- `GET /trips/:tripId/in-trip/environment/events/:eventId`
- `POST /trips/:tripId/in-trip/environment/events/:eventId/vote`
- `POST /trips/:tripId/in-trip/environment/events/:eventId/resolve`
- `GET /trips/:tripId/in-trip/environment/vulnerability`
- `POST /trips/:tripId/in-trip/environment/scan`

## 用户流程（M8）

```
GET /today → pendingCards.environmentAlerts > 0
  → InTripEnvironmentAlertsPanel
  → 点击事件 → InTripEnvironmentEventSheet
  → POST /vote（全员）/ POST /resolve（组织者）
  → 刷新 events + today
```

## 能力成熟度

| 能力 | 状态 |
|------|------|
| 锚点移交 / Today planned | ✅ M7 |
| 环境事件 + 投票 + 连锁影响 | ✅ M8 |
| 脆弱度 `source=environment_radar` | ✅ M8 |
| `environmentAlerts` 角标 | ✅ M8 |
| Money Brain dashboard + 记账 | ✅ M9 — [`in-trip-money-m9-api.md`](./in-trip-money-m9-api.md) |
| Group Pulse + Split Orchestrator | ✅ M10 — [`in-trip-pulse-split-m10-api.md`](./in-trip-pulse-split-m10-api.md) |
| 实时气温 | 🔶 stub |

*文档版本：M7 + M8 + M9 + M10 · 同步后端 controller*
