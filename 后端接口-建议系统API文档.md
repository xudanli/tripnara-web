# 后端接口文档：建议系统（Suggestion System）API

## 概述

本文档描述了前端所需的后端API接口，用于实现统一的建议/洞察系统。该系统将三人格（Abu/Dr.Dre/Neptune）的输出统一为标准化的建议格式，支持角标显示、过滤、应用等功能。

---

## 基础信息

- **Base URL**: `/trips/:id/suggestions`
- **认证**: 需要用户认证（Bearer Token）
- **数据格式**: JSON
- **响应格式**: 统一使用 `{ success: true, data: T }` 或 `{ success: false, error: { code: string, message: string } }`

---

## 数据结构

### Suggestion（建议）

```typescript
interface Suggestion {
  id: string;                    // 建议唯一ID
  persona: 'abu' | 'drdre' | 'neptune';  // 来源人格
  scope: 'trip' | 'day' | 'item' | 'segment';  // 作用范围
  scopeId?: string;              // 作用范围ID（如dayId、itemId等）
  
  severity: 'info' | 'warn' | 'blocker';  // 严重级别
  status: 'new' | 'seen' | 'applied' | 'dismissed';  // 状态
  
  title: string;                 // 标题
  summary: string;               // 摘要（一句话）
  description?: string;          // 详细描述
  
  evidence?: EvidenceLink[];     // 证据链（Abu必须有）
  
  actions: SuggestionAction[];   // 可执行的操作列表
  
  createdAt: string;             // 创建时间（ISO 8601）
  updatedAt?: string;            // 更新时间（ISO 8601）
  
  refreshPolicy?: {              // 刷新策略
    triggers: string[];          // 触发重新计算的事件列表
  };
  
  metadata?: {                   // 元数据（人格特定信息）
    // Abu相关
    riskLevel?: 'high' | 'medium' | 'low';
    riskType?: string;
    affectedSegment?: string;
    
    // Dr.Dre相关
    metricType?: 'fatigue' | 'buffer' | 'time' | 'cost';
    threshold?: number;
    currentValue?: number;
    adjustmentOptions?: {
      type: 'insert_rest_day' | 'shorten_duration' | 'change_transport' | 'adjust_weight';
      params?: Record<string, any>;
    };
    
    // Neptune相关
    repairType?: 'replace' | 'reschedule' | 'remove' | 'add';
    alternatives?: Array<{
      id: string;
      name: string;
      impact: {
        timeChange?: number;
        distanceChange?: number;
        costChange?: number;
      };
    }>;
    
    [key: string]: any;
  };
}

interface EvidenceLink {
  id: string;
  type: 'opening_hours' | 'road_closure' | 'weather' | 'booking' | 'other';
  title: string;
  description?: string;
  link?: string;
  source?: string;
  timestamp?: string;
}

interface SuggestionAction {
  id: string;
  label: string;
  type: 'apply' | 'preview' | 'dismiss' | 'snooze' | 'view_evidence' | 'adjust_rhythm' | 'view_alternatives';
  primary?: boolean;
  icon?: string;
}
```

### SuggestionStats（建议统计）

```typescript
interface SuggestionStats {
  tripId: string;
  byPersona: {
    abu: {
      total: number;
      bySeverity: {
        blocker: number;
        warn: number;
        info: number;
      };
    };
    drdre: {
      total: number;
      bySeverity: {
        blocker: number;
        warn: number;
        info: number;
      };
    };
    neptune: {
      total: number;
      bySeverity: {
        blocker: number;
        warn: number;
        info: number;
      };
    };
  };
  byScope: {
    trip: number;
    day: Record<string, number>;     // dayId -> count
    item: Record<string, number>;    // itemId -> count
  };
}
```

---

## API接口列表

### 1. 获取建议列表

**接口**: `GET /trips/:id/suggestions`

**描述**: 获取指定行程的建议列表，支持多种过滤条件。

