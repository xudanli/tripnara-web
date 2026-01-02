# DEM 接口测试指南

## 概述

本文档提供详细的测试步骤和测试用例，用于验证所有 DEM（数字高程模型）数据相关接口的功能和正确性。

**测试目标**: 确保所有 6 个 DEM 接口能够正常工作，返回正确的数据格式，并处理各种边界情况。

---

## 📋 测试接口列表

| 序号 | 接口 | 方法 | 路径 | 状态 |
|------|------|------|------|------|
| 1 | 准备度检查 | POST | `/readiness/check` | ⏳ 待测试 |
| 2 | 地形适配建议 | GET | `/countries/:countryCode/terrain-advice` | ⏳ 待测试 |
| 3 | 风险预警 | GET | `/readiness/risk-warnings?tripId=xxx` | ⏳ 待测试 |
| 4 | 安全规则校验 | POST | `/decision/validate-safety` | ⏳ 待测试 |
| 5 | 行程节奏调整 | POST | `/decision/adjust-pacing` | ⏳ 待测试 |
| 6 | 路线节点替换 | POST | `/decision/replace-nodes` | ⏳ 待测试 |

---

## 🔧 测试环境准备

### 前置条件

1. **后端服务运行**
   - 确保后端 API 服务已启动
   - 检查 API 基础路径配置（默认: `/api`）

2. **前端应用运行**
   - 启动前端开发服务器: `npm run dev` 或 `pnpm dev`
   - 确保可以访问: `http://localhost:5173`（或配置的端口）

3. **测试数据准备**
   - 准备一个测试行程 ID（tripId）
   - 准备测试国家代码（如: `NP` 尼泊尔, `IS` 冰岛）
   - 确保有有效的用户认证（如果需要）

4. **浏览器开发者工具**
   - 打开浏览器开发者工具（F12）
   - 切换到 Network（网络）标签页
   - 切换到 Console（控制台）标签页

---

## 📝 测试步骤

### 测试 1: 准备度检查接口

**接口**: `POST /readiness/check`

**测试步骤**:

1. **打开准备度页面**
   - 访问: `http://localhost:5173/readiness?tripId={tripId}`
   - 或从行程详情页面跳转

2. **观察网络请求**
   - 在 Network 标签页中查找 `readiness/check` 请求
   - 检查请求状态码（应为 200）

3. **验证请求体**
   ```json
   {
     "destinationId": "NP",
     "traveler": {
       "nationality": "CN",
       "riskTolerance": "medium"
     },
     "itinerary": {
       "countries": ["NP"],
       "activities": ["hiking"]
     },
     "geo": {
       "lat": 27.9881,
       "lng": 86.9250,
       "enhanceWithGeo": true
     }
   }
   ```

4. **验证响应数据**
   - 检查响应格式是否符合 `ReadinessCheckResult` 类型
   - 验证 `findings` 数组是否存在
   - 验证 `summary` 对象包含: `totalBlockers`, `totalMust`, `totalShould`, `totalOptional`
   - 验证 `risks` 数组，检查是否包含 DEM 相关风险（`altitude`, `terrain`）
   - 验证 `risks[].mitigations` 字段是否存在（DEM 文档格式）

5. **测试边界情况**
   - 测试无效的 `destinationId`（应返回错误）
   - 测试缺少必需字段的请求（应返回验证错误）
   - 测试空的 `itinerary`（应返回默认结果）

**预期结果**:
- ✅ 请求成功，返回 200 状态码
- ✅ 响应包含 `findings`, `summary`, `risks`, `constraints` 字段
- ✅ `risks` 中包含地形相关风险（如果有）
- ✅ `risks[].mitigations` 字段存在（DEM 文档格式）

**测试结果**: ⬜ 通过 / ⬜ 失败

**备注**: 

---

### 测试 2: 地形适配建议接口

**接口**: `GET /countries/:countryCode/terrain-advice`

**测试步骤**:

1. **打开国家详情页面**
   - 访问: `http://localhost:5173/countries/NP`（尼泊尔）
   - 或访问: `http://localhost:5173/countries/IS`（冰岛）

2. **观察网络请求**
   - 在 Network 标签页中查找 `countries/{countryCode}/terrain-advice` 请求
   - 检查请求状态码（应为 200）

