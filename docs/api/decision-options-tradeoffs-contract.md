# Decision Options · tradeoffs 字段契约

**日期：** 2026-07-02  
**消费方：** Plan Studio 决策空间 · `DecisionSpaceOptionCard`  
**相关端点：** `GET /api/trips/:tripId/decision-problems/:problemId/options`  
**后端投影：** `src/trips/decision-semantics/projections/decision-space-option-projection.util.ts`（NestJS repo）  
**前端映射：** `src/lib/decision-space-option-view.util.ts`  
**联调 Handoff：** [FE_INTEGRATION_HANDOFF.md](./FE_INTEGRATION_HANDOFF.md)

---

## 1. 目标

决策空间方案卡需展示设计稿四格指标、路线预览、驾驶时长对比条、AI 支持度。其中 **四格指标与对比条依赖 BFF 返回结构化 `options[].tradeoffs[]`**；仅含 `explanation` 文案时前端会降级展示，但无法还原完整数值体验。

Legacy V1.5（`DecisionSemanticsService.getOptions`）与 Canonical L2（`bridgeCandidatesToOptions`）在返回前均经 **Decision Space 投影层**（`projectDecisionOptionsForSpaceView`）补齐四格维度与 `routePreview`。

---

## 2. 响应形状（最小）

**后端 Fixture SSOT：** `decision-space-option-projection.util.spec.ts` · `relocate_lodging`  
**前端 Fixture SSOT：** `src/lib/decision-space-option-view.util.test.ts` · `OPTIONS`

两 fixture 结构对齐，字段说明见本文 **§A 前端 SSOT**。

```json
{
  "data": {
    "problemId": "dp_id:travel-buffer:1",
    "tripId": "3e4a1058-9218-467f-988a-c18008a14385",
    "options": [
      {
        "id": "opt_change_day2_lodge",
        "title": "更换 Day 2 住宿",
        "description": "将住宿改到 Ísafjörður，缩短驾驶距离。",
        "executable": true,
        "routePreview": {
          "placeNames": ["Patreksfjörður", "Dýrafjörður", "Ísafjörður"]
        },
        "tradeoffs": [
          {
            "dimension": "FLEXIBILITY",
            "direction": "IMPROVE",
            "value": 32,
            "unit": "PERCENT",
            "explanation": "可行度提升，缓冲更充裕"
          },
          {
            "dimension": "TIME",
            "direction": "IMPROVE",
            "value": 198,
            "unit": "MINUTE",
            "explanation": "原方案 6h42m → 调整后 3h18m"
          },
          {
            "dimension": "COST",
            "direction": "WORSEN",
            "value": 820,
            "unit": "CURRENCY",
            "explanation": "人均住宿差价"
          },
          {
            "dimension": "POI_COVERAGE",
            "direction": "IMPROVE",
            "value": 5,
            "unit": "PERCENT",
            "baselineValue": 90,
            "explanation": "核心 POI 保留率"
          }
        ]
      }
    ],
    "generatedAt": "2026-07-02T08:00:00.000Z"
  }
}
```

---

## 3. 验收 curl

```bash
TRIP=3e4a1058-9218-467f-988a-c18008a14385
PROB=dp_id:coverage-gap:1
BASE=http://${BACKEND_HOST:-127.0.0.1}:${BACKEND_PORT:-3000}/api

curl -s "$BASE/trips/$TRIP/decision-problems/$PROB/options" | jq '
  .data.options[] | {
    id, title,
    route: .routePreview.placeNames,
    dims: [.tradeoffs[] | {dimension, direction, value, unit, hasExplanation: (.explanation != null)}]
  }'
```

**通过标准（P0 方案卡）：** 每个 option 至少含 2 条带 `value+unit` 的 tradeoff；驾驶类问题 `TIME` 行含 `explanation` 对比文案；住宿/改线类含 `routePreview.placeNames`。

---

## 4. 后端实现锚点

| 路径 | 投影入口 |
|------|----------|
| Legacy V1.5 | `DecisionSemanticsService.buildOptionsFromIssue` → `projectDecisionOptionsForSpaceView` |
| Canonical L2 | `bridgeCandidatesToOptions` → `projectDecisionOptionsForSpaceView` |
| 单测 Fixture | `decision-space-option-projection.util.spec.ts` |

完整字段说明见下文 **§A**（前端 SSOT）。

---

## A. 前端 SSOT · 字段说明

