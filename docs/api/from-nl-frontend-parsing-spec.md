# 自然语言创建行程 API - 前端解析规范

**接口**: `POST /api/trips/from-natural-language`  
**用途**: 确保前端正确解析并渲染 JSON 响应

**后端要求**：参见 [from-nl-backend-requirements.md](./from-nl-backend-requirements.md)，了解关键信息展示、summary_card、PUT 追问等接口支持要求。

---

## 1. 响应结构总览

```json
{
  "success": true,
  "data": {
    "sessionId": "nl_xxx_yyy",
    "needsClarification": true,
    "plannerResponseBlocks": [...],
    "clarificationQuestions": [...],
    "plannerReply": "文本回复",
    "partialParams": {...},
    "destination": "NZ",
    "destinationName": "新西兰",
    "lastMessageId": "uuid",
    "trip": null,
    "showConfirmCard": false
  }
}
```

**重要**: 顶层永远是 `{ success, data? | error? }`，实际业务数据在 `data` 内。`tripsApi.createFromNL` 的 `handleResponse` 已解包，直接返回 `data`。

### 不要用 `reply` / `suggestedQuestions` 做展示

创建行程 NL 接口的 JSON **不应依赖** `reply` 作为「规划师主文案」的稳定字段；前端仅使用 **`plannerReply`** 与 **`plannerResponseBlocks`**。响应里若仍带 **`reply`**，**忽略即可**（`tripsApi` 不会合并进 `plannerReply`）。**`suggestedQuestions` / `suggested_questions`** 当前产品侧**不展示**快捷 pill，前端忽略即可。

| 目的 | 使用的字段 | 说明 |
|------|------------|------|
| 结构化段落 / 高亮 / 摘要卡 / 问题卡等 | **`plannerResponseBlocks`** | 按顺序渲染；实现见 `ResponseBlockRenderer` |
| 仅一段纯文本、且无 blocks | **`plannerReply`** | 降级展示 |
| 结构化澄清（单选/填空等） | **`clarificationQuestions`** | 与 `question_card` 块联动 |

若页面写死 `response.reply` / `data.reply`，会一直拿不到内容（且不应再合并使用）。

---

## 2. plannerResponseBlocks 块类型与字段

| type | 必填字段 | 可选字段 | 说明 |
|------|----------|----------|------|
| `paragraph` | `content` | `id` | 段落文本 |
| `heading` | `text` | `level`(1-3), `id` | 标题 |
| `list` | `items` | `title`, `ordered`, `id` | 列表 |
| `highlight` | `highlightText` | `highlightType`(info\|warning\|success), `id` | 高亮框 |
| `summary_card` | `summary` | `id` | 摘要卡片 |
| `question_card` | `questionId` | `id` | 问题卡片（关联 clarificationQuestions） |
| `budget_summary` | `budget` | `id` | 预算摘要 |
| `itinerary_overview` | `itinerary` | `id` | 行程概览 |

### 前端渲染

- `ResponseBlockRenderer` 已实现各类型渲染
- 使用空值保护：`block.content ?? ''`、`Array.isArray(block.items) ? block.items : []`

---

## 3. clarificationQuestions 结构

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 唯一标识，question_card 的 questionId 关联 |
| `question` | string | ✅ | 问题文本 |
| `type` | string | ✅ | `text` \| `single_choice` \| `multi_choice` \| `date` \| `number` \| `boolean` |
| `required` | boolean | ✅ | 是否必填 |
| `options` | array | 按 type | `string[]` 或 `{ value, label }[]`，single/multi_choice 时必有 |
| `placeholder` | string | - | 占位符 |
| `group` | string | - | `required` \| `optional` |
| `metadata` | object | - | `{ category, priority, fieldName }` |
| `conditionalInputs` | array | - | 条件输入配置（详见 [conditional-inputs-backend-requirements.md](./conditional-inputs-backend-requirements.md)） |

### options 格式兼容

`normalizeClarificationQuestion` 与 `NLClarificationQuestionCard` 已兼容：

- 格式 1: `["选项A", "选项B"]`
- 格式 2: `[{ value: "solo", label: "独旅" }, ...]`

---

## 4. 数组字段默认值

`tripsApi.createFromNL` 与 `NLChatInterface` 已对以下字段做空值保护：

```typescript
const blocks = Array.isArray(data.plannerResponseBlocks) ? data.plannerResponseBlocks : [];
const questions = Array.isArray(data.clarificationQuestions) ? data.clarificationQuestions : [];
const params = data.partialParams ?? {};
```

---

## 5. partialParams 扩展字段

`partialParams` 仍为 `Record<string, any>`，收集「补充偏好信息」后可能多出：

| 字段 | 类型 | 说明 |
|------|------|------|
| `travelStyle` | string | 旅行风格 A–E 五选一 |
| `pace` | string | 节奏：2–3 / 3–5 / 5+ |
| `riskTolerance` | string | 风险承受度 |
| `riskAccepted` | string[] | 可接受风险项（夜间自驾、山路等，可多选） |
| `departureCity` | string | 出发城市 |
| `coreExpectation` | string | 核心期望 |
| `whatToAvoid` | string | 希望避免的内容 |

---

## 6. conditionalInputs（补充偏好信息）

「补充偏好信息」的 `conditionalInputs` 现可包含：

- **travelStyle**：A–E 五选一（`paramKey: "travelStyle"`）
- **pace**：2–3 / 3–5 / 5+（`paramKey: "pace"`）
- **riskAccepted**：夜间自驾、山路等可多选（`paramKey: "riskAccepted"`）

---

## 7. thinkingProcess

仍为 `{ summary, content }`，文案会根据已收集的 `travelStyle`、`pace`、`riskTolerance` 等更新。

---

## 7.1 phaseIndicator（阶段指示器）

可选字段，表示当前对话所处的收集阶段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `phase` | number | 当前阶段序号（1-based） |
| `phaseName` | string | 阶段名称（如 "硬约束确认"） |
| `progress` | string | 进度展示（如 "1/4"） |
| `totalPhases` | number | 总阶段数 |

示例：`{ "phase": 1, "phaseName": "硬约束确认", "progress": "1/4", "totalPhases": 4 }`。前端可在思考过程折叠框标题旁展示「· 硬约束确认 1/4」。

---

## 8. 类型定义

参见 `src/types/trip.ts`：

- `CreateTripFromNLResponse`：含 `sessionId`, `destination`, `destinationName`, `needsClarification`, `plannerReply`, `plannerResponseBlocks`, `clarificationQuestions`, `partialParams`, `thinkingProcess`, `progressSteps`, `phaseIndicator` 等
- `ParsedTripParams`：已扩展 `travelStyle`, `pace`, `riskTolerance`, `riskAccepted`, `departureCity`, `coreExpectation`, `whatToAvoid`
- `PlannerResponseBlock`：联合类型，覆盖上述块类型
- `NLClarificationQuestion`：前端内部格式（question→text, type→inputType），`conditionalInputs` 支持偏好补充字段