3. **验证响应数据**
   - 检查响应格式是否符合 `TerrainAdvice` 类型
   - 验证 `terrainConfig.riskThresholds` 包含:
     - `highAltitudeM` (number)
     - `steepSlopePct` (number)
     - `maxDailyAscentM` (number, 可选)
     - `maxConsecutiveHighAltitudeDays` (number, 可选)
   - 验证 `terrainConfig.effortLevelMapping` 包含:
     - `easy: { maxAscentM, maxSlopePct }`
     - `moderate: { maxAscentM, maxSlopePct }`
     - `hard: { maxAscentM, maxSlopePct }`
     - `extreme: { maxAscentM, maxSlopePct }`
   - 验证 `terrainConfig.terrainConstraints` 包含:
     - `maxElevationM` (可选)
     - `minElevationM` (可选)
     - `allowedSlopeRange: { min, max }` (可选)
   - 验证 `adaptationStrategies` 包含 `highAltitude` 和 `routeRisk` 字符串
   - 验证 `equipmentRecommendations` 包含 `basedOnTerrain` 和 `trainingAdvice` 字符串
   - 验证 `seasonalConstraints` 包含 `roadAccess` 和 `weatherImpact` 字符串

4. **验证页面显示**
   - 检查页面是否正确显示地形适配建议
   - 验证所有字段都有对应的 UI 展示
   - 检查是否有错误提示（如果数据缺失）

5. **测试边界情况**
   - 测试不存在的国家代码（应返回 404）
   - 测试无效的国家代码格式（应返回错误）
   - 测试数据部分缺失的情况（应优雅降级）

**预期结果**:
- ✅ 请求成功，返回 200 状态码
- ✅ 响应完全符合 DEM 文档格式
- ✅ 页面正确显示所有地形信息
- ✅ 没有 JavaScript 错误（如 `maxAscentM` 未定义错误）

**测试结果**: ⬜ 通过 / ⬜ 失败

**备注**: 

---

### 测试 3: 风险预警接口

**接口**: `GET /readiness/risk-warnings?tripId=xxx`

**测试步骤**:

1. **打开准备度页面**
   - 访问: `http://localhost:5173/readiness?tripId={tripId}`
   - 确保有一个有效的行程 ID

2. **观察网络请求**
   - 在 Network 标签页中查找 `readiness/risk-warnings` 请求
   - 检查请求参数: `?tripId={tripId}`
   - 检查请求状态码（应为 200）

3. **验证响应数据**
   - 检查响应格式是否符合 `RiskWarningsResponse` 类型
   - 验证 `tripId` 字段与请求参数一致
   - 验证 `risks` 数组
   - 验证每个 `risk` 包含:
     - `type`: `'altitude' | 'terrain' | 'weather' | 'road' | 'other'`
     - `severity`: `'low' | 'medium' | 'high'`
     - `summary`: string
     - `mitigations`: string[] (DEM 文档格式)
     - `emergencyContacts`: string[] (可选)
   - 验证 `summary` 对象包含:
     - `totalRisks`: number
     - `highSeverity`: number
     - `mediumSeverity`: number
     - `lowSeverity`: number

4. **验证页面显示**
   - 检查准备度页面是否正确显示风险预警
   - 验证风险按严重程度分类显示
   - 检查应对措施（mitigations）是否正确显示

5. **测试边界情况**
   - 测试无效的 `tripId`（应返回错误）
   - 测试不存在的行程（应返回 404）
   - 测试没有风险的行程（应返回空数组）

**预期结果**:
- ✅ 请求成功，返回 200 状态码
- ✅ 响应包含 `risks` 和 `summary` 字段
- ✅ `risks[].mitigations` 字段存在（DEM 文档格式）
- ✅ 页面正确显示风险信息

**测试结果**: ⬜ 通过 / ⬜ 失败

**备注**: 

---

## 🔍 测试工具和方法

### 方法 1: 浏览器开发者工具

1. **打开开发者工具**
   - 按 `F12` 或右键选择"检查"
   - 切换到 Network（网络）标签页

2. **过滤请求**
   - 在过滤器输入框中输入接口路径关键词
   - 例如: `readiness`, `terrain-advice`, `decision`

3. **查看请求详情**
   - 点击请求查看 Headers（请求头）
   - 查看 Payload（请求体）
   - 查看 Response（响应数据）

4. **查看控制台**
   - 切换到 Console（控制台）标签页
   - 查看是否有错误或警告信息

### 方法 2: 使用 Postman 或类似工具

1. **创建请求集合**
   - 为每个接口创建独立的请求
   - 设置正确的请求方法和路径

2. **配置认证**
   - 如果需要认证，添加 Authorization header
   - 使用 Bearer Token 或其他认证方式

3. **测试请求**
   - 发送请求并查看响应
   - 验证响应格式和状态码

