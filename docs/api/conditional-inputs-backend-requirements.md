# 澄清问题 - conditionalInputs 后端需求

**用途**: 供后端实现时参考，前端据此渲染结构化表单（单选、多选、日期、文本等），避免用户看到单一文本框。

**接口**: `POST /api/trips/from-natural-language`  
**上下文**: `clarificationQuestions[].conditionalInputs`

---

## 1. conditionalInputs 字段结构

当澄清问题的某个 `option` 被选中后需要展示后续输入时，在该问题的 `conditionalInputs` 中配置。**建议后端直接返回完整结构**，前端已支持解析；若未返回，前端会做兜底推断。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `triggerValue` | string | ✅ | 触发此条件输入的选项值（与 `options[].value` 或 `options[].label` 精确或模糊匹配） |
| `inputType` | string | ✅ | `text` \| `single_choice` \| `multiple_choice` \| `number` \| `date` \| `date_range` |
| `label` | string | 推荐 | 输入框标签，如「请选择旅行节奏」 |
| `options` | array | 按 type | `single_choice` / `multiple_choice` 时必填，格式：`string[]` 或 `{ value, label }[]` |
| `paramKey` | string | 推荐 | 提交时字段名，存储为 `{questionId}_{paramKey}`，合并到 `partialParams.preferences` |
| `placeholder` | string | - | 占位符（如 `text` 类型） |
| `hint` | string | - | 辅助说明文案 |
| `required` | boolean | - | 是否必填，默认 true |
| `submitLabel` | string | - | 若提供，在输入框旁渲染提交按钮；用户点击时 PUT 答案并 POST 继续对话，避免依赖失焦/回车 |

**字段名兼容**: 后端可用 `trigger_value`、`input_type`、`param_key`、`submit_label`（snake_case），前端会自动转为 camelCase。

---

## 2. 典型场景与示例

### 2.1 补充旅行节奏偏好（单选）

用户选择「补充旅行节奏偏好 (紧凑/悠闲)」后，展示**单选**。

```json
{
  "id": "pref_pace",
  "question": "是否需要补充旅行偏好信息？",
  "type": "multi_choice",
  "options": [
    { "value": "supplement_pace", "label": "补充旅行节奏偏好 (紧凑/悠闲)" },
    { "value": "no_supplement", "label": "暂不补充，先确认核心信息" }
  ],
  "conditionalInputs": [
    {
      "triggerValue": "supplement_pace",
      "inputType": "single_choice",
      "label": "请选择旅行节奏",
      "paramKey": "pace",
      "options": ["紧凑", "悠闲", "适中"],
      "required": true
    }
  ]
}
```

### 2.2 补充偏好信息（徒步强度、美食、住宿风格）

用户选择「补充偏好信息 (如徒步强度、美食、住宿风格)」后，展示**多个**条件输入，每个为单选或多选。

```json
{
  "id": "pref_supplement",
  "question": "是否需要补充旅行偏好信息？",
  "type": "multi_choice",
  "options": [
    { "value": "supplement_details", "label": "补充偏好信息 (如徒步强度、美食、住宿风格)" },
    { "value": "no_supplement", "label": "暂不补充，先确认核心信息" }
  ],
  "conditionalInputs": [
    {
      "triggerValue": "supplement_details",
      "inputType": "single_choice",
      "label": "请选择徒步强度",
      "paramKey": "hiking_intensity",
      "options": ["轻松", "中等", "高强度"],
      "required": true
    },
    {
      "triggerValue": "supplement_details",
      "inputType": "multiple_choice",
      "label": "请选择美食偏好",
      "paramKey": "cuisine",
      "options": ["中餐", "西餐", "海鲜", "当地特色", "无特别要求"],
      "required": true
    },
    {
      "triggerValue": "supplement_details",
      "inputType": "multiple_choice",
      "label": "请选择住宿风格",
      "paramKey": "accommodation_style",
      "options": ["经济型", "舒适型", "精品酒店", "民宿", "青旅"],
      "required": true
    }
  ]
}
```

### 2.3 日期不准确需修改（日期范围）

```json
{
  "conditionalInputs": [
    {
      "triggerValue": "不准确,需要修改具体日期",
      "inputType": "date_range",
      "label": "请选择行程日期范围",
      "paramKey": "date_range",
      "required": true
    }
  ]
}
```

### 2.4 预算需调整（数字，建议加 submitLabel）

用户选择「预算需要调整」后展示数字输入；`submitLabel` 可渲染「确认提交」按钮，点击时 PUT 并 POST 继续，无需依赖失焦或回车。

```json
{
  "conditionalInputs": [
    {
      "triggerValue": "预算需要调整",
      "inputType": "number",
      "label": "请输入总预算 (元) *",
      "placeholder": "例如：50000",
      "paramKey": "total_budget",
      "required": true,
      "validation": { "min": 1, "max": 10000000 },
      "submitLabel": "确认提交"
    }
  ]
}
```

**行为**：用户点击「确认提交」时，前端仅发起 PUT，由后端返回后续内容，前端不再发 POST：
- `PUT /trips/nl-conversation/:sessionId/messages/:messageId`，body 示例：`{ "questionAnswers": { "confirm_inferred_info": "预算需要调整", "confirm_inferred_info_total_budget": 50000 } }`
- 后端在响应中返回 `nextClarificationQuestions` 或 `messages`，前端据此更新 UI

### 2.5 自由描述（文本兜底）

当无法用结构化选项表达时，使用 `text` 类型。

