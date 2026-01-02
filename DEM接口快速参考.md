# DEM 接口快速参考

## 概述

本文档提供 DEM（数字高程模型）数据相关接口的快速参考，包括接口路径、请求/响应格式和使用示例。

---

## 📋 接口列表

### 1. 准备度检查

**接口**: `POST /readiness/check`

**用途**: 基于目的地和行程信息检查旅行准备度，使用 DEM 数据进行地形风险评估

**请求示例**:
```typescript
import { readinessApi } from '@/api/readiness';

const result = await readinessApi.check({
  destinationId: 'NP',  // 尼泊尔
  traveler: {
    nationality: 'CN',
    riskTolerance: 'medium',
  },
  itinerary: {
    countries: ['NP'],
    activities: ['hiking'],
    region: 'Everest Base Camp',
  },
  geo: {
    lat: 27.9881,
    lng: 86.9250,
    enhanceWithGeo: true,
  },
});

// 使用结果
console.log('必须项:', result.summary.totalMust);
console.log('风险:', result.risks);
```

---

### 2. 地形适配建议

**接口**: `GET /countries/:countryCode/terrain-advice`

**用途**: 获取目的地地形对应的行程规划要点，基于 DEM 数据分析生成

**请求示例**:
```typescript
import { countriesApi } from '@/api/countries';

const advice = await countriesApi.getTerrainAdvice('NP');

// 使用结果
console.log('高海拔阈值:', advice.terrainConfig.riskThresholds.highAltitudeM);
console.log('陡坡阈值:', advice.terrainConfig.riskThresholds.steepSlopePct);
console.log('适应策略:', advice.adaptationStrategies.highAltitude);
```

---

### 3. 风险预警

**接口**: `GET /readiness/risk-warnings?tripId=xxx`

**用途**: 提前知晓行程中的潜在风险，基于 DEM 数据分析地形风险

**请求示例**:
```typescript
import { readinessApi } from '@/api/readiness';

const warnings = await readinessApi.getRiskWarnings(tripId);

// 使用结果
warnings.risks.forEach(risk => {
  console.log(`${risk.type} 风险: ${risk.summary}`);
  console.log('应对措施:', risk.mitigations);
});
```

---

### 4. 安全规则校验

**接口**: `POST /decision/validate-safety`

**用途**: 使用 Abu 策略校验行程中的物理安全违规项，使用 DEM 数据进行地形安全验证

**请求示例**:
```typescript
import { decisionApi } from '@/api/decision';
import type { ValidateSafetyRequest } from '@/types/strategy';

const request: ValidateSafetyRequest = {
  tripId: trip.id,
  plan: routePlanDraft,
  worldContext: worldModelContext,
};

const result = await decisionApi.validateSafety(request);

// 使用结果
if (!result.allowed) {
  result.violations.forEach(violation => {
    console.error(`违规: ${violation.explanation}`);
    
    // DEM 证据
    if (violation.evidence) {
      console.log(`累计爬升: ${violation.evidence.cumulativeAscent}m`);
      console.log(`最大坡度: ${violation.evidence.maxSlopePct}%`);
      console.log(`违规类型: ${violation.evidence.violation}`);
    }
  });
  
  // 备选路线
  if (result.alternativeRoutes) {
    result.alternativeRoutes.forEach(route => {
      console.log(`备选路线: ${route.description}`);
    });
  }
}
```

---

### 5. 行程节奏调整

**接口**: `POST /decision/adjust-pacing`

**用途**: 使用 Dr.Dre 策略调整行程节奏，考虑 DEM 数据计算的体力消耗

**请求示例**:
```typescript
import { decisionApi } from '@/api/decision';
import type { AdjustPacingRequest } from '@/types/strategy';

const request: AdjustPacingRequest = {
  tripId: trip.id,
  plan: routePlanDraft,
  worldContext: worldModelContext,
};

const result = await decisionApi.adjustPacing(request);

// 使用结果
if (result.success) {
  result.changes.forEach(change => {
    console.log(`${change.persona} 调整: ${change.explanation}`);
    
    if (change.changes) {
      change.changes.forEach(dayChange => {
        console.log(`第${dayChange.dayIndex}天: ${dayChange.originalDuration}分钟 → ${dayChange.adjustedDuration}分钟`);
        if (dayChange.insertedBreaks) {
          console.log(`插入休息: ${dayChange.insertedBreaks}次`);
        }
      });
    }
  });
  
  if (result.adjustedPlan) {
    console.log('调整后的计划已生成');
  }
}
```

