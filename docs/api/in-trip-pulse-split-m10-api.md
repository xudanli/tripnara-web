# Group Pulse + Split Orchestrator — 前端接口文档（M10）

> 完整规范见产品/API 文档。本文档为前端实现索引。

**路径前缀**：`/api/trips/:tripId/in-trip`  
**Swagger Tags**：`trip-in-trip-pulse` / `trip-in-trip-split`

## 功能开关

| 变量 | 作用 |
|------|------|
| `IN_TRIP_EXECUTION_ENABLED=true` | 行中总开关（必填） |
| 行程 `TRAVELING` | 后端鉴权前置 |
| M10 migration | `add_in_trip_group_pulse_split.sql` |

## 前端实现索引

| 模块 | 文件 |
|------|------|
| Pulse 类型 | `src/types/in-trip-pulse.ts` |
| Split 类型 | `src/types/in-trip-split.ts` |
| Pulse API | `src/api/in-trip-pulse.ts` |
| Split API | `src/api/in-trip-split.ts` |
| Pulse 工具 | `src/lib/in-trip-pulse.ts` |
| Split 工具 | `src/lib/in-trip-split.ts` |
| Pulse Hooks | `src/hooks/useInTripPulse.ts` |
| Split Hooks | `src/hooks/useInTripSplit.ts` |
| Pulse UI | `src/components/in-trip/pulse/*` |
| Split UI | `src/components/in-trip/split/*` |
| 执行页集成 | `src/pages/execute/index.tsx` |

## Group Pulse 接口

| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/pulse/mood-check` | 每日 Mood Check（1–5） |
| POST | `/pulse/micro-feedback` | 节点微反馈 |
| POST | `/pulse/signals/motion` | 运动数据同步 |
| GET | `/pulse/my-state` | 我的五维状态 |
| GET | `/pulse/team-thermometer` | 团队温度计 |
| GET | `/pulse/interventions` | L1–L3 干预建议 |
| POST | `/pulse/interventions/:id/ack` | acknowledge / dismiss |

## Split Orchestrator 接口

| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/split/propose` | 生成分组方案 |
| GET | `/split/sessions` | Session 列表 |
| GET | `/split/sessions/:id` | Session 详情 |
| POST | `/split/sessions/:id/execute` | 组织者确认执行 |
| POST | `/split/sessions/:id/share` | 分组见闻分享 |
| PATCH | `/split/sessions/:id/reunion` | 汇合状态更新 |
| POST | `/split/sessions/:id/location` | 拆队期间位置心跳 |

## 用户流程

### Group Pulse

```
GET /today → quickActions.mood_check / pendingCards.interventions
  → InTripMoodCheckDialog → POST /pulse/mood-check
  → InTripTeamThermometerPanel ← GET /pulse/team-thermometer + /pulse/my-state
  → InTripPulseInterventionsPanel ← GET /pulse/interventions
  → POST /interventions/:id/ack → 刷新 today + thermometer
```

### Split Orchestrator

```
InTripSplitPanel
  → POST /split/propose → InTripSplitSessionSheet（方案预览）
  → POST /sessions/:id/execute（组织者）→ status=active
  → POST /share、PATCH /reunion（汇合）
  → 活跃 session 时 Money Brain 自动路由 splitAmongUserIds
```

## 与 Today 联动

| Today 字段 | 来源 |
|------------|------|
| `teamThermometer` | `GET /in-trip/today` → `source: group_pulse` |
| `pendingCards.interventions` | 待处理干预数量 |
| `quickActions` 含 `mood_check` | 打开 `InTripMoodCheckDialog` |

## 与 Money Brain 联动

活跃 `split` session 存在时，`POST /money/transactions` 自动路由分摊（见 M9 文档）。

## 能力成熟度

| 能力 | 状态 |
|------|------|
| Mood Check + 五维状态 | ✅ |
| 团队温度计 | ✅ |
| 干预卡片 ack/dismiss | ✅ |
| 分组方案 propose / execute | ✅ |
| Session 详情 / 分享 / 汇合 | ✅ |
| 节点微反馈 UI | ⏳ Phase 2 |
| 运动信号同步 | ⏳ Phase 2 |
| 拆队位置心跳 | ⏳ Phase 2 |

## 相关文档

- 行中总览：[`in-trip-execution-m7-api.md`](./in-trip-execution-m7-api.md)
- Money Brain：[`in-trip-money-m9-api.md`](./in-trip-money-m9-api.md)
- Experience Loop：[`in-trip-experience-m11-api.md`](./in-trip-experience-m11-api.md)

*文档版本：M10 · 同步 `trip-in-trip-pulse` / `trip-in-trip-split` controller*
