# 准备度功能 API 接口规范

本文档描述准备度抽屉（Readiness Drawer）中待实现功能的 API 接口规范。

---

## 1. 保存勾选状态到后端

### 功能说明
用户勾选/取消勾选 must 项时，需要将状态保存到后端，以便跨设备同步和多用户协作。

### 接口设计

#### 1.1 批量保存勾选状态
**`PUT /readiness/trip/:tripId/checklist/status`**

**请求体：**
```typescript
{
  checkedItems: string[];  // 已勾选的 finding item ID 列表
}
```

**响应：**
```typescript
{
  success: true;
  data: {
    updated: number;  // 更新的项数量
    checkedItems: string[];  // 当前已勾选的项列表
  };
  error: null;
}
```

**示例：**
```json
// 请求
PUT /readiness/trip/123/checklist/status
{
  "checkedItems": ["must-item-1", "must-item-2", "must-item-5"]
}

// 响应
{
  "success": true,
  "data": {
    "updated": 3,
    "checkedItems": ["must-item-1", "must-item-2", "must-item-5"]
  },
  "error": null
}
```

#### 1.2 获取勾选状态
**`GET /readiness/trip/:tripId/checklist/status`**

**响应：**
```typescript
{
  success: true;
  data: {
    checkedItems: string[];  // 已勾选的 finding item ID 列表
    lastUpdated: string;  // ISO 8601 格式的最后更新时间
  };
  error: null;
}
```

**示例：**
```json
// 响应
{
  "success": true,
  "data": {
    "checkedItems": ["must-item-1", "must-item-2"],
    "lastUpdated": "2024-01-15T10:30:00Z"
  },
  "error": null
}
```

**业务逻辑：**
- 后端需要维护一个 `trip_checklist_status` 表，存储每个 trip 的勾选状态
- 支持增量更新（只更新变化的项）
- 支持多用户协作（最后写入优先或合并策略）

---

## 2. 查看解决方案

### 功能说明
用户点击阻塞项的"查看解决方案"按钮时，需要获取该阻塞项的修复方案列表。

### 接口设计

#### 2.1 获取阻塞项修复方案
**`GET /readiness/trip/:tripId/blockers/:blockerId/solutions`**

**路径参数：**
- `tripId`: 行程ID
- `blockerId`: 阻塞项ID（对应 `ReadinessFindingItem.id`）

**响应：**
```typescript
{
  success: true;
  data: {
    blockerId: string;
    blockerMessage: string;  // 阻塞项消息
    solutions: Solution[];  // 解决方案列表
  };
  error: null;
}

interface Solution {
  id: string;  // 方案ID
  title: string;  // 方案标题
  description: string;  // 方案描述
  type: 'replace' | 'adjust' | 'alternative' | 'manual';  // 方案类型
  changes?: {  // 预期变更（可选）
    time?: string;  // "+30min" / "-15min"
    distance?: string;  // "+12km" / "-5km"
    cost?: string;  // "+¥500" / "-¥200"
    risk?: 'increase' | 'decrease' | 'same';  // 风险变化
  };
  reasonCode?: string;  // 原因代码
  evidenceLink?: string;  // 证据链接
  autoApplicable: boolean;  // 是否可自动应用
  preview?: {  // 预览数据（如果可自动应用）
    affectedItems?: string[];  // 受影响的行程项ID
    newPlan?: any;  // 新计划预览（可选）
  };
}
```

**示例：**
```json
// 请求
GET /readiness/trip/123/blockers/blocker-f-4x4-vehicle/solutions

// 响应
{
  "success": true,
  "data": {
    "blockerId": "blocker-f-4x4-vehicle",
    "blockerMessage": "F - 公路段需租赁 4x4 车辆",
    "solutions": [
      {
        "id": "sol-1",
        "title": "替换为铺装路面路线",
        "description": "将 F 段改为使用铺装路面，绕行距离增加 15km",
        "type": "alternative",
        "changes": {
          "distance": "+15km",
          "time": "+25min",
          "risk": "decrease"
        },
        "reasonCode": "ALTERNATIVE_ROUTE",
        "autoApplicable": true,
        "preview": {
          "affectedItems": ["segment-f-1", "segment-f-2"]
        }
      },
      {
        "id": "sol-2",
        "title": "手动预订 4x4 车辆",
        "description": "在租车平台预订 4x4 车辆，预计费用 ¥800/天",
        "type": "manual",
        "changes": {
          "cost": "+¥800",
          "risk": "same"
        },
        "autoApplicable": false
      }
    ]
  },
  "error": null
}
```

