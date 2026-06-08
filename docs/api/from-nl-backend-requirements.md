# 自然语言创建行程 - 后端接口支持要求

**用途**: 供后端实现或联调时参考，确保与前端渲染逻辑一致。

**完整接口文档**: 参见 [from-nl-api-spec.md](./from-nl-api-spec.md)。

---

## 1. 接口总览

| 接口 | 方法 | 说明 |
|------|------|------|
| `/trips/from-natural-language` | POST | 创建/继续对话，返回规划内容与澄清问题 |
| `/trips/nl-conversation/:sessionId/messages/:messageId` | PUT | 更新消息的 questionAnswers，可返回追问与提示 |
| `GET /trips/nl-conversation/:sessionId` | GET | 恢复会话（持久化 messages、partialParams、questionAnswers） |

---

## 2. POST 响应：关键信息展示

### 2.1 partialParams（必填，用于「关键信息」展示）

当 `needsClarification === true` 且需要用户确认出行时间、返程时间、预算时，**必须在 `partialParams` 中返回**以下至少一项，否则前端会显示空白：

| 字段 | 类型 | 说明 |
|------|------|------|
| `destination` | string | 目的地（国家代码如 CN，或城市名） |
| `destinationName` | string | 可读名称，如「杭州+千岛湖」「新西兰」 |
| `startDate` | string | 出行时间，ISO 8601 日期，如 `2026-03-15` |
| `endDate` | string | 返程时间，ISO 8601 日期 |
| `totalBudget` | number | 总预算（单位与 currency 一致） |
| `currency` | string | 货币代码，默认 CNY |
| `duration` | string | 可选，当无 startDate/endDate 时使用，如「10天」 |

**建议**：在首轮解析到目的地、日期、预算后，立即写入 `partialParams` 并随响应返回。

### 2.2 顶层 destinationName

响应根节点可返回 `destinationName`，前端会合并到 `parsedParams` 用于展示：

```json
{
  "success": true,
  "data": {
    "destination": "CN",
    "destinationName": "杭州+千岛湖",
    "partialParams": {
      "destination": "CN",
      "startDate": "2026-03-15",
      "endDate": "2026-03-22",
      "totalBudget": 15000,
      "currency": "CNY"
    },
    "needsClarification": true,
    "clarificationQuestions": [...],
    "plannerResponseBlocks": [...]
  }
}
```

---

## 3. summary_card（plannerResponseBlocks 内）

当需要展示「行程信息」摘要卡片时，在 `plannerResponseBlocks` 中包含 `type: "summary_card"` 块。前端按以下字段渲染：

| 字段 | 类型 | 说明 |
|------|------|------|
| `destination` | string | 目的地 |
| `startDate` | string | 出行时间（ISO 日期） |
| `endDate` | string | 返程时间（ISO 日期） |
| `duration` | string | 当无 startDate 时使用，如「10天」 |
| `travelers` | string | 出行人数，如「双人」 |
| `budget` | object | `{ amount: number, currency: string, details?: string[] }` |

**示例**：

```json
{
  "type": "summary_card",
  "id": "summary-1",
  "summary": {
    "destination": "杭州+千岛湖",
    "startDate": "2026-03-15",
    "endDate": "2026-03-22",
    "budget": { "amount": 15000, "currency": "CNY" }
  }
}
```

**说明**：

- 若有 `summary_card` 且 `summary.destination` 存在，前端直接渲染该块。
- 若无 `summary_card` 或 `summary` 为空，前端用 `partialParams` 做兜底展示（见 2.1）。

### 3.1 扩展字段：天数分配与必含景点

当 LLM 解析出多城市、天数分配、必含景点时，可在 `summary` 中补充以下字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `cities` | string[] | 城市列表，如 `["杭州", "千岛湖"]` |
| `dayAllocation` | Array<{ city: string; days: number }> | 各城市天数，如 `[{ city: "杭州", days: 2 }, { city: "千岛湖", days: 2 }]` |
| `dayAllocationDisplay` | string | **推荐**。预格式化文案，如 `"杭州 2 天、千岛湖 2 天"`，前端优先使用 |
| `mustHavePois` | string[] | 必含景点/POI，如 `["西湖", "苏堤"]` |

**前端渲染逻辑**：优先使用 `dayAllocationDisplay`，缺失时由 `dayAllocation` 自动拼接。

### 3.2 LLM 输出 → summary_card 转换规范

当后端「已注入 summary_card + 阶段 1 确认」时，应从 LLM 解析结果构建 `summary_card`。示例转换：