### A.1 `tradeoffs[]`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `dimension` | string | ✅ | 见 A.2 |
| `direction` | `IMPROVE` \| `WORSEN` \| `UNCHANGED` | ✅ | 相对原方案变化方向 |
| `value` | number | 推荐 | 变化量或结果值（见 A.3） |
| `unit` | string | 与 `value` 成对 | `PERCENT` / `MINUTE` / `HOUR` / `DAY` / `CURRENCY` |
| `baselineValue` | number | 可选 | 仅 `POI_COVERAGE`+`PERCENT`：展示为 `95% (+5%)` |
| `explanation` | string | 推荐 | 人类可读说明；`TIME` 可承载对比条文案 |

#### 展示映射（`DecisionSpaceOptionCard`）

| dimension | unit | 卡片标签 | 展示示例 |
|-----------|------|----------|----------|
| `FLEXIBILITY` | `PERCENT` | 可行度 | `+32%` |
| `TIME` | `MINUTE` | 驾驶时长 | `3h 18m (-3h 24m)` |
| `COST` | `CURRENCY` | 预算(人均) | `+¥820` |
| `POI_COVERAGE` | `PERCENT` | 核心体验保留 | `95% (+5%)`（需 `baselineValue`） |

最多展示 **4 格**，优先级：`FLEXIBILITY` → `TIME` → `COST` → `POI_COVERAGE` → 其余维度。

### A.2 维度枚举（`dimension`）

| 值 | 含义 |
|----|------|
| `FLEXIBILITY` | 可行度 / 缓冲 / 日程弹性 |
| `TIME` | 驾驶或行程总时长 |
| `COST` | 人均或总预算变化 |
| `POI_COVERAGE` | 核心体验 / POI 保留率 |
| `FATIGUE` | 体力消耗 |
| `SAFETY` | 安全风险 |
| `COMFORT` | 舒适度 |
| `BOOKING_LOSS` | 预订损失 |
| `GROUP_FAIRNESS` | 团队公平性 |

### A.3 `value` 语义

| dimension | value 含义 | unit |
|-----------|--------------|------|
| `FLEXIBILITY` | 可行度 **变化百分点** | `PERCENT` |
| `TIME` | 调整后 **绝对时长**（分钟） | `MINUTE` |
| `COST` | 人均 **增加** 金额（正数；方向由 `direction` 表达） | `CURRENCY` |
| `POI_COVERAGE` | 保留率 **变化百分点** | `PERCENT` |

`TIME.explanation` 建议格式（供对比条解析）：

```
原方案 6h42m → 调整后 3h18m
原计划 6h42m → 新方案 3h18m
```

### A.4 `routePreview`

| 字段 | 类型 | 说明 |
|------|------|------|
| `routePreview.placeNames` | `string[]` | 2–4 个地名，按行程顺序；无则前端 fallback 到问题级 `affectedScopeDisplay[0].placeNames`（仅推荐方案） |

### A.5 降级行为（投影未命中时）

若投影层未补齐、仍只有 `explanation` 文案：

1. **指标格**：有 `value+unit` 用数值；否则截断 `explanation`
2. **对比条**：从 `explanation` 解析 `原方案 X → 调整后 Y`
3. **路线**：无 `routePreview` 时用问题级 scope
4. **AI 支持度**：前端启发式，不依赖 BFF

实现：`parseTradeoffComparisonSegments()` · `buildDecisionSpaceOptionViews()`

### A.6 JSON Schema（Draft 2020-12 片段）

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "tripnara.decision_option_tradeoffs@v1",
  "type": "object",
  "required": ["id", "tradeoffs"],
  "properties": {
    "id": { "type": "string", "minLength": 1 },
    "title": { "type": "string" },
    "description": { "type": "string" },
    "routePreview": {
      "type": "object",
      "properties": {
        "placeNames": {
          "type": "array",
          "items": { "type": "string", "minLength": 1 },
          "minItems": 2,
          "maxItems": 6
        }
      }
    },
    "tradeoffs": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/$defs/tradeoffRow" }
    }
  },
  "$defs": {
    "tradeoffRow": {
      "type": "object",
      "required": ["dimension", "direction"],
      "properties": {
        "dimension": {
          "type": "string",
          "enum": [
            "TIME", "COST", "FATIGUE", "POI_COVERAGE", "FLEXIBILITY",
            "SAFETY", "COMFORT", "BOOKING_LOSS", "GROUP_FAIRNESS"
          ]
        },
        "direction": {
          "type": "string",
          "enum": ["IMPROVE", "WORSEN", "UNCHANGED"]
        },
        "value": { "type": "number" },
        "unit": {
          "type": "string",
          "enum": ["DAY", "HOUR", "MINUTE", "CURRENCY", "PERCENT"]
        },
        "baselineValue": { "type": "number" },
        "explanation": { "type": "string" }
      },
      "allOf": [
        {
          "if": { "required": ["value"] },
          "then": { "required": ["unit"] }
        }
      ]
    }
  }
}
```