**业务逻辑：**
- 根据阻塞项的 `id` 和 `category` 生成相应的解决方案
- 解决方案可以来自规则引擎、AI 建议或人工配置
- 如果 `autoApplicable: true`，前端可以显示"预览"和"应用"按钮

---

## 3. 标记不适用

### 功能说明
用户可以将某个阻塞项或 must 项标记为"不适用"（例如：该规则不适用于当前行程场景）。

### 接口设计

#### 3.1 标记项为不适用
**`POST /readiness/trip/:tripId/findings/:findingId/mark-not-applicable`**

**路径参数：**
- `tripId`: 行程ID
- `findingId`: Finding 项ID（对应 `ReadinessFindingItem.id`）

**请求体：**
```typescript
{
  reason?: string;  // 可选：用户填写的不适用原因
}
```

**响应：**
```typescript
{
  success: true;
  data: {
    findingId: string;
    marked: boolean;  // 是否已标记
    reason?: string;  // 不适用原因
    markedAt: string;  // ISO 8601 格式的标记时间
  };
  error: null;
}
```

**示例：**
```json
// 请求
POST /readiness/trip/123/findings/blocker-f-4x4-vehicle/mark-not-applicable
{
  "reason": "我们已有 4x4 车辆，无需租赁"
}

// 响应
{
  "success": true,
  "data": {
    "findingId": "blocker-f-4x4-vehicle",
    "marked": true,
    "reason": "我们已有 4x4 车辆，无需租赁",
    "markedAt": "2024-01-15T10:35:00Z"
  },
  "error": null
}
```

#### 3.2 取消标记不适用
**`DELETE /readiness/trip/:tripId/findings/:findingId/mark-not-applicable`**

**响应：**
```typescript
{
  success: true;
  data: {
    findingId: string;
    marked: false;
  };
  error: null;
}
```

#### 3.3 获取标记状态
**`GET /readiness/trip/:tripId/findings/not-applicable`**

**响应：**
```typescript
{
  success: true;
  data: {
    notApplicableItems: Array<{
      findingId: string;
      reason?: string;
      markedAt: string;
    }>;
  };
  error: null;
}
```

**业务逻辑：**
- 标记为不适用后，该 finding 在准备度检查中应被忽略
- 标记状态应持久化存储
- 下次刷新准备度时，应排除已标记为不适用的项

---

## 4. 稍后处理

### 功能说明
用户可以将某个阻塞项或 must 项添加到"稍后处理"列表，暂时跳过但保留提醒。

### 接口设计

#### 4.1 添加到稍后处理
**`POST /readiness/trip/:tripId/findings/:findingId/add-to-later`**

**路径参数：**
- `tripId`: 行程ID
- `findingId`: Finding 项ID

**请求体：**
```typescript
{
  reminderDate?: string;  // 可选：提醒日期（ISO 8601 格式）
  note?: string;  // 可选：备注
}
```

**响应：**
```typescript
{
  success: true;
  data: {
    findingId: string;
    added: boolean;
    reminderDate?: string;
    note?: string;
    addedAt: string;
  };
  error: null;
}
```

**示例：**
```json
// 请求
POST /readiness/trip/123/findings/blocker-f-4x4-vehicle/add-to-later
{
  "reminderDate": "2024-01-20T09:00:00Z",
  "note": "等确认路线后再处理"
}

// 响应
{
  "success": true,
  "data": {
    "findingId": "blocker-f-4x4-vehicle",
    "added": true,
    "reminderDate": "2024-01-20T09:00:00Z",
    "note": "等确认路线后再处理",
    "addedAt": "2024-01-15T10:40:00Z"
  },
  "error": null
}
```

#### 4.2 从稍后处理移除
**`DELETE /readiness/trip/:tripId/findings/:findingId/remove-from-later`**

