# 行程详情页改版 - 后端接口需求文档

## 文档信息

- **创建日期**: 2026-02-05
- **版本**: v1.0
- **状态**: 待开发
- **优先级**: P0（高优先级）

---

## 一、接口需求概览

### 1.1 接口清单

| 序号 | 接口 | 方法 | 优先级 | 状态 | 预计工作量 |
|------|------|------|--------|------|-----------|
| 1 | 扩展健康度接口 | GET | P0 | 🆕 扩展 | 1-2天 |
| 2 | 获取指标详细说明 | GET | P0 | 🆕 新增 | 2-3天 |
| 3 | 获取改进建议 | GET | P0 | 🆕 新增/扩展 | 3-5天 |
| 4 | 应用改进建议 | POST | P0 | 🆕 新增 | 3-5天 |
| 5 | Auto 综合操作 | POST | P0 | 🆕 新增 | 5-7天 |
| 6 | 获取行程基本信息 | GET | P0 | 🆕 新增/扩展 | 1-2天 |
| 7 | 获取每日行程概览 | GET | P0 | 🆕 新增 | 2-3天 |

**总预计工作量**：16-25天（约3-5周）

---

## 二、接口详细定义

### 2.1 扩展健康度接口

**接口**: `GET /api/trip-detail/:tripId/health`

**当前状态**: ✅ 已存在，需要扩展

**扩展内容**：
- 添加 `overallScore`（整体健康度分数，0-100）
- 为每个指标维度添加：
  - `weight`（权重，0-1）
  - `definition`（指标定义，50字以内）
  - `calculation`（计算方法，简化版）
  - `idealRange`（理想范围）

**扩展后的返回结构**：
```typescript
{
  success: true,
  data: {
    tripId: string;
    overall: 'healthy' | 'warning' | 'critical';
    overallScore: number; // 🆕 新增
    dimensions: {
      schedule: {
        status: 'healthy' | 'warning' | 'critical';
        score: number;
        issues: string[];
        weight: number; // 🆕 新增
        definition: string; // 🆕 新增
        calculation: string; // 🆕 新增
        idealRange: { min: number; max: number; }; // 🆕 新增
      };
      budget: { /* 同上 */ };
      pace: { /* 同上 */ };
      feasibility: { /* 同上 */ };
    };
    lastUpdated: string;
  }
}
```

---

### 2.2 获取指标详细说明

**接口**: `GET /api/trip-detail/:tripId/metrics/:metricName/explanation`

**路径参数**：
- `tripId`: string
- `metricName`: 'schedule' | 'budget' | 'pace' | 'feasibility'

**返回结构**：
```typescript
{
  success: true,
  data: {
    metricName: string;
    displayName: string; // 如"时间灵活性"
    definition: string; // 完整定义（100-200字）
    calculation: {
      formula: string; // 计算公式
      parameters: Array<{
        name: string;
        description: string;
        value?: number;
      }>;
    };
    idealRange: {
      excellent: { min: number; max: number; }; // ≥ 80%
      good: { min: number; max: number; }; // 60-79%
      needsImprovement: { min: number; max: number; }; // < 60%
    };
    currentState: {
      score: number;
      level: 'excellent' | 'good' | 'needsImprovement';
      analysis: string; // 当前状态分析（50-100字）
    };
    weight: number;
    contribution: number; // score × weight
  }
}
```

**实现建议**：
- 指标定义可以存储在配置文件中（JSON/YAML）
- 计算方法可以硬编码或从配置读取
- 当前状态需要实时计算

---

### 2.3 获取改进建议

**接口**: `GET /api/trip-detail/:tripId/suggestions`

**查询参数**：
- `metricName?`: string（可选，过滤特定指标）
- `minScore?`: number（可选，默认70，只返回低于此分数的建议）

**返回结构**：
```typescript
{
  success: true,
  data: {
    suggestions: Array<{
      id: string;
      metricName: 'schedule' | 'budget' | 'pace' | 'feasibility';
      displayName: string; // 如"时间灵活性"
      currentScore: number;
      targetScore: number;
      problem: {
        description: string; // 50-100字
        impact: string[]; // 影响列表
      };
      recommendations: Array<{
        id: string;
        title: string; // 如"在Day 2增加1小时缓冲时间"
        description: string; // 50-100字
        expectedImpact: {
          metricChange: string; // 如"时间灵活性提升至75%"
          scoreChange: number; // 如+5
        };
        actionType: 'auto' | 'manual';
        actionData?: any; // auto类型时需要
      }>;
      priority: 'high' | 'medium' | 'low';
    }>;
    summary: {
      total: number;
      highPriority: number;
    };
  }
}
```