---

### 6. 路线节点替换

**接口**: `POST /decision/replace-nodes`

**用途**: 使用 Neptune 策略替换不可用的路线节点，使用 DEM 数据验证替换后的路线安全性

**请求示例**:
```typescript
import { decisionApi } from '@/api/decision';
import type { ReplaceNodesRequest } from '@/types/strategy';

const request: ReplaceNodesRequest = {
  tripId: trip.id,
  plan: routePlanDraft,
  worldContext: worldModelContext,
  unavailableNodes: [
    {
      nodeId: 'node-123',
      reason: 'closed',  // 或 'weather', 'hazard'
    },
  ],
};

const result = await decisionApi.replaceNodes(request);

// 使用结果
if (result.success) {
  result.replacements.forEach(replacement => {
    console.log(`${replacement.persona} 替换:`);
    console.log(`  原节点: ${replacement.originalNodeId}`);
    console.log(`  新节点: ${replacement.replacementNodeId}`);
    console.log(`  原因: ${replacement.reason}`);
    console.log(`  说明: ${replacement.explanation}`);
    
    // DEM 验证结果
    const validation = replacement.validation;
    console.log(`  海拔变化: ${validation.elevationChange}m`);
    console.log(`  距离变化: ${validation.distanceChange}m`);
    console.log(`  坡度变化: ${validation.slopeChange}%`);
    console.log(`  安全检查: ${validation.safetyCheck}`);
  });
  
  if (result.replacedPlan) {
    console.log('替换后的计划已生成');
  }
}
```

---

## 🔧 类型定义位置

所有类型定义都在以下文件中：

- **`src/api/readiness.ts`**: `CheckReadinessDto`, `ReadinessCheckResult`, `Risk`, `RiskWarningsResponse`
- **`src/types/country.ts`**: `TerrainAdvice`
- **`src/types/strategy.ts`**: `ValidateSafetyRequest`, `ValidateSafetyResponse`, `SafetyViolation`, `AlternativeRoute`, `AdjustPacingRequest`, `AdjustPacingResponse`, `PacingChange`, `ReplaceNodesRequest`, `ReplaceNodesResponse`, `NodeReplacement`

---

## 📝 关键字段说明

### DEM 证据字段（SafetyViolation.evidence）

- `elevationProfile?: number[]` - 高程剖面（米）
- `cumulativeAscent?: number` - 累计爬升（米）
- `maxSlopePct?: number` - 最大坡度（百分比）
- `violation?: 'HARD' | 'SOFT' | 'NONE'` - 违规类型

### 地形配置字段（TerrainAdvice.terrainConfig）

- `riskThresholds.highAltitudeM` - 高海拔阈值（米）
- `riskThresholds.steepSlopePct` - 陡坡阈值（百分比）
- `riskThresholds.maxDailyAscentM` - 最大日爬升（米）
- `riskThresholds.maxConsecutiveHighAltitudeDays` - 最大连续高海拔天数

### 验证字段（NodeReplacement.validation）

- `elevationChange?: number` - 海拔变化（米）
- `distanceChange?: number` - 距离变化（米）
- `slopeChange?: number` - 坡度变化（百分比）
- `safetyCheck: 'PASS' | 'WARN' | 'FAIL'` - 安全检查结果

---

## ⚠️ 注意事项

1. **tripId 字段**: 
   - `AdjustPacingRequest` 和 `ReplaceNodesRequest` 中的 `tripId` 是必填字段
   - `ValidateSafetyRequest` 中的 `tripId` 是可选的

2. **可选字段**:
   - `AdjustPacingResponse.data.adjustedPlan` 是可选的
   - `ReplaceNodesResponse.data.replacedPlan` 是可选的

3. **向后兼容**:
   - 所有类型定义都支持旧字段（如 `reason`），同时支持新字段（如 `explanation`）

4. **错误处理**:
   - 所有接口调用都应该包含 try-catch 错误处理
   - 检查响应中的 `success` 字段

---

## 🔗 相关文档

- [DEM接口对接完成清单](./DEM接口对接完成清单.md) - 详细的接口对接状态
- [API对接清单](./API对接清单.md) - 所有 API 接口的对接状态

---

**最后更新**: 2025-01-XX