### 方法 3: 使用浏览器控制台

在浏览器控制台中直接调用 API：

```javascript
// 测试地形适配建议接口
fetch('/api/countries/NP/terrain-advice')
  .then(res => res.json())
  .then(data => {
    console.log('地形适配建议:', data);
    // 验证数据结构
    console.log('riskThresholds:', data.data?.terrainConfig?.riskThresholds);
    console.log('effortLevelMapping:', data.data?.terrainConfig?.effortLevelMapping);
  })
  .catch(err => console.error('错误:', err));
```

---

## 📊 测试检查清单

### 通用检查项

- [ ] 请求状态码正确（200 表示成功）
- [ ] 响应格式符合 TypeScript 类型定义
- [ ] 没有 JavaScript 运行时错误
- [ ] 错误处理正确（显示友好的错误提示）
- [ ] 加载状态正确显示
- [ ] 数据正确显示在 UI 上

### DEM 特定检查项

- [ ] DEM 证据字段存在（如 `elevationProfile`, `cumulativeAscent`, `maxSlopePct`）
- [ ] 地形相关数据正确（如 `highAltitudeM`, `steepSlopePct`）
- [ ] 风险应对措施（`mitigations`）字段存在
- [ ] 验证字段存在（如 `elevationChange`, `distanceChange`, `slopeChange`, `safetyCheck`）

---

### 测试 4: 安全规则校验接口

**接口**: `POST /decision/validate-safety`

**测试步骤**:

1. **打开规划工作台页面**
   - 访问: `http://localhost:5173/plan-studio?tripId={tripId}`
   - 切换到 "Abu 视图"（安全视图）

2. **触发接口调用**
   - 在右侧边栏找到 "Ask Agent Refine" 按钮
   - 点击按钮触发安全规则校验

3. **观察网络请求**
   - 在 Network 标签页中查找 `decision/validate-safety` 请求
   - 检查请求状态码（应为 200）

4. **验证请求体**
   ```json
   {
     "tripId": "xxx",
     "plan": {
       "tripId": "xxx",
       "routeDirectionId": "...",
       "segments": [...]
     },
     "worldContext": {
       "physical": {
         "countryCode": "NP",
         "month": 10,
         "demEvidence": [...]
       },
       "human": {
         "maxDailyAscentM": 1000,
         "rollingAscent3DaysM": 2500,
         "maxSlopePct": 20
       },
       "routeDirection": {...}
     }
   }
   ```

5. **验证响应数据**
   - 检查响应格式是否符合 `ValidateSafetyResponse` 类型
   - 验证 `allowed` 字段（boolean）
   - 验证 `violations` 数组
   - 验证每个 `violation` 包含:
     - `persona`: `'ABU'`
     - `action`: `'REJECT' | 'WARN' | 'ALLOW'`
     - `explanation`: string (DEM 文档格式)
     - `evidence`: 对象，包含 DEM 证据:
       - `elevationProfile?: number[]`
       - `cumulativeAscent?: number`
       - `maxSlopePct?: number`
       - `violation?: 'HARD' | 'SOFT' | 'NONE'`
   - 验证 `alternativeRoutes` 数组（如果存在）:
     - `routeId?: string`
     - `description`: string
     - `changes?: string[]`
   - 验证 `message` 字段

6. **验证页面显示**
   - 检查是否正确显示校验结果
   - 验证违规项是否正确显示
   - 检查 DEM 证据数据是否正确展示
   - 验证备选路线是否正确显示（如果有）

7. **测试边界情况**
   - 测试无效的 `tripId`（应返回错误）
   - 测试空的 `plan.segments`（应返回警告）
   - 测试缺少 `worldContext` 的情况（应返回错误）

**预期结果**:
- ✅ 请求成功，返回 200 状态码
- ✅ 响应包含 `allowed`, `violations`, `message` 字段
- ✅ `violations[].evidence` 包含 DEM 证据字段
- ✅ `violations[].explanation` 字段存在（DEM 文档格式）
- ✅ 页面正确显示校验结果

**测试结果**: ⬜ 通过 / ⬜ 失败

**备注**: 

---

### 测试 5: 行程节奏调整接口

**接口**: `POST /decision/adjust-pacing`

**测试步骤**:

1. **打开规划工作台页面**
   - 访问: `http://localhost:5173/plan-studio?tripId={tripId}`
   - 切换到 "Dr.Dre 视图"（理性指标视图）

2. **触发接口调用**
   - 在右侧边栏找到 "Ask Agent Optimize" 按钮
   - 点击按钮触发行程节奏调整