**实现建议**：
- 可以复用现有的 `TripSuggestionsService`
- 需要添加指标相关的建议生成逻辑
- 建议可以基于健康度分析结果生成

---

### 2.4 应用改进建议

**接口**: `POST /api/trip-detail/:tripId/suggestions/:suggestionId/apply`

**路径参数**：
- `tripId`: string
- `suggestionId`: string

**请求体**：
```typescript
{
  recommendationId: string; // 要应用的具体建议ID
  confirm: boolean; // 必须为true
}
```

**返回结构**：
```typescript
{
  success: true,
  data: {
    suggestionId: string;
    recommendationId: string;
    applied: boolean;
    changes: {
      metricName: string;
      scoreBefore: number;
      scoreAfter: number;
      scoreChange: number;
    };
    message: string; // 如"时间灵活性已提升至75%"
    redirectTo?: string; // manual类型时跳转到规划工作台
  }
}
```

**实现建议**：
- 使用事务确保操作的原子性
- 对于auto类型，直接应用更改
- 对于manual类型，返回跳转链接

---

### 2.5 Auto 综合操作

**接口**: `POST /api/trip-detail/:tripId/optimize`

**路径参数**：
- `tripId`: string

**请求体**：
```typescript
{
  confirm: boolean; // 必须为true
  optimizeDimensions?: string[]; // 可选，如['schedule', 'pace']
}
```

**返回结构**：
```typescript
{
  success: true,
  data: {
    tripId: string;
    optimized: boolean;
    changes: {
      dimensions: Array<{
        metricName: string;
        scoreBefore: number;
        scoreAfter: number;
        scoreChange: number;
      }>;
      overallScoreBefore: number;
      overallScoreAfter: number;
      overallScoreChange: number;
    };
    message: string;
    suggestions?: Array<{
      id: string;
      description: string;
      applied: boolean;
    }>;
  }
}
```

**实现建议**：
- 调用现有的优化服务
- 自动应用多个改进建议
- 使用事务确保操作的原子性

---

### 2.6 获取行程基本信息

**接口**: `GET /api/trips/:tripId` 或 `GET /api/trip-detail/:tripId/basic`

**返回结构**：
```typescript
{
  success: true,
  data: {
    tripId: string;
    name: string; // 如"内陆高地F路 - 5天行程"
    status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    destination: {
      code: string; // 如"IS"
      name: string; // 如"冰岛"
    };
    dates: {
      start: string; // ISO 8601
      end: string; // ISO 8601
    };
    pacing: {
      type: 'standard' | 'relaxed' | 'intensive';
      displayName: string; // 如"标准节奏"
    };
    transportation: {
      type: 'self-drive' | 'public-transport' | 'tour';
      displayName: string; // 如"自驾"
    };
    weather?: {
      temperature: number;
      condition: string;
      icon?: string;
    };
    riskLevel?: 'low' | 'medium' | 'high';
  }
}
```

**实现建议**：
- 如果现有 `GET /api/trips/:tripId` 已包含这些信息，可以复用
- 否则需要新建接口或扩展现有接口

---

### 2.7 获取每日行程概览

**接口**: `GET /api/trip-detail/:tripId/days`

**返回结构**：
```typescript
{
  success: true,
  data: {
    days: Array<{
      dayNumber: number; // 1, 2, 3...
      date: string; // ISO 8601
      route: {
        from: string; // 如"南岸"
        to: string; // 如"Landmannalaugar"
        description?: string; // 如"彩色火山地"
      };
      itineraryItems: {
        total: number;
        count: number; // 当前显示的行程项数
      };
      budget: {
        allocated: number;
        total: number;
        currency: string; // 如"¥"
      };
      health?: {
        score: number; // 0-100
        status: 'healthy' | 'warning' | 'critical';
      };
    }>;
  }
}
```

**实现建议**：
- 需要查询行程的每日数据
- 计算每日健康度（可选）
- 聚合每日预算信息

---

## 三、数据结构定义

### 3.1 TypeScript类型定义

**文件位置**：`src/api/trip-detail.ts`（需要扩展）

需要扩展或新增的类型定义：

