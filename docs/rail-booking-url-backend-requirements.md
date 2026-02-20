# 铁路路线 bookingUrl 与 book_rail 操作 - 后端需求说明

**日期**: 2026-02-15  
**功能**: 每条铁路路线生成 Deutsche Bahn 查询/预订链接，并增加「预订」操作

---

## 一、rail-direct.service.ts

### 1.1 新增 bookingUrl 字段

每条铁路路线需生成 Deutsche Bahn 的查询/预订链接：

- **基础 URL**: `https://reiseauskunft.bahn.de/bin/query.exe/dn`
- **参数**:
  - `S`: 出发站（如 `Berlin Hbf`）
  - `Z`: 到达站（如 `München Hbf`）
  - `date`: 日期，格式 `dd.mm.yy`（如 `20.02.26`）
  - `time`: 时间，格式 `HH:mm`（如 `17:36`）
  - `start`: 固定为 `1`

### 1.2 示例

```
https://reiseauskunft.bahn.de/bin/query.exe/dn?S=Berlin+Hbf&Z=München+Hbf&date=20.02.26&time=17:36&start=1
```

### 1.3 输出结构

每条 `railRoutes[i]` 需包含：

```typescript
{
  origin: string;
  destination: string;
  departure: string;  // ISO 8601
  arrival: string;
  // ... 其他现有字段
  bookingUrl: string;  // 新增：Deutsche Bahn 链接
}
```

---

## 二、planning-assistant-v2.service.ts

### 2.1 新增 book_rail 操作

每条铁路卡片的 `actions` 数组需增加：

```json
{
  "action": "book_rail",
  "label": "Book",
  "labelCN": "预订",
  "params": {
    "routeIndex": 0,
    "bookingUrl": "https://reiseauskunft.bahn.de/bin/query.exe/dn?S=Berlin+Hbf&Z=München+Hbf&date=20.02.26&time=17:36&start=1"
  }
}
```

### 2.2 完整 actions 示例

```json
"actions": [
  {
    "action": "view_rail_detail",
    "label": "View details",
    "labelCN": "查看详情",
    "params": { "routeIndex": 0 }
  },
  {
    "action": "add_rail_to_itinerary",
    "label": "Add to trip",
    "labelCN": "加入行程",
    "params": { "routeIndex": 0 }
  },
  {
    "action": "book_rail",
    "label": "Book",
    "labelCN": "预订",
    "params": {
      "routeIndex": 0,
      "bookingUrl": "https://reiseauskunft.bahn.de/..."
    }
  }
]
```

---

## 三、前端处理（已实现）

| 操作       | 前端行为                                                                 |
|------------|--------------------------------------------------------------------------|
| **预订**   | 点击后 `window.open(params.bookingUrl, '_blank')` 新窗口打开            |
| **加入行程** | 创建行程项时，将 `railRoutes[i].bookingUrl` 作为 `externalUrl` 传入，用于展示「预订」链接 |

### 3.1 数据来源

- `bookingUrl` 可从 `route.bookingUrl`（路线级）或 `actions` 中 `book_rail` 的 `params.bookingUrl` 获取
- 二者有其一即可展示「预订」按钮

### 3.2 CreateItineraryItemRequest 扩展

前端已支持 `externalUrl` 字段，加入行程时传入 `route.bookingUrl`：

```typescript
{
  tripDayId: string;
  type: 'TRANSIT';
  costCategory: 'TRANSPORTATION';
  placeName: string;
  externalUrl?: string;  // 预订链接，后端需支持
  // ...
}
```

---

## 四、验收标准

- [ ] 每条 railRoutes 包含 `bookingUrl`
- [ ] 每条铁路卡片的 actions 包含 `book_rail` 操作及 `params.bookingUrl`
- [ ] 前端「预订」按钮可正常打开 Deutsche Bahn 页面
- [ ] 加入行程后，行程项可展示「预订」链接（需后端支持 `externalUrl` 存储与返回）
