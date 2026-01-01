# 路线模板 API 接口说明

## 现有接口（已对接）

### 1. 查询路线模板列表
**GET** `/route-directions/templates`

**查询参数**：
```typescript
{
  routeDirectionId?: number;
  durationDays?: number;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}
```

**响应**：
```typescript
{
  success: true;
  data: RouteTemplate[];
  error: null;
}
```

**用途**：工作台首页显示模板列表（如"冰岛南岸路线"、"City 48h"）

---

### 2. 获取路线模板详情
**GET** `/route-directions/templates/:id`

**响应**：
```typescript
{
  success: true;
  data: RouteTemplate;
  error: null;
}
```

**RouteTemplate 结构**：
```typescript
{
  id: number;
  uuid: string;
  routeDirectionId: number;
  durationDays: number;
  nameCN: string;
  nameEN?: string;
  dayPlans: DayPlan[];  // 每日计划骨架
  defaultPacePreference: 'RELAXED' | 'BALANCED' | 'CHALLENGE';
  metadata?: Record<string, any>;
  isActive: boolean;
  routeDirection?: {
    id: number;
    nameCN: string;
    nameEN?: string;
    countryCode?: string;
    tags?: string[];
  };
}
```

**用途**：点击"Preview"按钮查看模板详情

---

### 3. 更新路线模板
**PUT** `/route-directions/templates/:id`

**请求体**：
```typescript
{
  routeDirectionId?: number;
  durationDays?: number;
  nameCN?: string;
  nameEN?: string;
  dayPlans?: DayPlan[];
  defaultPacePreference?: PacePreferenceEnum;
  metadata?: Record<string, any>;
  isActive?: boolean;
}
```

**用途**：管理员编辑模板

---

## 缺失接口（需要实现）

### 4. 使用模板创建行程 ⚠️

**POST** `/route-directions/templates/:id/create-trip`

**功能**：从路线模板生成可执行行程（对应工作台的"使用模板"按钮）

#### 请求体

```typescript
{
  // 必选：行程基本信息
  destination: string;        // 国家代码，如 "IS", "JP"
  startDate: string;          // ISO 8601, 如 "2024-06-01"
  endDate: string;            // ISO 8601, 如 "2024-06-07"
  totalBudget?: number;       // 可选
  
  // 可选：用户偏好覆盖
  pacePreference?: 'RELAXED' | 'BALANCED' | 'CHALLENGE';  // 覆盖模板默认值
  intensity?: 'relaxed' | 'balanced' | 'intense';
  transport?: 'walk' | 'transit' | 'car';
  
  // 可选：约束条件
  travelers?: Array<{
    type: 'ADULT' | 'ELDERLY' | 'CHILD';
    mobilityTag: 'IRON_LEGS' | 'ACTIVE_SENIOR' | 'CITY_POTATO' | 'LIMITED';
  }>;
  
  constraints?: {
    withChildren?: boolean;
    withElderly?: boolean;
    earlyRiser?: boolean;
    dietaryRestrictions?: string[];
    avoidCategories?: string[];
  };
}
```

#### 响应体

```typescript
{
  success: true;
  data: {
    trip: {
      id: string;
      destination: string;
      startDate: string;
      endDate: string;
      totalBudget: number;
      status: 'PLANNING';
      pacingConfig?: PacingConfig;
      budgetConfig?: BudgetConfig;
    };
    
    // 生成的行程项（基于模板的 dayPlans + place 表）
    generatedItems: Array<{
      day: number;
      date: string;
      items: Array<{
        placeId: number;
        type: 'ACTIVITY' | 'MEAL_ANCHOR' | 'MEAL_FLOATING' | 'REST' | 'TRANSIT';
        startTime: string;
        endTime: string;
        note?: string;
        reason?: string;  // 为什么选这个地点
      }>;
    }>;
    
    // 生成统计
    stats: {
      totalDays: number;
      totalItems: number;
      placesMatched: number;  // 成功匹配到 place 表的数量
      placesMissing: number;   // 模板要求但未找到的地点数量
    };
    
    // 警告信息
    warnings?: string[];
  };
}
```

#### 业务逻辑要求

1. **读取模板**
   - 获取 `RouteTemplate` 详情
   - 读取 `dayPlans`（每日计划骨架）

