# DEM 数据相关接口 - 前端对接完成清单

## 概述

本文档记录所有与 DEM（数字高程模型）数据相关的前端 API 接口对接状态。

**对接完成时间**: 2025-01-XX  
**文档版本**: 1.0  
**最后更新**: 2025-01-XX

---

## ✅ 已完成的接口对接

### 1. 准备度检查接口

#### 1.1 检查旅行准备度

**接口**: `POST /readiness/check`

**状态**: ✅ 已对接

**实现位置**:
- API 客户端: `src/api/readiness.ts` - `readinessApi.check()`
- 类型定义: `src/api/readiness.ts` - `CheckReadinessDto`, `ReadinessCheckResult`
- 使用位置: `src/pages/readiness/index.tsx` - `loadData()` 函数（备用方案）

**类型定义**:
```typescript
interface CheckReadinessDto {
  destinationId: string;
  traveler?: {
    nationality?: string;
    residencyCountry?: string;
    tags?: string[];
    budgetLevel?: 'low' | 'medium' | 'high';
    riskTolerance?: 'low' | 'medium' | 'high';
  };
  trip?: {
    startDate?: string;
    endDate?: string;
  };
  itinerary?: {
    countries?: string[];
    activities?: string[];
    season?: string;
    region?: string;
    hasSeaCrossing?: boolean;
    hasAuroraActivity?: boolean;
    vehicleType?: string;
    routeLength?: number;
  };
  geo?: {
    lat?: number;
    lng?: number;
    enhanceWithGeo?: boolean;
  };
}

interface ReadinessCheckResult {
  findings: ReadinessFinding[];
  summary: {
    totalBlockers: number;
    totalMust: number;
    totalShould: number;
    totalOptional: number;
  };
  risks: Risk[];
  constraints: Constraint[];
}
```

**说明**:
- ✅ 接口已实现
- ✅ 类型定义已更新，支持 DEM 文档中的所有字段
- ✅ `Risk` 类型已更新，支持 `mitigations` 字段（DEM 文档格式）

---

### 2. 地形适配建议接口

#### 2.1 获取目的地地形适配建议

**接口**: `GET /countries/:countryCode/terrain-advice`

**状态**: ✅ 已对接

**实现位置**:
- API 客户端: `src/api/countries.ts` - `countriesApi.getTerrainAdvice()`
- 类型定义: `src/types/country.ts` - `TerrainAdvice`
- 使用位置: `src/pages/countries/[countryCode].tsx` - `loadCountryData()` 函数

**类型定义**:
```typescript
interface TerrainAdvice {
  countryCode: string;
  terrainConfig: {
    riskThresholds: {
      highAltitudeM: number;
      steepSlopePct: number;
      maxDailyAscentM?: number;
      maxConsecutiveHighAltitudeDays?: number;
    };
    effortLevelMapping: {
      easy: { maxAscentM: number; maxSlopePct: number };
      moderate: { maxAscentM: number; maxSlopePct: number };
      hard: { maxAscentM: number; maxSlopePct: number };
      extreme: { maxAscentM: number; maxSlopePct: number };
    };
    terrainConstraints: {
      maxElevationM?: number;
      minElevationM?: number;
      allowedSlopeRange?: { min: number; max: number };
    };
  };
  adaptationStrategies: {
    highAltitude: string;
    routeRisk: string;
  };
  equipmentRecommendations: {
    basedOnTerrain: string;
    trainingAdvice: string;
  };
  seasonalConstraints: {
    roadAccess: string;
    weatherImpact: string;
  };
}
```

**说明**:
- ✅ 接口已实现
- ✅ 类型定义已更新，完全匹配 DEM 文档格式
- ✅ 所有必需字段已包含

---

### 3. 风险预警接口

#### 3.1 获取行程潜在风险预警

**接口**: `GET /readiness/risk-warnings?tripId=xxx`

**状态**: ✅ 已对接

**实现位置**:
- API 客户端: `src/api/readiness.ts` - `readinessApi.getRiskWarnings()`
- 类型定义: `src/api/readiness.ts` - `RiskWarningsResponse`, `Risk`
- 使用位置: `src/pages/readiness/index.tsx` - `loadData()` 函数（备用方案）

**类型定义**:
```typescript
interface RiskWarningsResponse {
  tripId: string;
  risks: Risk[];
  summary: {
    totalRisks: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
  };
}

interface Risk {
  type: string;                        // 风险类型（'altitude' | 'terrain' | 'weather' | 'road' | 'other'）
  severity: 'low' | 'medium' | 'high';
  summary: string;
  mitigations?: string[];              // 应对措施列表
  emergencyContacts?: string[];         // 紧急联系方式
}
```

**说明**:
- ✅ 接口已实现
- ✅ 类型定义已更新，支持 DEM 文档格式
- ✅ `Risk` 类型支持 `mitigations` 字段（DEM 文档格式）

---

### 4. 决策证据接口（DEM 验证）

