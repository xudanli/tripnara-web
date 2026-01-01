# 智能行程生成 API - 快速参考

## 接口列表

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 生成草案 | POST | `/trips/draft` | 生成可预览的行程草案（不落库） |
| 保存行程 | POST | `/trips` | 将草案保存为正式行程 |
| 替换单项 | POST | `/trips/:tripId/items/:itemId/replace` | Neptune修复：替换单个行程项 |
| 重生成 | POST | `/trips/:tripId/regenerate` | 全局重生成，保持锁定项 |

---

## 1. POST /trips/draft

**核心流程**：
1. 从 place 表检索候选（50-200个）
2. LLM 从候选中选择并编排到时段
3. 规则校验（营业时间、距离等）
4. 返回草案

**关键约束**：
- ✅ LLM 只能从 candidates 列表选择 placeId
- ✅ 所有 placeId 必须存在于 DB
- ✅ 缺失 openingHours 的 place 不进入核心候选

**时段定义**：
- Morning: 9:00-12:00
- Lunch: 12:00-13:30
- Afternoon: 13:30-17:30
- Dinner: 18:00-20:00
- Evening: 可选

---

## 2. POST /trips (保存草案)

**请求体**：
```json
{
  "draft": { ... },  // 来自 /trips/draft 的响应
  "userEdits": {
    "lockedItemIds": ["item-1", "item-2"]
  }
}
```

**业务逻辑**：
1. 创建 Trip
2. 创建 TripDay（每天一条）
3. 批量创建 ItineraryItem（从 draft.draftDays 转换）

---

## 3. POST /trips/:tripId/items/:itemId/replace

**替换原因映射**：
- `too_tired` → 找更轻松的地点
- `weather_change` → 找室内地点
- `change_style` → 根据 preferredStyle 重新检索
- `too_far` → 找更近的地点
- `closed` → 找同类型替代

**返回**：新 item + 备选方案（top 3-5）

---

## 4. POST /trips/:tripId/regenerate

**关键点**：
- `lockedItemIds` 对应的 item 保持不变
- 对未锁定的 item 重新生成
- **不自动保存**，返回 updatedDraft 让用户确认

---

## Place 表必需字段

```sql
id, name_cn, name_en, category, latitude, longitude, address, rating
metadata JSONB  -- { openingHours: {...}, ... }
physical_metadata JSONB  -- { estimated_duration_min: 120, ... }
tags TEXT[]  -- ['photography', 'citywalk']
popularity, source, confidence, temporarily_closed
```

---

## 错误码

- `INSUFFICIENT_CANDIDATES` - 候选不足
- `VALIDATION_FAILED` - 校验失败
- `LLM_ERROR` - LLM 调用失败
- `PLACE_NOT_FOUND` - placeId 不存在

---

## MVP 测试场景

1. 城市内 2-3 天游（destination: "JP", days: 3）
2. 数据不足降级（候选 < 20 个）
3. 替换测试（验证新 item 有 placeId）

---

详细文档请参考：`API-智能行程生成接口规范.md`