**路径参数**:
- `id` (string, required): 行程ID

**查询参数**:
- `persona` (string, optional): 过滤人格类型，可选值：`abu`, `drdre`, `neptune`
- `scope` (string, optional): 过滤作用范围，可选值：`trip`, `day`, `item`, `segment`
- `scopeId` (string, optional): 过滤作用范围ID（如dayId、itemId）
- `severity` (string, optional): 过滤严重级别，可选值：`info`, `warn`, `blocker`
- `status` (string, optional): 过滤状态，可选值：`new`, `seen`, `applied`, `dismissed`
- `limit` (number, optional): 返回数量限制，默认100
- `offset` (number, optional): 偏移量，默认0

**请求示例**:
```
GET /trips/123/suggestions?persona=abu&scope=day&scopeId=day-456&severity=blocker
```

**响应格式**:
```typescript
interface SuggestionListResponse {
  items: Suggestion[];
  total: number;
  filters?: {
    persona?: 'abu' | 'drdre' | 'neptune';
    scope?: 'trip' | 'day' | 'item' | 'segment';
    scopeId?: string;
    severity?: 'info' | 'warn' | 'blocker';
  };
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "sug-001",
        "persona": "abu",
        "scope": "day",
        "scopeId": "day-456",
        "severity": "blocker",
        "status": "new",
        "title": "发现高风险路段",
        "summary": "Day 2 包含夜间徒步，存在安全隐患",
        "description": "详细描述...",
        "evidence": [
          {
            "id": "ev-001",
            "type": "road_closure",
            "title": "道路封闭信息",
            "description": "该路段在夜间不推荐通行",
            "source": "官方交通部门"
          }
        ],
        "actions": [
          {
            "id": "view_evidence",
            "label": "查看证据",
            "type": "view_evidence",
            "primary": true
          },
          {
            "id": "apply_alternative",
            "label": "应用替代路线",
            "type": "apply",
            "primary": false
          }
        ],
        "createdAt": "2024-01-15T10:00:00Z",
        "metadata": {
          "riskLevel": "high",
          "riskType": "night_travel",
          "affectedSegment": "segment-789"
        }
      }
    ],
    "total": 1
  }
}
```

**业务逻辑说明**:
1. 建议数据应该从三人格的输出中生成
2. 可以整合现有的 `getPersonaAlerts`、`getConflicts` 等接口的数据
3. 需要根据行程的当前状态实时计算建议
4. 建议应该按照严重级别和创建时间排序

---

### 2. 获取建议统计

**接口**: `GET /trips/:id/suggestions/stats`

**描述**: 获取建议的统计数据，用于角标显示和汇总。

**路径参数**:
- `id` (string, required): 行程ID

**请求示例**:
```
GET /trips/123/suggestions/stats
```

**响应格式**:
```typescript
interface SuggestionStats {
  tripId: string;
  byPersona: {
    abu: {
      total: number;
      bySeverity: {
        blocker: number;
        warn: number;
        info: number;
      };
    };
    drdre: {
      total: number;
      bySeverity: {
        blocker: number;
        warn: number;
        info: number;
      };
    };
    neptune: {
      total: number;
      bySeverity: {
        blocker: number;
        warn: number;
        info: number;
      };
    };
  };
  byScope: {
    trip: number;
    day: Record<string, number>;     // dayId -> count
    item: Record<string, number>;    // itemId -> count
  };
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "tripId": "123",
    "byPersona": {
      "abu": {
        "total": 5,
        "bySeverity": {
          "blocker": 2,
          "warn": 2,
          "info": 1
        }
      },
      "drdre": {
        "total": 3,
        "bySeverity": {
          "blocker": 0,
          "warn": 2,
          "info": 1
        }
      },
      "neptune": {
        "total": 2,
        "bySeverity": {
          "blocker": 0,
          "warn": 1,
          "info": 1
        }
      }
    },
    "byScope": {
      "trip": 3,
      "day": {
        "day-456": 2,
        "day-789": 1
      },
      "item": {
        "item-001": 1,
        "item-002": 1
      }
    }
  }
}
```

