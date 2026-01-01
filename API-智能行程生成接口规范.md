# 智能行程生成 API 接口规范

## 概述

本文档定义了智能行程生成系统所需的后端API接口。核心原则是：**LLM只负责"选择与编排"，不负责"发明地点"**。

所有行程项必须来自 `place` 表，确保可执行性和防幻觉。

---

## 1. 生成行程草案

### `POST /trips/draft`

生成一个可预览的行程草案（不落库）。

#### 请求体

```typescript
{
  // 必选参数
  destination: string;        // 国家代码，如 "JP", "IS"
  days: number;                // 1-14 天
  
  // 可选参数
  style?: 'nature' | 'culture' | 'food' | 'citywalk' | 'photography' | 'adventure';
  intensity?: 'relaxed' | 'balanced' | 'intense';
  transport?: 'walk' | 'transit' | 'car';
  accommodationBase?: 'fixed' | 'moving';
  hikingLevel?: 'none' | 'light' | 'hiking-heavy';
  
  // 约束条件
  constraints?: {
    withChildren?: boolean;
    withElderly?: boolean;
    earlyRiser?: boolean;
    dietaryRestrictions?: string[];
    avoidCategories?: string[];  // 如: ['museum']
  };
  
  // 日期范围（可选，用于生成具体日期）
  startDate?: string;  // ISO 8601, 如 "2024-06-01"
  endDate?: string;    // ISO 8601
}
```

#### 响应体

```typescript
{
  success: true;
  data: {
    destination: string;
    days: number;
    startDate?: string;  // YYYY-MM-DD
    endDate?: string;    // YYYY-MM-DD
    
    draftDays: Array<{
      day: number;        // 1, 2, 3...
      date: string;       // YYYY-MM-DD
      slots: {
        morning?: DraftItineraryItem;      // 9:00-12:00
        lunch?: DraftItineraryItem;        // 12:00-13:30
        afternoon?: DraftItineraryItem;    // 13:30-17:30
        dinner?: DraftItineraryItem;       // 18:00-20:00
        evening?: DraftItineraryItem;      // 可选
      };
    }>;
    
    candidatesCount: number;  // 候选地点总数
    validationWarnings?: string[];  // 校验警告
    
    metadata?: {
      generationTime?: number;  // 毫秒
      llmProvider?: string;
    };
  };
}
```

#### DraftItineraryItem 结构

```typescript
{
  placeId: number;           // 必须来自 place 表
  slot: 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening';
  startTime: string;         // ISO 8601
  endTime: string;           // ISO 8601
  reason: string;            // 为什么选这个地点（短句，给UI用）
  alternatives?: number[];   // 备选 placeId 列表
  evidence?: {
    openingHours?: string;   // 如 "09:00-18:00"
    distance?: number;       // 米
    rating?: number;
    source?: string;         // 数据来源
  };
}
```

#### 业务逻辑要求

1. **Step 0: 固定时段骨架**
   - 每天固定时段：
     - Morning: 9:00-12:00
     - Lunch: 12:00-13:30
     - Afternoon: 13:30-17:30
     - Dinner: 18:00-20:00
     - Evening: 可选

2. **Step 1: 候选集检索（Deterministic）**
   ```sql
   -- 伪代码示例
   SELECT * FROM place
   WHERE 
     -- 地理范围（目的地 bounding box / radius）
     (lat, lng) IN bounding_box(destination)
     AND
     -- 类别配比（根据 style）
     category IN matching_categories(style)
     AND
     -- 硬约束过滤
     NOT temporarily_closed
     AND confidence >= 0.7
   ORDER BY popularity DESC, rating DESC
   LIMIT 200;
   ```
   
   - 地理范围：根据 destination 获取城市/区域的 bounding box
   - 类别配比：根据 style 匹配（如 culture → museum, temple; food → restaurant）
   - 强度过滤：如果 hikingLevel !== 'none'，考虑 distance/elevation
   - 输出：50-200 个候选地点