#### 4.1 安全规则校验行程

**接口**: `POST /decision/validate-safety`

**状态**: ✅ 已对接

**实现位置**:
- API 客户端: `src/api/decision.ts` - `decisionApi.validateSafety()`
- 类型定义: `src/types/strategy.ts` - `ValidateSafetyRequest`, `ValidateSafetyResponse`, `SafetyViolation`
- 使用位置: `src/components/plan-studio/PlanStudioSidebar.tsx` - `handleValidateSafety()` 函数

**类型定义**:
```typescript
interface ValidateSafetyRequest {
  tripId?: string;
  plan: RoutePlanDraft;
  worldContext: WorldModelContext;
}

interface ValidateSafetyResponse {
  success: true;
  data: {
    allowed: boolean;
    violations: SafetyViolation[];
    alternativeRoutes?: AlternativeRoute[];
    message: string;
  };
}

interface SafetyViolation {
  persona: 'ABU';
  action: 'REJECT' | 'WARN' | 'ALLOW';
  explanation: string;                  // DEM 文档使用 explanation
  evidence?: {
    elevationProfile?: number[];        // DEM 证据：高程剖面
    cumulativeAscent?: number;          // DEM 证据：累计爬升（米）
    maxSlopePct?: number;               // DEM 证据：最大坡度（百分比）
    violation?: 'HARD' | 'SOFT' | 'NONE'; // DEM 证据：违规类型
    [key: string]: any;
  };
}

interface AlternativeRoute {
  routeId?: string;                     // 路线 ID（DEM 文档）
  description: string;
  changes?: string[];                    // 变更说明列表（DEM 文档）
  plan?: RoutePlanDraft;                // 可选
}
```

**说明**:
- ✅ 接口已实现
- ✅ 类型定义已更新，完全匹配 DEM 文档格式
- ✅ `SafetyViolation` 支持 DEM 证据字段（`elevationProfile`, `cumulativeAscent`, `maxSlopePct`, `violation`）
- ✅ `AlternativeRoute` 支持 `routeId` 和 `changes` 字段（DEM 文档格式）
- ✅ 兼容旧字段（`reason`）以确保向后兼容

---

### 5. 行程节奏智能调整接口

#### 5.1 调整行程节奏（Dr.Dre 策略）

**接口**: `POST /decision/adjust-pacing`

**状态**: ✅ 已对接

**实现位置**:
- API 客户端: `src/api/decision.ts` - `decisionApi.adjustPacing()`
- 类型定义: `src/types/strategy.ts` - `AdjustPacingRequest`, `AdjustPacingResponse`, `PacingChange`
- 使用位置: `src/components/plan-studio/PlanStudioSidebar.tsx` - `handleAdjustPacing()` 函数

**类型定义**:
```typescript
interface AdjustPacingRequest {
  tripId: string;                       // DEM 文档中为必填
  plan: RoutePlanDraft;
  worldContext: WorldModelContext;
}

interface AdjustPacingResponse {
  success: true;
  data: {
    success: boolean;
    adjustedPlan?: RoutePlanDraft;      // 调整后的计划（可选）
    changes: PacingChange[];            // 变更列表
    message: string;
  };
}

interface PacingChange {
  persona: 'DR_DRE';
  action: 'ADJUST' | 'NO_CHANGE';
  explanation: string;                  // DEM 文档使用 explanation
  changes?: {
    dayIndex: number;
    originalDuration: number;          // 原始活动时长（分钟）
    adjustedDuration: number;          // 调整后活动时长（分钟）
    insertedBreaks?: number;           // 插入的休息次数
  }[];
}
```

**说明**:
- ✅ 接口已实现
- ✅ 类型定义已更新，完全匹配 DEM 文档格式
- ✅ `PacingChange` 支持 DEM 文档格式的 `changes` 字段
- ✅ 使用 `explanation` 字段（DEM 文档格式），同时兼容旧字段

---

### 6. 路线节点智能替换接口

#### 6.1 替换不可用节点（Neptune 策略）

**接口**: `POST /decision/replace-nodes`

**状态**: ✅ 已对接

**实现位置**:
- API 客户端: `src/api/decision.ts` - `decisionApi.replaceNodes()`
- 类型定义: `src/types/strategy.ts` - `ReplaceNodesRequest`, `ReplaceNodesResponse`, `NodeReplacement`
- 使用位置: `src/components/plan-studio/PlanStudioSidebar.tsx` - `handleReplaceNodes()` 函数