**业务逻辑说明**:
1. 统计应该基于当前所有的建议（不包括已应用的）
2. 可以只统计 `status` 为 `new` 或 `seen` 的建议
3. 需要按人格、严重级别、作用范围分别统计
4. 这个接口主要用于角标数字显示，性能要求较高，建议缓存

---

### 3. 应用建议

**接口**: `POST /trips/:id/suggestions/:suggestionId/apply`

**描述**: 应用一个建议，执行对应的操作（如应用替代路线、调整节奏等）。

**路径参数**:
- `id` (string, required): 行程ID
- `suggestionId` (string, required): 建议ID

**请求体**:
```typescript
interface ApplySuggestionRequest {
  actionId: string;              // 要执行的操作ID
  params?: Record<string, any>;  // 操作参数
  preview?: boolean;             // 是否只是预览，不实际应用（默认false）
}
```

**请求示例**:
```json
{
  "actionId": "apply_alternative",
  "params": {
    "alternativeId": "alt-001",
    "confirm": true
  },
  "preview": false
}
```

**响应格式**:
```typescript
interface ApplySuggestionResponse {
  success: boolean;
  suggestionId: string;
  appliedChanges: Array<{
    type: string;
    description: string;
  }>;
  impact?: {
    metrics?: {
      fatigue?: number;
      buffer?: number;
      cost?: number;
    };
    risks?: Array<{
      id: string;
      severity: 'info' | 'warn' | 'blocker';
      title: string;
    }>;
  };
  triggeredSuggestions?: string[];  // 应用后自动触发的其他建议ID列表
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "suggestionId": "sug-001",
    "appliedChanges": [
      {
        "type": "route_replacement",
        "description": "已替换Day 2的路线为更安全的方案"
      }
    ],
    "impact": {
      "metrics": {
        "fatigue": -5,
        "buffer": 30,
        "cost": 50
      },
      "risks": [
        {
          "id": "risk-002",
          "severity": "info",
          "title": "新增缓冲时间充足"
        }
      ]
    },
    "triggeredSuggestions": ["sug-003", "sug-004"]
  }
}
```

**业务逻辑说明**:
1. 应用建议后，需要实际修改行程数据
2. 应用后应该自动触发其他相关建议的重新计算（如Abu重新校验安全、Dr.Dre重新计算节奏）
3. 如果 `preview=true`，只返回影响分析，不实际应用
4. 应用成功后，建议状态应该更新为 `applied`
5. `triggeredSuggestions` 字段很重要，前端需要知道应用后产生了哪些新建议

---

### 4. 忽略建议

**接口**: `POST /trips/:id/suggestions/:suggestionId/dismiss`

**描述**: 忽略一个建议，标记为已忽略状态。

**路径参数**:
- `id` (string, required): 行程ID
- `suggestionId` (string, required): 建议ID

**请求体**: 无（或可选的忽略原因）

**请求示例**:
```
POST /trips/123/suggestions/sug-001/dismiss
```

**响应格式**:
```json
{
  "success": true,
  "data": null
}
```

**业务逻辑说明**:
1. 忽略后，建议状态更新为 `dismissed`
2. 忽略的建议不应该在统计中计算
3. 用户可以在助手中心中查看已忽略的建议（如果需要）

---

## 数据来源和转换

### 现有接口数据整合

建议系统可以整合以下现有接口的数据：

1. **getPersonaAlerts** (`GET /trips/:id/persona-alerts`)
   - 转换为 `Suggestion` 格式
   - 人格映射：`ABU` → `abu`, `DR_DRE` → `drdre`, `NEPTUNE` → `neptune`
   - 严重级别映射：`warning` → `warn`, `info` → `info`, `success` → `info`