3. **Step 2: LLM 编排选择（只允许输出 placeId）**
   - 给 LLM 的输入：
     ```json
     {
       "userParams": { ...formData },
       "daySlots": [
         { "day": 1, "slots": ["morning", "lunch", "afternoon", "dinner"] },
         ...
       ],
       "candidates": [
         {
           "id": 123,
           "nameCN": "东京塔",
           "type": "ATTRACTION",
           "category": "landmark",
           "lat": 35.6586,
           "lng": 139.7454,
           "openingHours": { "monday": "09:00-22:00" },
           "avgVisitDuration": 120,
           "tags": ["photography", "citywalk"],
           "popularity": 8.5,
           "rating": 4.5
         },
         ...
       ]
     }
     ```
   
   - LLM 输出（结构化 JSON）：
     ```json
     {
       "days": [
         {
           "day": 1,
           "slots": {
             "morning": {
               "placeId": 123,
               "reason": "上午适合登塔观景，避开人流高峰",
               "alternatives": [124, 125]
             },
             "lunch": {
               "placeId": 456,
               "reason": "附近知名日料，评分4.8",
               "alternatives": [457]
             },
             ...
           }
         }
       ]
     }
     ```
   
   - **硬约束**：LLM 只能从 candidates 列表中选择 placeId，不能编造

4. **Step 3: 规则校验（Hard/Soft）**
   
   **Hard 校验（必须通过）**：
   - ✅ 营业时间是否覆盖 slot
   - ✅ placeId 必须存在于 DB
   - ✅ 交通时间是否可达（粗略，用直线距离近似）
   
   **Soft 校验（警告）**：
   - ⚠️ 同类项是否过密（如博物馆连刷）
   - ⚠️ 强度是否超标（每天总步行/总时长）
   - ⚠️ 餐饮 slot 是否真的选了 food 类
   
   - 不通过 → 进入 Neptune 修复：最小改动替换（换 1-2 个 placeId）

5. **Step 4: 构建响应**
   - 为每个 item 填充 evidence（从 place 表查询）
   - 计算 startTime/endTime（基于 slot 和 avgVisitDuration）
   - 生成 validationWarnings

#### 错误处理

```typescript
{
  success: false;
  error: {
    code: 'INSUFFICIENT_CANDIDATES' | 'VALIDATION_FAILED' | 'LLM_ERROR';
    message: string;
  };
}
```

---

## 2. 保存草案为行程

### `POST /trips`

将草案保存为正式行程（创建 trip + 批量插入 itinerary_items）。

#### 请求体

```typescript
{
  draft: TripDraftResponse;  // 来自 /trips/draft 的响应
  
  userEdits?: {
    lockedItemIds?: string[];  // 已锁定的 itemId（如果有，在重生成时保持）
    removedItems?: string[];   // 移除的 item
    addedItems?: DraftItineraryItem[];  // 新增的 item
  };
}
```

#### 响应体

```typescript
{
  success: true;
  data: {
    id: string;
    destination: string;
    startDate: string;
    endDate: string;
    totalBudget: number;
    status: 'PLANNING';
    pacingConfig?: PacingConfig;
    budgetConfig?: BudgetConfig;
  };
}
```

#### 业务逻辑要求

1. 创建 Trip 记录
2. 创建 TripDay 记录（每天一条）
3. 批量创建 ItineraryItem 记录：
   ```sql
   INSERT INTO itinerary_item (
     trip_day_id,
     place_id,
     type,  -- 'ACTIVITY' | 'MEAL_ANCHOR' | 'MEAL_FLOATING' | 'REST' | 'TRANSIT'
     start_time,
     end_time,
     note  -- 存储 reason
   ) VALUES ...
   ```
   
   - 根据 slot 确定 type：
     - morning/afternoon → 'ACTIVITY'
     - lunch/dinner → 'MEAL_ANCHOR' 或 'MEAL_FLOATING'（根据 place.category）
     - evening → 'ACTIVITY' 或 'REST'

4. 验证所有 placeId 存在

