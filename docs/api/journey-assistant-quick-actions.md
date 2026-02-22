# 行程助手 - API 需求说明

## 1. 概述

行程助手右侧对话框包含两类可配置/需后端实现的内容：

1. **快捷操作按钮**（附近美食、找咖啡、购物、找药店等）：已支持后端动态返回
2. **附近搜索 / 对话结果**（searchResults、suggestedActions）：**必须由后端返回真实数据**，禁止返回示例/占位数据

---

# 快捷操作 API

## 2. 概述（快捷操作）

行程助手右侧对话框的快捷操作按钮（附近美食、找咖啡、购物、找药店等）原先为前端硬编码。现已改为可配置，支持后端动态返回，以根据行程目的地、用户偏好等提供个性化快捷操作。

**前端实现**：
- 默认配置：`src/constants/journey-assistant.ts` 中的 `DEFAULT_QUICK_ACTIONS`
- 若后端接口未实现或失败，前端使用默认配置兜底

## 3. 接口规范（可选实现）

### 3.1 获取快捷操作

```
GET /api/agent/journey-assistant/trips/:tripId/quick-actions
```

**路径参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| tripId | string | 行程 ID |

**响应**：
```json
{
  "items": [
    {
      "id": "food",
      "label": "附近美食",
      "prompt": "附近有什么好吃的",
      "icon": "utensils"
    },
    {
      "id": "coffee",
      "label": "找咖啡",
      "prompt": "附近有咖啡厅吗",
      "icon": "coffee"
    }
  ]
}
```

**字段说明**：
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 唯一标识 |
| label | string | 是 | 按钮显示文案 |
| prompt | string | 是 | 点击后发送给助手的提示词 |
| icon | string | 否 | 图标名，见下表。未提供时使用默认图标 |

**支持的 icon 值**：
| 值 | 对应图标 |
|----|----------|
| utensils | 餐具（美食） |
| coffee | 咖啡 |
| shopping | 购物袋 |
| hospital | 医院/药店 |

## 4. 业务建议

后端可根据以下维度返回个性化快捷操作：

1. **目的地**：冰岛行程可增加「极光观测」「温泉」等；泰国行程可增加「按摩」「夜市」
2. **用户偏好**：根据用户历史或偏好设置
3. **时段**：早/午/晚不同推荐
4. **行程阶段**：出发前 vs 旅途中

## 5. 前端调用

```typescript
// 调用示例
const res = await fetch(`/api/agent/journey-assistant/trips/${tripId}/quick-actions`);
const data = await res.json();
// data.items 为快捷操作列表，失败时前端使用 DEFAULT_QUICK_ACTIONS 兜底
```

封装调用（`src/api/assistant.ts`）：
```typescript
journeyAssistantApi.getQuickActions(tripId)
// 返回 null 时前端使用 DEFAULT_QUICK_ACTIONS
```

---

# 附近搜索 / 对话 API（必须返回真实数据）

## 6. 问题说明

当前行程助手对话中，用户提问（如「今晚哪里适合看极光」）时，若后端返回的是**示例/占位数据**（如「餐厅A」「餐厅B」「餐厅C」），会导致：

- 用户问极光观测点，却得到餐厅列表
- 导航按钮指向不存在的占位地点
- 体验与真实产品不符

**前端仅负责渲染后端返回的 `message`、`searchResults`、`suggestedActions`，不参与数据生成。**

## 7. 后端要求

| 接口 | 说明 |
|------|------|
| `POST /api/agent/journey-assistant/nearby` | 附近搜索：根据 `message` 和 `context.currentLocation` 返回**真实 POI** |
| `POST /api/agent/journey-assistant/chat` | 对话：根据用户问题返回**真实、上下文相关**的回答和 `searchResults` |

**禁止**：返回固定示例数据（如「餐厅A」「餐厅B」「餐厅C」）或与用户问题无关的占位内容。

**必须**：接入真实 POI/搜索能力（如 Google Places、内部 POI 库等），按用户问题类型（美食、极光观测点、药店等）返回对应类别的真实地点。

## 8. searchResults 响应格式

```json
{
  "searchResults": {
    "type": "restaurants",
    "items": [
      {
        "id": "poi-1",
        "name": "Reykjavik Kitchen",
        "nameCN": "雷克雅未克厨房",
        "distance": "200m",
        "rating": 4.5,
        "location": { "lat": 64.1466, "lng": -21.9426, "name": "Reykjavik Kitchen" }
      }
    ]
  },
  "suggestedActions": [
    { "action": "navigate_poi-1", "label": "Navigate to Reykjavik Kitchen", "labelCN": "导航到雷克雅未克厨房" }
  ]
}
```

`items` 中的 `location` 需包含真实坐标，以便前端调用导航。

---

# 找医院/找药店 - 需用户坐标

## 9. 问题说明

用户点击「找医院」或「找药店」时，若未提供当前位置，后端无法搜索「最近」的 POI，会返回「附近没有找到地点」。

## 10. 前端实现

- **获取坐标**：点击需要定位的快捷操作时，先调用 `navigator.geolocation.getCurrentPosition` 获取用户坐标
- **请求**：将坐标放入 `context.currentLocation: { lat, lng }` 传给 `nearby` 或 `chat` 接口
- **兜底**：定位失败或用户拒绝时，仍发送请求（不传坐标），后端返回 `needsLocation: true`
- **提示**：当响应含 `needsLocation: true` 时，前端显示「请允许获取位置权限后重试」

**需要定位的提示词**：`找医院`、`找药店`、`hospital`、`pharmacy`、`最近的医院`、`最近的药店`

---

# 状态概览 - 需返回真实行程数据

## 11. 问题说明

状态概览卡片（旅途中、第 X 天/共 Y 天、已完成 M/N、预算）若使用 mock 数据（如固定 3/15、€1200/€5000），会显得硬编码。

## 12. 前端兜底

当 `getTripStatus` 返回的 `journeyState` 为 mock 或缺失时，前端会从 `tripsApi.getById(tripId)` 获取行程，用真实 `TripDay`、`statistics`、`totalBudget` 等计算并展示。

**后端建议**：`GET /agent/journey-assistant/trips/:tripId/status` 应返回基于真实行程的 `journeyState.stats`，避免固定示例值。

---

# 行程是否已完成标记

## 13. 接口与字段

**接口**：`GET /api/agent/journey-assistant/trips/:tripId/status` 及所有 chat/nearby 等接口返回的 `journeyState`

**字段**：`journeyState.isCompleted`（boolean）
- `true`：行程已结束（phase 为 POST_TRIP，或 endDate 已过，或 status 为 COMPLETED）
- `false`：行程未结束

**前端用法**：在行程卡片、行程助手面板等位置根据 `isCompleted` 显示「已完成」徽章或置灰样式。

**行程列表 API**：`GET /api/trips` 返回的行程对象包含 `status` 字段（PLANNING | IN_PROGRESS | COMPLETED | CANCELLED），`status === 'COMPLETED'` 同样表示已完成。