2. **getConflicts** (`GET /trips/:id/conflicts`)
   - 冲突可以转换为 `Suggestion` 格式
   - 可以根据冲突类型决定归属的人格（时间冲突 → Dr.Dre，安全冲突 → Abu）

3. **getEvidence** (`GET /trips/:id/evidence`)
   - 证据数据可以作为 `Suggestion.evidence` 使用

### 建议生成逻辑

1. **Abu建议**:
   - 从安全检查、风险分析中生成
   - 必须有 `evidence` 字段
   - 严重级别基于风险等级

2. **Dr.Dre建议**:
   - 从节奏分析、指标计算中生成
   - 包含指标类型、阈值、当前值等信息
   - 提供调整选项（插入缓冲日、缩短时长等）

3. **Neptune建议**:
   - 从修复分析、替代方案中生成
   - 包含替代方案列表
   - 提供一键应用功能

---

## 性能要求

1. **获取建议列表**: 响应时间 < 500ms
2. **获取建议统计**: 响应时间 < 200ms（建议缓存）
3. **应用建议**: 响应时间 < 2s（需要修改数据）
4. **忽略建议**: 响应时间 < 200ms

---

## 错误处理

所有接口应该返回统一的错误格式：

```json
{
  "success": false,
  "error": {
    "code": "SUGGESTION_NOT_FOUND",
    "message": "建议不存在"
  }
}
```

常见错误码：
- `SUGGESTION_NOT_FOUND`: 建议不存在
- `TRIP_NOT_FOUND`: 行程不存在
- `UNAUTHORIZED`: 无权限访问
- `ACTION_NOT_SUPPORTED`: 不支持的操作
- `APPLICATION_FAILED`: 应用失败

---

## 前端使用示例

### 获取所有建议
```typescript
const suggestions = await tripsApi.getSuggestions(tripId);
```

### 获取风险建议（Abu）
```typescript
const riskSuggestions = await tripsApi.getSuggestions(tripId, {
  persona: 'abu',
  severity: 'blocker'
});
```

### 获取某天的建议
```typescript
const daySuggestions = await tripsApi.getSuggestions(tripId, {
  scope: 'day',
  scopeId: dayId
});
```

### 获取统计（用于角标）
```typescript
const stats = await tripsApi.getSuggestionStats(tripId);
// stats.byPersona.abu.total  -> 风险总数
// stats.byScope.day[dayId]   -> 某天的建议数
```

### 应用建议
```typescript
const result = await tripsApi.applySuggestion(tripId, suggestionId, {
  actionId: 'apply_alternative',
  params: { alternativeId: 'alt-001' }
});
// result.triggeredSuggestions 包含新触发的建议
```

---

## 实施建议

### 阶段1：基础实现
1. 实现 `GET /trips/:id/suggestions` 接口
   - 整合现有的 `getPersonaAlerts` 数据
   - 转换为 `Suggestion` 格式返回
   - 支持基本过滤

2. 实现 `GET /trips/:id/suggestions/stats` 接口
   - 从建议列表计算统计
   - 可以简单聚合现有数据

### 阶段2：完整功能
1. 实现 `POST /trips/:id/suggestions/:suggestionId/apply` 接口
   - 支持各种操作类型的应用
   - 实现跨人格协同（应用后触发其他建议重新计算）

2. 实现 `POST /trips/:id/suggestions/:suggestionId/dismiss` 接口
   - 更新建议状态

### 阶段3：优化
1. 性能优化（缓存统计、批量查询等）
2. 实时更新（WebSocket推送新建议）
3. 建议优先级和排序优化

---

## 注意事项

1. **向后兼容**: 现有的 `getPersonaAlerts` 等接口应该继续保留，直到前端完全迁移
2. **数据一致性**: 建议数据应该与行程数据保持一致
3. **权限控制**: 确保用户只能访问自己的行程建议
4. **日志记录**: 建议的应用和忽略应该记录日志，便于追踪和分析

---

## 联系方式

如有问题，请联系前端团队。