**响应：**
```typescript
{
  success: true;
  data: {
    findingId: string;
    removed: boolean;
  };
  error: null;
}
```

#### 4.3 获取稍后处理列表
**`GET /readiness/trip/:tripId/findings/later`**

**响应：**
```typescript
{
  success: true;
  data: {
    laterItems: Array<{
      findingId: string;
      reminderDate?: string;
      note?: string;
      addedAt: string;
    }>;
  };
  error: null;
}
```

**业务逻辑：**
- 添加到稍后处理后，该 finding 在准备度检查中仍应显示，但标记为"稍后处理"状态
- 如果设置了 `reminderDate`，系统可以在该日期提醒用户
- 稍后处理列表可以在准备度页面或待办事项中显示

---

## 5. 生成打包清单

### 功能说明
根据准备度检查结果（must/should/optional 项、风险信息、目的地信息等）生成个性化的打包清单。

### 接口设计

#### 5.1 生成打包清单
**`POST /readiness/trip/:tripId/packing-list/generate`**

**请求体（可选）：**
```typescript
{
  includeOptional?: boolean;  // 是否包含可选物品（默认 false）
  categories?: string[];  // 指定类别：['clothing', 'gear', 'documents', 'electronics', 'other']
  customItems?: Array<{  // 用户自定义物品
    name: string;
    category: string;
    quantity?: number;
    note?: string;
  }>;
}
```

**响应：**
```typescript
{
  success: true;
  data: {
    tripId: string;
    generatedAt: string;  // ISO 8601 格式
    items: PackingListItem[];
    summary: {
      totalItems: number;
      byCategory: Record<string, number>;  // 按类别统计
    };
  };
  error: null;
}

interface PackingListItem {
  id: string;
  name: string;  // 物品名称
  category: 'clothing' | 'gear' | 'documents' | 'electronics' | 'food' | 'medical' | 'other';
  quantity: number;  // 数量
  unit?: string;  // 单位：'件', '套', '个' 等
  priority: 'must' | 'should' | 'optional';  // 优先级
  reason?: string;  // 为什么需要这个物品（基于准备度检查结果）
  sourceFindingId?: string;  // 来源的 finding ID（如果有）
  checked: boolean;  // 是否已勾选（用户标记为已打包）
  note?: string;  // 备注
}
```

**示例：**
```json
// 请求
POST /readiness/trip/123/packing-list/generate
{
  "includeOptional": true,
  "categories": ["clothing", "gear", "documents"]
}

// 响应
{
  "success": true,
  "data": {
    "tripId": "123",
    "generatedAt": "2024-01-15T10:45:00Z",
    "items": [
      {
        "id": "item-1",
        "name": "分层保暖衣物",
        "category": "clothing",
        "quantity": 3,
        "unit": "套",
        "priority": "must",
        "reason": "冰岛冬季户外温度低，天气多变",
        "sourceFindingId": "must-iceland-winter-clothing",
        "checked": false
      },
      {
        "id": "item-2",
        "name": "4x4 车辆租赁确认单",
        "category": "documents",
        "quantity": 1,
        "unit": "份",
        "priority": "must",
        "reason": "F 段公路需要 4x4 车辆",
        "sourceFindingId": "blocker-f-4x4-vehicle",
        "checked": false
      },
      {
        "id": "item-3",
        "name": "防滑链",
        "category": "gear",
        "quantity": 1,
        "unit": "套",
        "priority": "should",
        "reason": "应对极端天气风险",
        "sourceFindingId": "risk-extreme-weather",
        "checked": false
      }
    ],
    "summary": {
      "totalItems": 15,
      "byCategory": {
        "clothing": 5,
        "gear": 4,
        "documents": 3,
        "electronics": 2,
        "other": 1
      }
    }
  },
  "error": null
}
```

#### 5.2 获取打包清单
**`GET /readiness/trip/:tripId/packing-list`**

**响应：**
```typescript
{
  success: true;
  data: {
    tripId: string;
    items: PackingListItem[];
    summary: {
      totalItems: number;
      checkedItems: number;
      byCategory: Record<string, number>;
    };
    lastGeneratedAt?: string;
  };
  error: null;
}
```