```typescript
// 扩展 Health 接口
export interface Health {
  tripId: string;
  overall: HealthStatus;
  overallScore: number; // 🆕 新增
  dimensions: {
    schedule: DimensionStatusExtended;
    budget: DimensionStatusExtended;
    pace: DimensionStatusExtended;
    feasibility: DimensionStatusExtended;
  };
  lastUpdated: string;
}

export interface DimensionStatusExtended extends DimensionStatus {
  weight: number;
  definition: string;
  calculation: string;
  idealRange: { min: number; max: number; };
}

// 新增：指标详细说明
export interface MetricExplanation {
  metricName: string;
  displayName: string;
  definition: string;
  calculation: {
    formula: string;
    parameters: Array<{
      name: string;
      description: string;
      value?: number;
    }>;
  };
  idealRange: {
    excellent: { min: number; max: number; };
    good: { min: number; max: number; };
    needsImprovement: { min: number; max: number; };
  };
  currentState: {
    score: number;
    level: 'excellent' | 'good' | 'needsImprovement';
    analysis: string;
  };
  weight: number;
  contribution: number;
}

// 新增：改进建议
export interface TripSuggestion {
  id: string;
  metricName: 'schedule' | 'budget' | 'pace' | 'feasibility';
  displayName: string;
  currentScore: number;
  targetScore: number;
  problem: {
    description: string;
    impact: string[];
  };
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    expectedImpact: {
      metricChange: string;
      scoreChange: number;
    };
    actionType: 'auto' | 'manual';
    actionData?: any;
  }>;
  priority: 'high' | 'medium' | 'low';
}

export interface TripSuggestionsResponse {
  suggestions: TripSuggestion[];
  summary: {
    total: number;
    highPriority: number;
  };
}

// 新增：应用建议响应
export interface ApplySuggestionResponse {
  suggestionId: string;
  recommendationId: string;
  applied: boolean;
  changes: {
    metricName: string;
    scoreBefore: number;
    scoreAfter: number;
    scoreChange: number;
  };
  message: string;
  redirectTo?: string;
}

// 新增：优化响应
export interface OptimizeTripResponse {
  tripId: string;
  optimized: boolean;
  changes: {
    dimensions: Array<{
      metricName: string;
      scoreBefore: number;
      scoreAfter: number;
      scoreChange: number;
    }>;
    overallScoreBefore: number;
    overallScoreAfter: number;
    overallScoreChange: number;
  };
  message: string;
  suggestions?: Array<{
    id: string;
    description: string;
    applied: boolean;
  }>;
}

// 新增：行程基本信息
export interface TripBasicInfo {
  tripId: string;
  name: string;
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  destination: {
    code: string;
    name: string;
  };
  dates: {
    start: string;
    end: string;
  };
  pacing: {
    type: 'standard' | 'relaxed' | 'intensive';
    displayName: string;
  };
  transportation: {
    type: 'self-drive' | 'public-transport' | 'tour';
    displayName: string;
  };
  weather?: {
    temperature: number;
    condition: string;
    icon?: string;
  };
  riskLevel?: 'low' | 'medium' | 'high';
}

// 新增：每日行程概览
export interface DayOverview {
  dayNumber: number;
  date: string;
  route: {
    from: string;
    to: string;
    description?: string;
  };
  itineraryItems: {
    total: number;
    count: number;
  };
  budget: {
    allocated: number;
    total: number;
    currency: string;
  };
  health?: {
    score: number;
    status: 'healthy' | 'warning' | 'critical';
  };
}

export interface DaysOverviewResponse {
  days: DayOverview[];
}
```

---

## 四、前端对接准备

### 4.1 当前状态

**已存在的接口**：
- ✅ `GET /api/trip-detail/:tripId/health` - 已实现，需要扩展类型定义
- ✅ `GET /api/trips/:tripId` - 已存在，可能需要扩展

**需要新增的接口**：
- ⚠️ `GET /api/trip-detail/:tripId/metrics/:metricName/explanation`
- ⚠️ `GET /api/trip-detail/:tripId/suggestions`
- ⚠️ `POST /api/trip-detail/:tripId/suggestions/:suggestionId/apply`
- ⚠️ `POST /api/trip-detail/:tripId/optimize`
- ⚠️ `GET /api/trip-detail/:tripId/basic`（如果现有接口不满足）
- ⚠️ `GET /api/trip-detail/:tripId/days`

### 4.2 前端类型定义更新

**文件**: `src/api/trip-detail.ts`

需要：
1. 扩展 `Health` 接口
2. 新增 `MetricExplanation` 接口
3. 新增 `TripSuggestion` 和相关接口
4. 新增 `TripBasicInfo` 接口
5. 新增 `DayOverview` 接口

### 4.3 前端 API 方法实现

需要在 `tripDetailApi` 中添加：