**LLM 输出**（来自 LlmService）：

```json
{
  "destination": "CN",
  "startDate": "2026-03-20T00:00:00.000Z",
  "endDate": "2026-03-24T00:00:00.000Z",
  "totalBudget": 8000,
  "cities": ["杭州", "千岛湖"],
  "dayAllocation": [
    { "city": "杭州", "days": 2 },
    { "city": "千岛湖", "days": 2 }
  ],
  "mustHavePois": []
}
```

**转换后的 summary_card**：

```json
{
  "type": "summary_card",
  "id": "summary-1",
  "summary": {
    "destination": "杭州+千岛湖",
    "startDate": "2026-03-20",
    "endDate": "2026-03-24",
    "budget": { "amount": 8000, "currency": "CNY" },
    "cities": ["杭州", "千岛湖"],
    "dayAllocation": [
      { "city": "杭州", "days": 2 },
      { "city": "千岛湖", "days": 2 }
    ],
    "dayAllocationDisplay": "杭州 2 天、千岛湖 2 天",
    "mustHavePois": []
  }
}
```

**dayAllocationDisplay 生成规则**：

```typescript
// 后端生成 dayAllocationDisplay 的推荐实现
function buildDayAllocationDisplay(dayAllocation: Array<{ city: string; days: number }>): string {
  if (!dayAllocation?.length) return '';
  return dayAllocation.map(a => `${a.city} ${a.days} 天`).join('、');
}
```

**说明**：

- `destination`：可用 `cities.join('+')` 或 LLM 返回的 `destination` 对应可读名。
- `startDate` / `endDate`：取 ISO 日期的日期部分（`YYYY-MM-DD`）。
- `dayAllocationDisplay`：建议后端生成，前端优先展示；缺失时前端会从 `dayAllocation` 自动拼接。
- `mustHavePois` 为空数组时可不返回，或返回 `[]`。

---

## 4. PUT 响应：nextClarificationQuestions 与 plannerResponseBlocks

### 4.1 接口

`PUT /trips/nl-conversation/:sessionId/messages/:messageId`

**请求体**：
```json
{
  "questionAnswers": {
    "confirm_inferred_info": "其他需要修改",
    "confirm_inferred_info_other": "出行时间改为3月"
  }
}
```

### 4.2 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `nextClarificationQuestions` | array | 追问问题，前端会追加到当前消息并渲染 |
| `plannerResponseBlocks` | array | 提示块，用于渲染提示信息 |
| `messages` | array | 可选，批量追加新消息 |

### 4.3 nextClarificationQuestions 场景

**场景**：用户选「其他需要修改」但尚未填写 `confirm_inferred_info_other`。

**处理**：PUT 时若发现 `confirm_inferred_info === "其他需要修改"` 且缺少 `confirm_inferred_info_other`，在响应中返回 `nextClarificationQuestions`：

```json
{
  "success": true,
  "data": {
    "sessionId": "...",
    "nextClarificationQuestions": [
      {
        "id": "confirm_inferred_info_other",
        "question": "请描述您想调整的内容",
        "type": "text",
        "placeholder": "例如：出行时间改为3月、预算增加到2万"
      }
    ]
  }
}
```

前端会解析并追加到当前消息的 `clarificationQuestions`，并渲染对应输入框。

### 4.4 plannerResponseBlocks

PUT 响应中可返回 `plannerResponseBlocks`，前端会合并到当前消息的 `responseBlocks` 用于展示（段落、高亮等）。

---

## 5. conditionalInputs 与 submitLabel

详见 [conditional-inputs-backend-requirements.md](./conditional-inputs-backend-requirements.md)。

**要点**：

- 仅当 `conditionalInputs[].submitLabel` 存在时，前端才为该条件输入渲染独立提交按钮。
- 无 `submitLabel` 时，前端只显示主按钮「确认并继续」。

---

## 6. 联调检查清单

- [ ] `needsClarification` 时，`partialParams` 包含 `destination` / `startDate` / `endDate` / `totalBudget` 至少其一
- [ ] 顶层或 `partialParams` 中提供 `destinationName` 用于可读展示
- [ ] 需要展示摘要时，在 `plannerResponseBlocks` 中返回 `summary_card`，且 `summary` 含 `destination` / `startDate` / `endDate` / `budget`
- [ ] PUT 更新答案时，需要追问则返回 `nextClarificationQuestions`
- [ ] `clarificationQuestions` 中 `options` 使用 `{ value, label }` 时，优先用 `label` 展示