3. **观察网络请求**
   - 在 Network 标签页中查找 `decision/adjust-pacing` 请求
   - 检查请求状态码（应为 200）

4. **验证请求体**
   ```json
   {
     "tripId": "xxx",
     "plan": {
       "tripId": "xxx",
       "routeDirectionId": "...",
       "segments": [...]
     },
     "worldContext": {
       "physical": {...},
       "human": {...},
       "routeDirection": {...}
     }
   }
   ```

5. **验证响应数据**
   - 检查响应格式是否符合 `AdjustPacingResponse` 类型
   - 验证 `success` 字段（boolean）
   - 验证 `adjustedPlan` 字段（可选，RoutePlanDraft 类型）
   - 验证 `changes` 数组，每个 `change` 包含:
     - `persona`: `'DR_DRE'`
     - `action`: `'ADJUST' | 'NO_CHANGE'`
     - `explanation`: string (DEM 文档格式)
     - `changes`: 数组（可选），包含:
       - `dayIndex`: number
       - `originalDuration`: number (分钟)
       - `adjustedDuration`: number (分钟)
       - `insertedBreaks?: number`
   - 验证 `message` 字段

6. **验证页面显示**
   - 检查是否正确显示调整结果
   - 验证变更列表是否正确显示
   - 检查调整说明（explanation）是否正确展示
   - 验证调整后的计划是否正确显示（如果有）

7. **测试边界情况**
   - 测试无效的 `tripId`（应返回错误）
   - 测试已经优化的行程（应返回 `NO_CHANGE`）
   - 测试缺少 `plan` 的情况（应返回错误）

**预期结果**:
- ✅ 请求成功，返回 200 状态码
- ✅ 响应包含 `success`, `changes`, `message` 字段
- ✅ `changes[].explanation` 字段存在（DEM 文档格式）
- ✅ `changes[].changes` 包含详细的调整信息
- ✅ 页面正确显示调整结果

**测试结果**: ⬜ 通过 / ⬜ 失败

**备注**: 

---

### 测试 6: 路线节点替换接口

**接口**: `POST /decision/replace-nodes`

**测试步骤**:

1. **打开规划工作台页面**
   - 访问: `http://localhost:5173/plan-studio?tripId={tripId}`
   - 切换到 "Neptune 视图"（修复视图）

2. **触发接口调用**
   - 在右侧边栏找到 "Ask Agent Fix" 按钮
   - 点击按钮触发路线节点替换

3. **观察网络请求**
   - 在 Network 标签页中查找 `decision/replace-nodes` 请求
   - 检查请求状态码（应为 200）

4. **验证请求体**
   ```json
   {
     "tripId": "xxx",
     "plan": {
       "tripId": "xxx",
       "routeDirectionId": "...",
       "segments": [...]
     },
     "worldContext": {
       "physical": {...},
       "human": {...},
       "routeDirection": {...}
     },
     "unavailableNodes": [
       {
         "nodeId": "node-123",
         "reason": "closed"
       }
     ]
   }
   ```

5. **验证响应数据**
   - 检查响应格式是否符合 `ReplaceNodesResponse` 类型
   - 验证 `success` 字段（boolean）
   - 验证 `replacedPlan` 字段（可选，RoutePlanDraft 类型）
   - 验证 `replacements` 数组，每个 `replacement` 包含:
     - `persona`: `'NEPTUNE'`
     - `originalNodeId`: string
     - `replacementNodeId`: string
     - `reason`: string
     - `explanation`: string
     - `validation`: 对象，包含 DEM 验证:
       - `elevationChange?: number` (米)
       - `distanceChange?: number` (米)
       - `slopeChange?: number` (百分比)
       - `safetyCheck`: `'PASS' | 'WARN' | 'FAIL'`
   - 验证 `message` 字段

6. **验证页面显示**
   - 检查是否正确显示替换结果
   - 验证替换列表是否正确显示
   - 检查 DEM 验证数据是否正确展示:
     - 海拔变化（elevationChange）
     - 距离变化（distanceChange）
     - 坡度变化（slopeChange）
     - 安全检查结果（safetyCheck）
   - 验证替换后的计划是否正确显示（如果有）

7. **测试边界情况**
   - 测试无效的 `tripId`（应返回错误）
   - 测试空的 `unavailableNodes`（应返回空替换列表）
   - 测试无法替换的节点（应返回错误或警告）

