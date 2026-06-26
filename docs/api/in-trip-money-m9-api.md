# Money Brain 行中层 — 前端接口文档（M9）

> 完整规范见产品/API 文档。本文档为前端实现索引。

**路径前缀**：`/api/trips/:tripId/in-trip/money`  
**Swagger Tag**：`trip-in-trip-money`

## 功能开关

| 变量 | 作用 |
|------|------|
| `IN_TRIP_EXECUTION_ENABLED=true` | 行中总开关（必填） |
| `IN_TRIP_MONEY_BRAIN_ENABLED=true` | Money Brain 可选子开关 |

## 前端实现索引

| 模块 | 文件 |
|------|------|
| 类型 | `src/types/in-trip-money.ts` |
| API | `src/api/in-trip-money.ts` |
| 工具 | `src/lib/in-trip-money.ts` |
| Dashboard | `src/hooks/useInTripMoneyDashboard.ts` |
| 再平衡 | `src/hooks/useInTripMoneyRebalance.ts` |
| UI | `src/components/in-trip/money/*` |
| 执行页集成 | `src/pages/execute/index.tsx` |

## 接口一览

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/money/dashboard` | 6 桶进度 + 今日消费 |
| POST | `/money/transactions` | 智能记账 + 助推 |
| GET | `/money/transactions` | 全行程流水分页 |
| GET | `/money/nudges/today` | 今日助推时间线 |
| GET | `/money/rebalance` | 待处理再平衡建议 |
| POST | `/money/rebalance/:id/respond` | 组织者 accept/keep |

## 用户流程

```
GET /money/dashboard → InTripMoneyDashboardPanel
  → 记一笔 → InTripMoneyRecordDialog → POST /transactions
  → nudgesTriggered → InTripMoneyNudgeList
  → pendingRebalanceCount > 0 → InTripMoneyRebalancePanel
```

## 与 Today 联动

- `quickActions.record_expense` → 打开 `InTripMoneyRecordDialog`（不再跳转 Budget 页）
- `pendingCards.rebalanceSuggestions` ← `GET /rebalance` pending 数量

## 能力成熟度

| 能力 | 状态 |
|------|------|
| 6 桶 dashboard | ✅ |
| 手输记账 + L3 同步 | ✅ |
| 四类数字助推展示 | ✅ |
| 再平衡 accept/keep | ✅ |
| 拍照 OCR / 语音 ASR | ⏳ Phase 2 |

*文档版本：M9 · 同步 `trip-in-trip-money` controller*
