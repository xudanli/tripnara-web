# 体验兑现系统 — 前端集成指南

**Status:** Active  
**Base Path:** `/api`  
**统一响应:** `{ success: boolean, data?: T, error?: { code, message, details? } }`

---

## 模块索引

| 模块 | 路径 |
|------|------|
| 类型定义 | `src/types/experience-fulfillment.ts` |
| Trip metadata 解析 | `src/lib/trip-experience-metadata.util.ts` |
| Planner blocks 解析 | `src/lib/parse-planner-blocks.util.ts` |
| 展示文案 / 徽章 | `src/lib/experience-fulfillment-display.util.ts` |
| API 聚合 | `src/api/experience-fulfillment.ts` |
| UI 组件 | `src/components/experience-fulfillment/` |
| NL 创建 | `src/components/trips/NLChatInterface.tsx` |
| 快速规划 | `src/components/trips/QuickPlanFlow.tsx` |
| 草案生成 | `src/pages/trips/generate.tsx` |
| 行程详情 / 工作台 | `src/pages/trips/[id].tsx`、`src/pages/plan-studio/index.tsx` |
| **Schedule Tab 行程项** | `ScheduleTab.tsx` + `ItineraryItemRow` + `PresentedItineraryItemInsight` |
| 行中微调查 | `src/components/in-trip/experience/InTripExperiencePulseDialog.tsx` |
| 行后总结 | `src/components/in-trip/experience/InTripPostTripSummaryPanel.tsx` |

---

## 快速引用

```typescript
import {
  experienceFulfillmentApi,
  parseWhyRecommended,
} from '@/api/experience-fulfillment';

import {
  TripExperienceIntentPanel,
  TravelUnderstandingCard,
  ExperienceExplanationCardView,
  ItineraryPresentationPanel,
} from '@/components/experience-fulfillment';

import {
  extractExperienceUnderstanding,
  shouldShowTripExperienceIntentPanel,
} from '@/lib/trip-experience-metadata.util';
```

---

## 规划期数据流

```text
NL / Quick Plan / Draft
  → experienceUnderstanding（旅行理解卡）
  → experienceExplanation（四级确定性 + 推荐理由）
  → plannerResponseBlocks（含 why_recommended / summary_card）
  → itineraryPresentation（用户向日程双层卡）
  → 确认创建 → trip.metadata.experienceUnderstanding 持久化
```

### NL 创建

- **API:** `tripsApi.createFromNL` / `createFromNLv2`
- **确认:** `tripsApi.confirmCreateTrip(sessionId, { confirm: true })`
- **会话恢复:** `GET /trips/nl-conversation/:sessionId` → `metadata.experienceUnderstanding`

前端在确认阶段渲染：

1. `plannerResponseBlocks` 中的 `why_recommended`、`summary_card`
2. 顶层 `experienceUnderstanding`、`experienceExplanation`（与 blocks 互补）

### Quick Plan

- **API:** `quickPlanApi.quickPlan` → `experienceUnderstanding` / `experienceExplanation`
- **预览日程:** `preview.itineraryPresentation`（有则优先于 `preview.days` 纯时间轴）

### 草案

- **API:** `tripsApi.generateDraft` → `itineraryPresentation`

---

## Trip metadata（GET /trips/:id）

| Key | 说明 | 前端组件 |
|-----|------|----------|
| `experienceUnderstanding` | 规划期旅行理解卡 | `TripExperienceIntentPanel` |
| `experienceExplanation` | 规划期体验解释（若持久化） | 同上 |
| `experienceOutcomeGraph` | 行中微调查记录 | 后端写入，前端 pulse 提交 |
| `postTripSummary` | 行后总结缓存 | `InTripPostTripSummaryPanel` |

详情页 **总览** 右侧栏、规划工作台 **叙事主题下方** 会自动展示 `TripExperienceIntentPanel`（当 metadata 含理解卡或解释卡时）。

### Schedule Tab（日程双层卡）

- **数据来源:** `trip.metadata.itineraryPresentation`（创建 / draft / quick-plan 确认后持久化）
- **匹配规则:** `dayNumber` + `placeId`；同 POI 多次出现时按目的地时区 `HH:mm` 消歧
- **日卡片头部:** 补充 `theme`、`CertaintyBadge`、驾驶/步行负荷、`coreExperience`
- **行程项行内:** `ItineraryItemRow` 嵌入 `PresentedItineraryItemInsight`（灵感层 + 可信层 + badges）

工具函数：`buildItineraryPresentationLookup`、`matchPresentedItineraryItem`（`src/lib/itinerary-presentation-match.util.ts`）

---

## 行中 / 行后

**前置开关:** `IN_TRIP_EXECUTION_ENABLED` + `IN_TRIP_EXPERIENCE_LOOP_ENABLED`

| 接口 | 前端 |
|------|------|
| `GET .../tag-match-options` | `inTripExperienceApi.getTagMatchOptions` → Pulse 对话框标签选择 |
| `POST .../pulses` + `experienceTagMatch` | `InTripExperiencePulseDialog` |
| `GET .../post-trip-summary` | `experienceFulfillmentReview` 区块 |

---

## 四级确定性文案

| `UserCertaintyLevel` | 用户文案 |
|----------------------|----------|
| `EXCELLENT_CONDITIONS` | 条件极佳 |
| `SUITABLE` | 适合前往 |
| `UNCERTAIN` | 存在不确定性 |
| `NOT_RECOMMENDED` | 不建议前往 |

使用 `CertaintyBadge` 或 `experienceExplanation.overallLabelZh`，**不要**展示未校准的概率百分比。

---

## 注意事项

1. NL 回复只用 `plannerReply` / `plannerResponseBlocks`，忽略响应中的 `reply`。
2. `why_recommended` 与 `experienceExplanation` 可能同时出现；前者在 blocks 流内，后者为完整结构化卡。
3. `draftDays` 保留供时间轴编辑；`itineraryPresentation` 仅供用户向阅读。
4. 工程术语（Decision OS、F-road、2WD）已由后端过滤，前端直接展示 API 文案即可。

---

## 相关文档

- [from-nl-frontend-parsing-spec.md](./from-nl-frontend-parsing-spec.md)
- 后端 EXPERIENCE_LOOP_API.md（行中闭环）