2. **解析模板结构**
   - 每个 `DayPlan` 包含：
     - `day`: 第几天
     - `theme`: 主题（如"冰川探索"）
     - `maxIntensity`: 最大强度
     - `maxElevationM`: 最大海拔
     - `requiredNodes`: 必需节点 UUID（如住宿点）

3. **匹配地点（Deterministic）**
   - 根据模板的 `routeDirection.countryCode` 和 `dayPlans` 检索候选地点
   - 从 place 表匹配：
     ```sql
     SELECT * FROM place
     WHERE 
       City.country_code = :countryCode
       AND category IN matching_categories(theme)
       AND (lat, lng) IN region_bounds(dayPlan.regions)
       AND NOT temporarily_closed
     ORDER BY popularity DESC
     LIMIT 50;
     ```

4. **LLM 编排（只允许选择 placeId）**
   - 给 LLM：
     ```json
     {
       "template": {
         "dayPlans": [...],
         "defaultPacePreference": "BALANCED"
       },
       "userParams": { ... },
       "candidates": [
         { "id": 123, "nameCN": "...", "category": "...", ... }
       ]
     }
     ```
   - LLM 输出：每天每个时段选哪个 placeId（必须来自 candidates）

5. **创建行程**
   - 创建 Trip 记录
   - 创建 TripDay 记录
   - 批量创建 ItineraryItem 记录

6. **验证**
   - 所有 placeId 必须存在于 DB
   - 营业时间校验
   - 距离/交通时间校验

#### 错误处理

```typescript
{
  success: false;
  error: {
    code: 'TEMPLATE_NOT_FOUND' | 'INSUFFICIENT_PLACES' | 'VALIDATION_FAILED' | 'LLM_ERROR';
    message: string;
  };
}
```

#### 示例请求

```json
POST /route-directions/templates/1/create-trip
{
  "destination": "IS",
  "startDate": "2024-06-01",
  "endDate": "2024-06-07",
  "totalBudget": 50000,
  "pacePreference": "BALANCED",
  "travelers": [
    {
      "type": "ADULT",
      "mobilityTag": "ACTIVE_SENIOR"
    }
  ],
  "constraints": {
    "withElderly": true
  }
}
```

---

## 工作台集成建议

### 工作台首页显示模板

```typescript
// 1. 加载模板列表
const templates = await routeDirectionsApi.queryTemplates({
  isActive: true,
  limit: 10
});

// 2. 显示模板卡片
templates.map(template => (
  <TemplateCard
    name={template.nameCN}
    subtitle={template.defaultPacePreference === 'RELAXED' ? '稳健版' : '高密度'}
    duration={`${template.durationDays}天`}
    onPreview={() => navigate(`/route-directions/templates/${template.id}`)}
    onUseTemplate={() => handleUseTemplate(template.id)}
  />
));
```

### "使用模板"按钮处理

```typescript
const handleUseTemplate = async (templateId: number) => {
  // 1. 弹出对话框让用户填写行程基本信息
  const formData = await showCreateTripFromTemplateDialog();
  
  // 2. 调用创建接口
  const result = await routeDirectionsApi.createTripFromTemplate(templateId, {
    destination: formData.destination,
    startDate: formData.startDate,
    endDate: formData.endDate,
    totalBudget: formData.totalBudget,
    // ... 其他参数
  });
  
  // 3. 跳转到行程详情页
  navigate(`/dashboard/trips/${result.trip.id}`);
};
```

---

## 总结

| 接口 | 方法 | 路径 | 状态 |
|------|------|------|------|
| 查询模板列表 | GET | `/route-directions/templates` | ✅ 已对接 |
| 获取模板详情 | GET | `/route-directions/templates/:id` | ✅ 已对接 |
| 更新模板 | PUT | `/route-directions/templates/:id` | ✅ 已对接 |
| **使用模板创建行程** | **POST** | **`/route-directions/templates/:id/create-trip`** | ❌ **缺失，需要实现** |

---

## 相关文件

- 前端 API: `src/api/route-directions.ts`
- 类型定义: `src/types/places-routes.ts`
- 模板列表页: `src/pages/route-directions/templates.tsx`
- 模板详情页: `src/pages/route-directions/templates/[id].tsx`