```json
{
  "conditionalInputs": [
    {
      "triggerValue": "other_preference",
      "inputType": "text",
      "label": "请描述您的偏好",
      "placeholder": "例如：喜欢中等强度徒步、想体验精品酒店、对海鲜美食感兴趣等",
      "hint": "您的偏好将帮助我筛选活动和住宿，让行程更个性化。",
      "paramKey": "other",
      "required": true
    }
  ]
}
```

---

## 3. triggerValue 匹配规则

- 用户选中选项后，前端用该选项的 `value`（或 `label`）与各 `conditionalInputs[].triggerValue` 做匹配。
- 支持：精确匹配、包含匹配、去除标点后的模糊匹配。
- **重要**: 同一选项可对应多个 `conditionalInputs`，通过不同 `paramKey` 区分。

---

## 4. 提交数据结构

用户提交时，前端会合并到 `questionAnswers`，key 格式：

- 有 `paramKey`: `{questionId}_{paramKey}`，如 `pref_supplement_hiking_intensity`
- 无 `paramKey`: `{fieldKey}_{triggerValue}`

后端在合并到 `partialParams.preferences` 时，建议使用 `paramKey` 作为最终字段名。

---

## 5. 前端兜底

若后端**未返回** `conditionalInputs` 或返回空数组，前端会：

- 根据 `options` 文案做语义推断（如「补充偏好」「需要修改日期」「预算」等）
- 生成对应的 `text` / `date_range` / `number` / `single_choice` / `multiple_choice` 兜底配置

**建议**：由后端显式返回 `conditionalInputs`，以获得更可控、可维护的体验。

---

## 7. nextClarificationQuestions（PUT 追问）

**场景**：用户选择「其他需要修改」时，条件输入文本框可能尚未展开就被视为已完成并提交。

**实现**：`PUT /trips/nl-conversation/:sessionId/messages/:messageId` 在更新答案时，若检测到 `confirm_inferred_info: "其他需要修改"` 且没有 `confirm_inferred_info_other`，则在响应中返回 `nextClarificationQuestions`，例如：

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

**前端配合**：PUT 成功回调中检查 `response.nextClarificationQuestions`，若存在则追加到当前消息的 `clarificationQuestions` 并渲染输入框。用户填写后再次 PUT 提交，对应值写入 `partialParams.confirmInferredOther`。

---

## 8. 「已收集所有答案」展示优先使用 label

**前端实现**：生成「已收集所有答案」预览文案时，若 `question.options` 中存在 `{ value, label }`，优先使用 `label` 展示答案，否则使用原始 value。示例：

> 已收集所有答案：您偏好的住宿类型是？: 露营/房车；餐饮方面您的偏好是？: 随性探索或自己烹饪

后端若在 `clarificationQuestions` 中返回 `options: [{ value, label }]`，前端将自动用 label 生成可读摘要。

---

## 6. 前端行为确认（供后端联调参考）

### 6.1 点击选项时是否发 POST？

**结论：否。** 点击「补充偏好信息(节奏/活动)」等选项时：

- 前端**仅**做本地 state 更新（`setMessages`）和 `PUT /trips/nl-conversation/:sessionId/messages/:messageId` 保存答案。
- **不会** 发起 `POST /trips/from-natural-language`。

**POST 的触发时机**（满足其一即可）：

1. 用户填写完所有问题后，点击「确认选择并继续」（多选场景）。
2. 所有问题回答完毕后，1.5 秒自动提交（单选场景）。
3. 用户在输入框输入内容并发送。

### 6.2 刷新页面后对话是否恢复？

**结论：前端会尝试恢复，依赖后端持久化。**

- 前端在 mount 时从 `localStorage` 读取 `nl_conversation_session`（sessionId），调用 `GET /trips/nl-conversation/:sessionId` 恢复对话。
- 后端需在每次 `POST /trips/from-natural-language` 后持久化会话（messages、partialParams、questionAnswers 等），并在 `GET` 时完整返回。
- 若 `GET` 返回 404 或会话数据不完整，前端会清空并显示新欢迎界面。

### 6.3 partialParams 是否已存在？

**结论：取决于首轮对话。**

- `partialParams` 由**后端在响应里返回**，前端不会在请求中发送。
- 首次消息（如「新西兰南岛自驾，3月初，10天」）后，后端应在 `partialParams` 中写入 `destination` 等字段。
- 第二轮及之后的请求会带上 `sessionId` 和 `clarificationAnswers`，后端需要通过 `sessionId` 恢复上下文（包含 `partialParams`）。
- 若首轮未正确解析或未持久化，后续点击「补充偏好信息」并提交时，后端可能拿不到 `destination`，需保证按 `sessionId` 正确恢复上下文。

### 6.4 请求文本内容（dto.text）

**结论：不是选项文案本身。**

- `text` 为 `generateConfirmationMessage(questions, answers)` 生成的**确认摘要**。
- 示例：`"明确2人出行，计划停留10天，对冰川徒步、直升机观光感兴趣"` 或 `"是否需要补充旅行偏好信息：补充偏好信息(节奏/活动)"`（通用格式）。
- **不会** 直接发送 `"补充偏好信息(节奏/活动)"` 或 `":补充偏好信息(节奏/活动)"` 这样的文案。
- 实际选项值、条件输入值通过 `clarificationAnswers` 传递，例如：
  - `{ questionId: "pref_supplement", value: ["补充偏好信息(节奏/活动)"] }`（主问题）
  - `{ questionId: "pref_supplement_pace", value: "悠闲" }`（条件输入）