---

## 3. 替换单个行程项

### `POST /trips/:tripId/items/:itemId/replace`

Neptune 修复机制：替换单个行程项。

#### 请求体

```typescript
{
  reason: 'too_tired' | 'weather_change' | 'change_style' | 'too_far' | 'closed' | 'other';
  
  preferredStyle?: 'nature' | 'culture' | 'food' | 'citywalk' | 'photography' | 'adventure';
  
  constraints?: {
    maxDistance?: number;  // 米
    mustBeOpen?: boolean;
    avoidCategories?: string[];
  };
}
```

#### 响应体

```typescript
{
  success: true;
  data: {
    newItem: DraftItineraryItem;
    
    alternatives: Array<{
      placeId: number;
      placeName: string;
      reason: string;
      score: number;  // 0-10
    }>;
    
    replacedItem: {
      placeId: number;
      reason: string;
    };
  };
}
```

#### 业务逻辑要求

1. 获取当前 item 信息（slot, day, 当前位置）
2. 根据 reason 调整检索策略：
   - `too_tired` → 找更轻松的地点（REST 类或 duration 短的）
   - `weather_change` → 找室内地点
   - `change_style` → 根据 preferredStyle 重新检索
   - `too_far` → 找更近的地点（maxDistance 约束）
   - `closed` → 排除已关闭的，找同类型替代
3. 从 place 表检索候选（50-100 个）
4. LLM 选择最佳替换（只允许从候选中选择）
5. 规则校验（营业时间、距离等）
6. 返回新 item + 备选方案（top 3-5）

---

## 4. 全局重生成行程

### `POST /trips/:tripId/regenerate`

重生成整个行程，但保持用户已锁定的项。

#### 请求体

```typescript
{
  lockedItemIds?: string[];  // 保持不变的 itemId
  
  newPreferences?: {
    style?: TravelStyle;
    intensity?: IntensityLevel;
    transport?: TransportMode;
    constraints?: {
      withChildren?: boolean;
      withElderly?: boolean;
      earlyRiser?: boolean;
      dietaryRestrictions?: string[];
      avoidCategories?: string[];
    };
  };
}
```

#### 响应体

```typescript
{
  success: true;
  data: {
    updatedDraft: TripDraftResponse;
    
    changes: Array<{
      type: 'added' | 'removed' | 'replaced' | 'moved';
      itemId?: string;
      placeId: number;
      placeName: string;
      day: number;
      slot: TimeSlot;
      reason: string;
    }>;
  };
}
```

#### 业务逻辑要求

1. 获取当前 trip 信息
2. 标记 lockedItemIds 对应的 item，在生成时保持不变
3. 对未锁定的 item，重新执行生成流程（Step 1-3）
4. 对比新旧行程，生成 changes 列表
5. **不自动保存**，返回 updatedDraft 让用户确认

---

## 数据要求

### Place 表必需字段

