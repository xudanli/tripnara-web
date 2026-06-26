# Experience Loop — 前端接口文档（M11）

> 完整规范见产品/API 文档。本文档为前端实现索引。

**路径前缀**：`/api/trips/:tripId/in-trip/experience`  
**Swagger Tag**：`trip-in-trip-experience`

## 功能开关

| 变量 | 作用 |
|------|------|
| `IN_TRIP_EXECUTION_ENABLED=true` | 行中总开关（必填） |
| `IN_TRIP_EXPERIENCE_LOOP_ENABLED=true` | 体验闭环子开关（权重 Cron） |
| 行程 `TRAVELING` | 微调查 / 权重接口鉴权前置 |
| M11 migration | `add_in_trip_experience_loop.sql` |

```bash
npx prisma db execute --schema prisma/schema.prisma \
  --file prisma/migrations/add_in_trip_experience_loop.sql
npx prisma generate
```

## 前端实现索引

| 模块 | 文件 |
|------|------|
| 类型 | `src/types/in-trip-experience.ts` |
| API | `src/api/in-trip-experience.ts` |
| 工具 | `src/lib/in-trip-experience.ts` |
| Hooks | `src/hooks/useInTripExperience.ts` |
| UI | `src/components/in-trip/experience/*` |
| 执行页集成 | `src/pages/execute/index.tsx` |
| 复盘 Tab 集成 | `src/pages/trips/[id].tsx`（insights） |

## 接口一览

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/pending` | 待完成微调查触发器 |
| POST | `/pulses` | 提交微调查 |
| GET | `/pulses` | 历史分页 |
| GET | `/weight-adjustments` | 推荐权重变更 |
| POST | `/weight-adjustments/read` | 标记已读 |
| GET | `/post-trip-summary` | 行后总结（`COMPLETED`） |

## 微调查触发器 `GET /pending`

**权限**：`TRAVELING` + 行程成员

| `triggerType` | 触发条件 |
|---------------|----------|
| `post_activity` | 当日体验类消费 ≥ ¥200 且未反馈 |
| `post_decision` | 24h 内环境 resolve / split 执行 / 再平衡 accept |
| `daily_review` | 当地时间 18:00–21:00 且今日未提交 |
| `split_party` | 分组汇合后 2h 内 |
| `last_day` | 行程最后一天 |

## 提交微调查 `POST /pulses`

| 字段 | 类型 | 说明 |
|------|------|------|
| `triggerType` | enum | 必填，与 pending 一致 |
| `activityName` | string | `post_activity` 时建议填写 |
| `expectationConfirmation` 等 | 1–5 | 可选整数 |
| `freeText` | string | 可选 |

**响应**：`ExperiencePulseSummary`，含 `emotionPolarity`（-1..+1 自动计算）

## 推荐权重 `GET /weight-adjustments`

权重写入 `trip.metadata.inTripRecommendationWeights`，历史在 `inTripWeightAdjustmentHistory`。

**Cron**：每日 22:00 UTC 对 `TRAVELING` 行程跑 `adjustNightly()`

## 行后总结 `GET /post-trip-summary`

**权限**：行程成员 + `status = COMPLETED`

首次调用触发生成并缓存至 `trip.metadata.postTripSummary`；`TRAVELING → COMPLETED` 时后端也会异步预生成。

## 用户流程

```
GET /today → pendingCards.experiencePulses
  → GET /experience/pending → 微调查卡片
  → POST /experience/pulses → 刷新 today + pending
  → GET /experience/weight-adjustments → 权重变更通知
  → POST /experience/weight-adjustments/read

行程 COMPLETED → GET /experience/post-trip-summary → 行后总结页
```

## 与 Today 联动

| Today 字段 | 来源 |
|------------|------|
| `pendingCards.experiencePulses` | `GET /experience/pending` 条数 |

## 能力成熟度

| 能力 | 状态 |
|------|------|
| 类型 + API + Hooks | ✅ |
| 微调查卡片 + Dialog | ✅ |
| 权重变更通知 UI | ✅ |
| 行后总结（复盘 Tab + 执行页 COMPLETED） | ✅ |

## 相关文档

- 行中总览：[`in-trip-execution-m7-api.md`](./in-trip-execution-m7-api.md)
- Group Pulse：[`in-trip-pulse-split-m10-api.md`](./in-trip-pulse-split-m10-api.md)

*文档版本：M11 · 同步 `trip-in-trip-experience` controller*