**预期结果**:
- ✅ 请求成功，返回 200 状态码
- ✅ 响应包含 `success`, `replacements`, `message` 字段
- ✅ `replacements[].validation` 包含 DEM 验证字段
- ✅ `replacements[].explanation` 字段存在（DEM 文档格式）
- ✅ 页面正确显示替换结果和验证数据

**测试结果**: ⬜ 通过 / ⬜ 失败

**备注**: 

---

## 🧪 自动化测试脚本

### 使用 curl 测试

#### 测试 1: 准备度检查

```bash
curl -X POST http://localhost:3000/api/readiness/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "destinationId": "NP",
    "traveler": {
      "nationality": "CN",
      "riskTolerance": "medium"
    },
    "itinerary": {
      "countries": ["NP"],
      "activities": ["hiking"],
      "region": "Everest Base Camp"
    },
    "geo": {
      "lat": 27.9881,
      "lng": 86.9250,
      "enhanceWithGeo": true
    }
  }'
```

#### 测试 2: 地形适配建议

```bash
curl -X GET http://localhost:3000/api/countries/NP/terrain-advice \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 测试 3: 风险预警

```bash
curl -X GET "http://localhost:3000/api/readiness/risk-warnings?tripId=YOUR_TRIP_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 测试 4: 安全规则校验

```bash
curl -X POST http://localhost:3000/api/decision/validate-safety \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "tripId": "YOUR_TRIP_ID",
    "plan": {
      "tripId": "YOUR_TRIP_ID",
      "routeDirectionId": "YOUR_ROUTE_ID",
      "segments": []
    },
    "worldContext": {
      "physical": {
        "countryCode": "NP",
        "month": 10,
        "demEvidence": [],
        "roadStates": [],
        "hazardZones": [],
        "ferryStates": []
      },
      "human": {
        "maxDailyAscentM": 1000,
        "rollingAscent3DaysM": 2500,
        "maxSlopePct": 20,
        "weatherRiskWeight": 0.5,
        "bufferDayBias": "MEDIUM",
        "riskTolerance": "MEDIUM"
      },
      "routeDirection": {
        "id": "YOUR_ROUTE_ID",
        "nameCN": "测试路线",
        "nameEN": "Test Route",
        "countryCode": "NP"
      }
    }
  }'
```

---

## 📈 测试结果记录表

| 测试项 | 接口 | 测试日期 | 测试人员 | 状态 | 备注 |
|--------|------|---------|---------|------|------|
| 测试 1 | POST /readiness/check | | | ⬜ | |
| 测试 2 | GET /countries/:countryCode/terrain-advice | | | ⬜ | |
| 测试 3 | GET /readiness/risk-warnings | | | ⬜ | |
| 测试 4 | POST /decision/validate-safety | | | ⬜ | |
| 测试 5 | POST /decision/adjust-pacing | | | ⬜ | |
| 测试 6 | POST /decision/replace-nodes | | | ⬜ | |

**总体测试结果**: ⬜ 全部通过 / ⬜ 部分失败 / ⬜ 全部失败

---

## 🐛 常见问题和解决方案

### 问题 1: 接口返回 404

**可能原因**:
- API 路径不正确
- 后端服务未启动
- 路由配置错误

**解决方案**:
- 检查 API 基础路径配置
- 确认后端服务运行状态
- 检查路由配置是否正确

### 问题 2: 接口返回 401/403

**可能原因**:
- 缺少认证 token
- token 已过期
- 权限不足

**解决方案**:
- 检查认证 token 是否正确设置
- 刷新 token 或重新登录
- 检查用户权限

### 问题 3: 响应数据格式不匹配

**可能原因**:
- 后端返回的数据格式与类型定义不一致
- 类型定义需要更新

**解决方案**:
- 检查后端实际返回的数据格式
- 更新前端类型定义以匹配后端
- 添加数据验证和转换逻辑

### 问题 4: DEM 证据字段缺失

**可能原因**:
- 后端未返回 DEM 数据
- DEM 数据计算失败
- 数据源不可用

**解决方案**:
- 检查后端 DEM 数据源状态
- 验证 DEM 数据计算逻辑
- 添加降级方案（当 DEM 数据不可用时）

---

## 📚 相关文档

- [DEM接口对接完成清单](./DEM接口对接完成清单.md) - 详细的接口对接状态
- [DEM接口快速参考](./DEM接口快速参考.md) - 快速参考和使用示例
- [DEM接口使用页面清单](./DEM接口使用页面清单.md) - 接口在页面中的使用位置

---

**文档版本**: 1.0  
**创建日期**: 2025-01-XX  
**最后更新**: 2025-01-XX