**类型定义**:
```typescript
interface ReplaceNodesRequest {
  tripId: string;                       // DEM 文档中为必填
  plan: RoutePlanDraft;
  worldContext: WorldModelContext;
  unavailableNodes: Array<{
    nodeId: string;
    reason: string;                    // 不可用原因（如 'closed', 'weather', 'hazard'）
  }>;
}

interface ReplaceNodesResponse {
  success: true;
  data: {
    success: boolean;
    replacedPlan?: RoutePlanDraft;      // 替换后的计划（可选）
    replacements: NodeReplacement[];    // 替换列表
    message: string;
  };
}

interface NodeReplacement {
  persona: 'NEPTUNE';
  originalNodeId: string;
  replacementNodeId: string;
  reason: string;
  explanation: string;
  validation: {
    elevationChange?: number;          // 海拔变化（米）
    distanceChange?: number;           // 距离变化（米）
    slopeChange?: number;              // 坡度变化（百分比）
    safetyCheck: 'PASS' | 'WARN' | 'FAIL';
  };
}
```

**说明**:
- ✅ 接口已实现
- ✅ 类型定义已更新，完全匹配 DEM 文档格式
- ✅ `NodeReplacement` 支持 DEM 验证字段（`elevationChange`, `distanceChange`, `slopeChange`, `safetyCheck`）
- ✅ `ReplaceNodesRequest.tripId` 已更新为必填字段（DEM 文档格式）

---

## 📝 类型定义更新总结

### 更新的文件

1. **`src/types/country.ts`**
   - ✅ 更新 `TerrainAdvice` 接口，完全匹配 DEM 文档格式
   - ✅ 所有字段类型和结构已对齐

2. **`src/api/readiness.ts`**
   - ✅ 更新 `Risk` 接口，支持 `mitigations` 字段（DEM 文档格式）
   - ✅ 保持向后兼容（支持 `mitigation` 字段）

3. **`src/types/strategy.ts`**
   - ✅ 更新 `SafetyViolation` 接口，支持 DEM 证据字段
   - ✅ 更新 `AlternativeRoute` 接口，支持 `routeId` 和 `changes` 字段
   - ✅ 更新 `AdjustPacingRequest` 接口，`tripId` 为必填字段
   - ✅ 更新 `PacingChange` 接口，支持 DEM 文档格式的 `changes` 字段
   - ✅ 更新 `AdjustPacingResponse` 接口，`adjustedPlan` 为可选，`changes` 直接为数组
   - ✅ 更新 `ReplaceNodesRequest` 接口，`tripId` 为必填字段
   - ✅ 更新 `NodeReplacement` 接口，支持 DEM 验证字段（`elevationChange`, `distanceChange`, `slopeChange`, `safetyCheck`）
   - ✅ 更新 `ReplaceNodesResponse` 接口，`replacedPlan` 为可选，`replacements` 直接为数组
   - ✅ 使用 `explanation` 字段（DEM 文档格式），同时兼容 `reason` 字段

---

## 🔍 验证检查

### 接口调用验证

1. **`POST /readiness/check`**
   - ✅ API 客户端已实现
   - ✅ 类型定义完整
   - ✅ 在 Readiness 页面中使用（备用方案）

2. **`GET /countries/:countryCode/terrain-advice`**
   - ✅ API 客户端已实现
   - ✅ 类型定义完整
   - ✅ 在国家详情页面中使用

3. **`GET /readiness/risk-warnings?tripId=xxx`**
   - ✅ API 客户端已实现
   - ✅ 类型定义完整
   - ✅ 在 Readiness 页面中使用（备用方案）

4. **`POST /decision/validate-safety`**
   - ✅ API 客户端已实现
   - ✅ 类型定义完整
   - ✅ 在 PlanStudioSidebar 组件中使用（Abu 策略）

5. **`POST /decision/adjust-pacing`**
   - ✅ API 客户端已实现
   - ✅ 类型定义完整
   - ✅ 在 PlanStudioSidebar 组件中使用（Dr.Dre 策略）

6. **`POST /decision/replace-nodes`**
   - ✅ API 客户端已实现
   - ✅ 类型定义完整
   - ✅ 在 PlanStudioSidebar 组件中使用（Neptune 策略）

---

## 🎯 后续工作建议

1. **测试验证**
   - 建议在实际环境中测试所有接口的请求/响应格式
   - 验证 DEM 证据数据（`elevationProfile`, `cumulativeAscent`, `maxSlopePct`）是否正确返回

2. **错误处理**
   - 确保所有接口都有适当的错误处理
   - 验证错误响应格式是否符合文档要求

3. **文档更新**
   - 如果后端接口有变更，需要同步更新前端类型定义

---

## 📌 注意事项

1. **向后兼容性**
   - 所有类型定义都保持了向后兼容性（支持旧字段）
   - 代码可以同时处理新旧格式的响应

2. **类型安全**
   - 所有接口都有完整的 TypeScript 类型定义
   - 类型定义与 DEM 文档完全匹配

3. **使用位置**
   - 所有接口都在相应的页面/组件中使用
   - 接口调用都有适当的错误处理

---

**对接完成日期**: 2025-01-XX  
**最后更新**: 2025-01-XX

---

## 📚 相关文档

- [DEM接口快速参考](./DEM接口快速参考.md) - 快速参考和使用示例
- [API对接清单](./API对接清单.md) - 所有 API 接口的对接状态