```sql
CREATE TABLE place (
  id SERIAL PRIMARY KEY,
  name_cn VARCHAR(255),
  name_en VARCHAR(255),
  category VARCHAR(50),  -- 'ATTRACTION' | 'RESTAURANT' | 'SHOPPING' | 'HOTEL' | 'TRANSIT_HUB'
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  address TEXT,
  rating DECIMAL(3, 2),
  
  -- 元数据（JSON）
  metadata JSONB,  -- { openingHours: {...}, ticketPrice: "...", description: "..." }
  
  -- 物理元数据（JSON）
  physical_metadata JSONB,  -- { estimated_duration_min: 120, intensity_factor: 0.5, walking_distance_m: 500 }
  
  -- 标签（用于风格匹配）
  tags TEXT[],  -- ['photography', 'citywalk', 'nature']
  
  -- 数据质量
  popularity DECIMAL(3, 1),  -- 0-10
  source VARCHAR(50),        -- 数据来源
  confidence DECIMAL(3, 2),  -- 0-1
  temporarily_closed BOOLEAN DEFAULT FALSE,
  
  city_id INTEGER REFERENCES city(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### 关键字段说明

- **openingHours**: `metadata.openingHours` 格式：
  ```json
  {
    "monday": "09:00-18:00",
    "tuesday": "09:00-18:00",
    "wednesday": "09:00-18:00",
    ...
  }
  ```
  
- **avgVisitDuration**: `physical_metadata.estimated_duration_min`（分钟）

- **tags**: 用于风格匹配，如 `['photography', 'citywalk']` 匹配 `style: 'photography'`

---

## 错误码

| 错误码 | 说明 |
|--------|------|
| `INSUFFICIENT_CANDIDATES` | 候选地点不足（< 20个） |
| `VALIDATION_FAILED` | 规则校验失败 |
| `LLM_ERROR` | LLM 调用失败 |
| `PLACE_NOT_FOUND` | placeId 不存在 |
| `INVALID_SLOT` | 时段无效 |
| `LOCKED_ITEM_CONFLICT` | 锁定的 item 与新生成冲突 |

---

## 性能要求

- `/trips/draft`: 响应时间 < 10秒（LLM 调用）
- `/trips/:tripId/items/:itemId/replace`: 响应时间 < 5秒
- `/trips/:tripId/regenerate`: 响应时间 < 15秒

---

## 测试建议

### MVP 测试场景

1. **城市内 2-3 天游**
   - destination: "JP" (东京)
   - days: 3
   - style: "culture"
   - 验证：每天 3 个 slot（morning/afternoon/dinner），每个都有 placeId

2. **数据不足降级**
   - 候选 < 20 个时，返回半自动行程（只填核心点 + 推荐池）

3. **替换测试**
   - 替换一个 item，验证新 item 有 placeId 和 evidence

---

## 注意事项

1. **防幻觉**：
   - 所有 placeId 必须存在于 DB
   - LLM 输出必须经过 placeId 验证
   - 缺失 openingHours 的 place 不进入核心候选

2. **降级策略**：
   - 如果候选不足/数据缺：改成"半自动行程"
   - 只填每天 1-2 个最确定的核心点 + 推荐池（让用户补）

3. **交通时间**：
   - MVP 用直线距离近似（别一上来做真实公交）
   - 公式：`distance_km / speed_kmh * 60` 分钟
   - walk: 5 km/h, transit: 30 km/h, car: 50 km/h

4. **时段分配**：
   - 每个 slot 只填一个 itinerary_item
   - 更稳定、更像执行计划

---

## 示例请求/响应

### 示例 1: 生成草案

**请求**:
```json
POST /trips/draft
{
  "destination": "JP",
  "days": 3,
  "style": "culture",
  "intensity": "balanced",
  "transport": "walk",
  "accommodationBase": "fixed",
  "hikingLevel": "none",
  "constraints": {
    "withElderly": true
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "destination": "JP",
    "days": 3,
    "startDate": "2024-06-01",
    "endDate": "2024-06-03",
    "draftDays": [
      {
        "day": 1,
        "date": "2024-06-01",
        "slots": {
          "morning": {
            "placeId": 123,
            "slot": "morning",
            "startTime": "2024-06-01T09:00:00Z",
            "endTime": "2024-06-01T12:00:00Z",
            "reason": "上午适合参观，避开人流高峰",
            "alternatives": [124, 125],
            "evidence": {
              "openingHours": "09:00-18:00",
              "rating": 4.5,
              "source": "google_places"
            }
          },
          "afternoon": { ... },
          "dinner": { ... }
        }
      },
      { "day": 2, ... },
      { "day": 3, ... }
    ],
    "candidatesCount": 156,
    "validationWarnings": []
  }
}
```

---

## 总结

这四个接口构成了完整的智能行程生成系统：

1. **生成草案** - 核心生成逻辑
2. **保存行程** - 落库
3. **替换单项** - Neptune 修复
4. **重生成** - 全局调整

所有接口都遵循"LLM 只选择，不发明"的原则，确保可执行性和防幻觉。