```typescript
export const tripDetailApi = {
  // ... 现有方法
  
  /**
   * 获取指标详细说明
   * GET /api/trip-detail/:tripId/metrics/:metricName/explanation
   */
  getMetricExplanation: async (
    tripId: string,
    metricName: 'schedule' | 'budget' | 'pace' | 'feasibility'
  ): Promise<MetricExplanation> => {
    // 实现
  },
  
  /**
   * 获取改进建议
   * GET /api/trip-detail/:tripId/suggestions
   */
  getSuggestions: async (
    tripId: string,
    params?: {
      metricName?: string;
      minScore?: number;
    }
  ): Promise<TripSuggestionsResponse> => {
    // 实现
  },
  
  /**
   * 应用改进建议
   * POST /api/trip-detail/:tripId/suggestions/:suggestionId/apply
   */
  applySuggestion: async (
    tripId: string,
    suggestionId: string,
    data: {
      recommendationId: string;
      confirm: boolean;
    }
  ): Promise<ApplySuggestionResponse> => {
    // 实现
  },
  
  /**
   * Auto 综合操作
   * POST /api/trip-detail/:tripId/optimize
   */
  optimize: async (
    tripId: string,
    data: {
      confirm: boolean;
      optimizeDimensions?: string[];
    }
  ): Promise<OptimizeTripResponse> => {
    // 实现
  },
  
  /**
   * 获取行程基本信息
   * GET /api/trip-detail/:tripId/basic
   */
  getBasicInfo: async (tripId: string): Promise<TripBasicInfo> => {
    // 实现
  },
  
  /**
   * 获取每日行程概览
   * GET /api/trip-detail/:tripId/days
   */
  getDaysOverview: async (tripId: string): Promise<DaysOverviewResponse> => {
    // 实现
  },
};
```

---

## 五、实现优先级

### 5.1 第一阶段（1周）

1. 扩展健康度接口
2. 获取行程基本信息接口
3. 获取每日行程概览接口

**目标**：支持页面基本展示

### 5.2 第二阶段（2周）

1. 获取指标详细说明接口
2. 获取改进建议接口
3. 应用改进建议接口

**目标**：支持指标说明和改进建议功能

### 5.3 第三阶段（1-2周）

1. Auto 综合操作接口

**目标**：支持自动优化功能

---

## 六、技术实现建议

### 6.1 数据存储

- **指标定义**：配置文件（JSON/YAML）
- **改进建议**：数据库（复用现有建议系统）
- **健康度计算**：实时计算

### 6.2 性能优化

- **缓存**：健康度数据可以缓存（5-10分钟）
- **批量查询**：每日行程概览可以批量查询
- **异步处理**：Auto综合操作可以异步处理

### 6.3 错误处理

- **统一错误格式**：
```typescript
{
  success: false,
  error: {
    code: string;
    message: string;
    details?: any;
  }
}
```

---

## 七、验收标准

### 7.1 功能验收

- ✅ 所有P0接口已实现
- ✅ 接口返回数据结构符合规范
- ✅ 接口错误处理正确
- ✅ 接口性能达标（响应时间 < 500ms）

### 7.2 代码验收

- ✅ 代码符合项目规范
- ✅ 有适当的单元测试
- ✅ 有API文档（Swagger）

---

## 八、前端对接检查清单

### 8.1 类型定义

- [ ] 扩展 `Health` 接口
- [ ] 新增 `MetricExplanation` 接口
- [ ] 新增 `TripSuggestion` 和相关接口
- [ ] 新增 `TripBasicInfo` 接口
- [ ] 新增 `DayOverview` 接口

### 8.2 API 方法

- [ ] 扩展 `getHealth` 方法（处理新字段）
- [ ] 新增 `getMetricExplanation` 方法
- [ ] 新增 `getSuggestions` 方法
- [ ] 新增 `applySuggestion` 方法
- [ ] 新增 `optimize` 方法
- [ ] 新增 `getBasicInfo` 方法
- [ ] 新增 `getDaysOverview` 方法

### 8.3 错误处理

- [ ] 所有新接口都有错误处理
- [ ] 错误消息用户友好
- [ ] 网络错误有重试机制（可选）

### 8.4 用户反馈

- [ ] 所有操作都有 Toast 提示
- [ ] Loading 状态正确显示
- [ ] 错误情况有明确提示

---

## 九、联系方式

- **产品经理**: Danny
- **接口问题**: Slack #backend-channel
- **设计问题**: Slack #design-channel
- **前端对接**: Slack #frontend-channel

---

**文档状态**: ✅ 已完成  
**下一步**: 
1. 后端工程师确认接口实现方案和排期
2. 前端工程师准备类型定义和 API 方法（待后端接口就绪后对接）
