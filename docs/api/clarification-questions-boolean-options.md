# 澄清问题 - boolean 类型默认选项

## 1. 概述

当澄清问题 `type === 'boolean'` 且未配置 `options` 时，后端应自动补充默认选项，确保前端能正确渲染「是/否」选择。

## 2. 修改位置（后端）

### 2.1 generateStructuredClarificationResponseForRound（特化澄清主流程）

当 `type === 'boolean'` 且未配置 `options` 时，自动补充默认选项：

```json
[
  { "value": "true", "label": "是" },
  { "value": "false", "label": "否" }
]
```

### 2.2 blockedByCriticalFields 分支（被 Critical 字段阻止时的返回）

对 `type === 'boolean'` 且无 `options` 的问题，同样补充上述默认选项。

## 3. 接口返回示例

```json
{
  "clarificationQuestions": [
    {
      "id": "is_has_insurance",
      "question": "你购买了旅游保险吗？",
      "type": "boolean",
      "required": true,
      "options": [
        { "value": "true", "label": "是" },
        { "value": "false", "label": "否" }
      ],
      "metadata": {
        "category": "insurance",
        "isCritical": true
      }
    }
  ]
}
```

## 4. 前端兜底

前端 `normalizeClarificationQuestions`（`src/utils/nl-conversation-adapter.ts`）已实现兜底：当后端返回 `type === 'boolean'` 且 `options` 为空时，自动注入上述默认选项。后端实现后，前后端行为一致。
