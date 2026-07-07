# Exploration 用户可配置旅行条件 — 后端需求（前端联调）

**Audience:** 后端 / Exploration API  
**前端分支:** `features/exploration`  
**现状:** Hub ① 使用 `researchProtocolId: iceland-discovery-v1`，`lockedFields` 覆盖用户输入，条件页只读。

---
 
## 1. 产品目标

C 端用户进入「告诉 AI 我想去哪」时，应能**自行配置**目的地、日期、人数、预算、车辆等，再进入原则 → 路线 → 可靠性闭环。

研究模式（冰岛 fixed protocol）保留为可选分支，通过环境变量 / feature flag 切换。

---

## 2. 已有 API（Consumer 模式）

```http
POST /api/exploration/scenarios
Authorization: Bearer <JWT>
```

**不传 `researchProtocolId` 时**，请求体字段应由用户输入生效：

```json
{
  "destinationCodes": ["IS"],
  "dateRange": { "startDate": "2026-09-10", "endDate": "2026-09-18" },
  "travelers": [{ "type": "ADULT" }, { "type": "ADULT" }],
  "budget": { "currency": "USD", "min": 3000, "max": 4000 },
  "mobilityContext": { "vehicleType": "2WD_COMPACT_SUV" }
}
```

**传 `researchProtocolId` 时**：协议 `lockedFields` 继续覆盖（研究样本不变）。

---

## 3. 后端需补充 / 确认的能力

### 3.1 P0 — 支持无 protocol 创建（或 protocol 可选）

| 项 | 说明 |
|----|------|
| `researchProtocolId` 可选 | 省略时不注入 lockedFields，以 body 为准 |
| 字段校验 | `destinationCodes`、`dateRange`、`travelers`、`budget`、`mobilityContext.vehicleType` 合法枚举 |
| 响应 | 仍返回 `scenarioId`、`sessionId`、`assignedVariant` 等 |

### 3.2 P0 — 返回「哪些字段被锁定」（推荐）

```http
GET /api/exploration/scenarios/:scenarioId
```

```json
{
  "success": true,
  "data": {
    "scenarioId": "...",
    "sessionId": "...",
    "researchProtocolId": null,
    "lockedFields": [],
    "scenario": {
      "destinationCodes": ["IS"],
      "dateRange": { "startDate": "...", "endDate": "..." },
      "travelers": [...],
      "budget": {...},
      "mobilityContext": { "vehicleType": "..." }
    }
  }
}
```

研究模式下 `lockedFields`: `["destinationCodes","dateRange","travelers","budget","mobilityContext"]`。

前端据此禁用对应表单项。

### 3.2 P1 — 创建前更新 / 创建后 PATCH（二选一）

**方案 A（推荐）：** 条件页填完再 POST（前端已采用）

**方案 B：** 创建 DRAFT 后允许 PATCH，materialize 前锁定

```http
PATCH /api/exploration/scenarios/:scenarioId/conditions
```

- 仅 `materializationStatus === 'DRAFT'` 且字段不在 `lockedFields` 时可改
- 409 若已 materialize

### 3.3 P1 — 车辆 / 目的地枚举 catalog

```http
GET /api/exploration/conditions/catalog?destinationCode=IS
```

```json
{
  "vehicleTypes": [
    { "code": "2WD_COMPACT_SUV", "label": "2WD 紧凑型 SUV" },
    { "code": "4WD_SUV", "label": "四驱 SUV" }
  ],
  "budgetPresets": [{ "currency": "USD", "min": 3000, "max": 4000 }]
}
```

### 3.4 P2 — 研究 vs Consumer 分流

| 模式 | 触发 | 行为 |
|------|------|------|
| Research | `researchProtocolId` 或 `RESEARCH_PROTOCOL_ENABLED=1` | lockedFields 全锁 |
| Consumer | 无 protocol | 用户 body 生效 |

环境变量建议：`EXPLORATION_CONSUMER_MVP_ENABLED=1` 且 **不**强制 `iceland-discovery-v1`。

---

## 4. 前端开关（已实现）

| 变量 | 含义 |
|------|------|
| `VITE_EXPLORATION_USER_CONDITIONS=1` | 入口页展示可编辑条件表单，POST 时不传 protocol |
| `VITE_EXPLORATION_RESEARCH_MODE=1` | 冰岛研究：自动 protocol + 条件只读确认页 |

二者互斥优先：**USER_CONDITIONS > RESEARCH_MODE**。

---

## 5. 联调验收

1. `VITE_EXPLORATION_USER_CONDITIONS=1`，修改车辆为 `4WD_SUV` → POST → principles → 选高地路线 → check 问题与车辆一致  
2. `VITE_EXPLORATION_RESEARCH_MODE=1`，条件页全锁，POST body 与 protocol 一致  
3. GET scenario 返回 `lockedFields` 与 UI 禁用状态一致  

---

## 6. 前端联系人

实现文件：

- `src/features/exploration/pages/ExploreStartPage.tsx`
- `src/features/exploration/components/ExploreConditionsForm.tsx`
- `src/features/exploration/conditions-form.util.ts`
