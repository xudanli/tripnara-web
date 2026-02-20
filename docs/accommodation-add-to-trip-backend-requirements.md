# 住宿推荐「加入行程」- 后端接口支持说明

**日期**: 2026-02-20  
**功能**: 用户从 NARA 住宿推荐卡片点击「加入行程」，将住宿添加为行程项  
**扩展**: 火车路线同样支持「加入行程」（type: TRANSIT, costCategory: TRANSPORTATION）

---

## 一、当前能力

### 1.1 已有接口

`POST /api/itinerary-items`（CreateItineraryItemRequest）支持：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| tripDayId | string | ✅ | 行程日 ID |
| type | ItineraryItemType | ✅ | ACTIVITY / REST / TRANSIT 等 |
| startTime | string | ✅ | ISO 8601 |
| endTime | string | ✅ | ISO 8601 |
| placeId | number | ❌ | 内部 places 表 ID |
| note | string | ❌ | 备注 |
| estimatedCost | number | ❌ | 预估费用 |
| costCategory | CostCategory | ❌ | ACCOMMODATION 等 |
| currency | string | ❌ | CNY / USD |

### 1.2 限制

- **placeId 为可选**：不传时创建「无地点」行程项
- **展示名称**：ItineraryItemRow 使用 `Place?.nameCN || Place?.nameEN || item.type`，无 Place 时显示 `item.type`（如 "ACTIVITY"），体验不佳

---

## 二、后端建议支持（可选但推荐）

### 2.1 方案 A：扩展 CreateItineraryItemRequest

新增可选字段，用于无 placeId 时的自定义展示：

```typescript
// CreateItineraryItemRequest 扩展
{
  // 现有字段...
  
  /** 自定义地点名称（无 placeId 时用于展示） */
  placeName?: string;
  /** 自定义地址（可选） */
  address?: string;
  /** 外部链接（预订页等） */
  externalUrl?: string;
  /** 元数据（如 source: 'hotel'|'airbnb', rating 等） */
  metadata?: Record<string, unknown>;
}
```

**后端处理**：
- 创建行程项时，若传入 `placeName` 且无 `placeId`，将 `placeName` 存为展示字段（如 `note` 首行或新增 `displayName` 字段）
- 返回的 ItineraryItem 需包含该展示名称，供前端渲染

### 2.2 方案 B：仅用 note（无需后端改动）

- 前端将 `placeName` 作为 note 首行：`note: "${name}\n地址: ${address}\n链接: ${url}"`
- 前端 ItineraryItemRow 在无 Place 时使用 `item.note?.split('\n')[0]` 作为展示名称
- 优点：零后端改动；缺点：依赖 note 格式

---

## 三、前端实现流程（方案 B）

1. 用户点击「加入行程」→ 选择入住日期 → 点击「确认添加」
2. **GET** `/api/itinerary-items?tripDayId=xxx&costCategory=ACCOMMODATION` 检查当天是否已有住宿
3. **若返回非空**：弹窗「当天已有住宿「{Place?.nameCN || Place?.nameEN || note首行}」，是否替换？」
   - 替换：**DELETE** `/api/itinerary-items/:id` → **POST** `/api/itinerary-items`
   - 取消：结束
4. **若返回空**：直接 **POST** `/api/itinerary-items`
5. 请求体：`type: 'ACTIVITY'`, `costCategory: 'ACCOMMODATION'`, `note` 包含名称、地址、链接
6. 前端 ItineraryItemRow 在无 Place 时用 `note` 首行作为名称

---

## 四、火车路线「加入行程」（已实现）

- 类型：`type: 'TRANSIT'`, `costCategory: 'TRANSPORTATION'`
- `placeName`: `{origin} → {destination}`（展示名称）
- `note`: `{line}，{origin} → {destination}\n票价: ...`
- `metadata`: `{ source: 'rail', isOvernightRail: boolean, lineName?: string }`
- 跨夜火车：`startTime`/`endTime` 可为不同日期，保留原始时区（如 +01:00）
- 无需替换确认（同一天可有多个交通段）

## 五、验收标准

- [ ] 住宿：用户点击「加入行程」可成功创建行程项
- [ ] 火车：用户点击「加入行程」可成功创建交通行程项
- [ ] 行程项在时间轴正确显示名称（note 首行）
- [ ] 费用、链接等信息正确保存