#### 5.3 更新打包清单项状态
**`PUT /readiness/trip/:tripId/packing-list/items/:itemId`**

**请求体：**
```typescript
{
  checked?: boolean;  // 是否已勾选
  quantity?: number;  // 更新数量
  note?: string;  // 更新备注
}
```

**响应：**
```typescript
{
  success: true;
  data: {
    itemId: string;
    updated: boolean;
  };
  error: null;
}
```

#### 5.4 导出打包清单
**`GET /readiness/trip/:tripId/packing-list/export`**

**查询参数：**
- `format`: `'pdf' | 'json' | 'csv'` (默认 'pdf')

**响应：**
- PDF: 返回 PDF 文件流
- JSON/CSV: 返回 JSON 格式数据

**业务逻辑：**
- 打包清单应基于准备度检查结果自动生成
- 根据目的地、季节、活动类型、风险等级等因素推荐物品
- 支持用户自定义物品和编辑
- 支持导出为 PDF、JSON 或 CSV 格式

---

## 错误处理

所有接口应遵循统一的错误响应格式：

```typescript
{
  success: false;
  data: null;
  error: {
    code: string;  // 错误代码
    message: string;  // 错误消息
    details?: any;  // 可选的详细信息
  };
}
```

**常见错误代码：**
- `TRIP_NOT_FOUND`: 行程不存在
- `FINDING_NOT_FOUND`: Finding 项不存在
- `INVALID_FINDING_ID`: 无效的 Finding ID
- `UNAUTHORIZED`: 未授权访问
- `INTERNAL_ERROR`: 服务器内部错误

---

## 数据模型建议

### 数据库表设计

#### `trip_checklist_status`
```sql
CREATE TABLE trip_checklist_status (
  id SERIAL PRIMARY KEY,
  trip_id VARCHAR(255) NOT NULL,
  finding_id VARCHAR(255) NOT NULL,
  checked BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(trip_id, finding_id)
);
```

#### `trip_finding_marks`
```sql
CREATE TABLE trip_finding_marks (
  id SERIAL PRIMARY KEY,
  trip_id VARCHAR(255) NOT NULL,
  finding_id VARCHAR(255) NOT NULL,
  mark_type VARCHAR(50) NOT NULL,  -- 'not_applicable' | 'later'
  reason TEXT,
  reminder_date TIMESTAMP,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(trip_id, finding_id, mark_type)
);
```

#### `trip_packing_lists`
```sql
CREATE TABLE trip_packing_lists (
  id SERIAL PRIMARY KEY,
  trip_id VARCHAR(255) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit VARCHAR(20),
  priority VARCHAR(20) NOT NULL,  -- 'must' | 'should' | 'optional'
  reason TEXT,
  source_finding_id VARCHAR(255),
  checked BOOLEAN DEFAULT FALSE,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 实现优先级建议

1. **高优先级**：
   - 保存勾选状态到后端（跨设备同步必需）
   - 查看解决方案（核心功能）

2. **中优先级**：
   - 标记不适用（提升用户体验）
   - 生成打包清单（实用功能）

3. **低优先级**：
   - 稍后处理（可以先用本地存储实现）

---

## 前端集成示例

### 保存勾选状态
```typescript
// 在 handleToggleMustItem 中调用
const saveChecklistStatus = async (checkedItems: string[]) => {
  await readinessApi.updateChecklistStatus(tripId, checkedItems);
};
```

### 查看解决方案
```typescript
// 在阻塞项操作按钮中调用
const loadSolutions = async (blockerId: string) => {
  const solutions = await readinessApi.getSolutions(tripId, blockerId);
  // 显示解决方案对话框
};
```

### 标记不适用
```typescript
const markNotApplicable = async (findingId: string, reason?: string) => {
  await readinessApi.markNotApplicable(tripId, findingId, reason);
  // 刷新准备度数据
  await loadData();
};
```

### 生成打包清单
```typescript
const generatePackingList = async () => {
  const packingList = await readinessApi.generatePackingList(tripId, {
    includeOptional: true
  });
  // 显示打包清单页面或对话框
};
```

