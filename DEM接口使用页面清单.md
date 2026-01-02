# DEM 接口使用页面清单

## 概述

本文档详细说明所有 DEM（数字高程模型）数据相关接口在前端页面和组件中的使用位置。

---

## 📋 接口使用位置总览

| 接口 | 页面/组件 | 路由路径 | 使用场景 |
|------|----------|---------|---------|
| `POST /readiness/check` | 准备度页面 | `/readiness?tripId=xxx` | 检查旅行准备度（备用方案） |
| `GET /countries/:countryCode/terrain-advice` | 国家详情页面 | `/countries/:countryCode` | 显示地形适配建议 |
| `GET /readiness/risk-warnings?tripId=xxx` | 准备度页面 | `/readiness?tripId=xxx` | 显示风险预警（备用方案） |
| `POST /decision/validate-safety` | 规划工作台侧边栏 | `/plan-studio?tripId=xxx` | Abu 策略：安全规则校验 |
| `POST /decision/validate-safety` | 决策测试页面 | `/trips/decision?tripId=xxx` | 测试安全规则校验 |
| `POST /decision/adjust-pacing` | 规划工作台侧边栏 | `/plan-studio?tripId=xxx` | Dr.Dre 策略：行程节奏调整 |
| `POST /decision/adjust-pacing` | 决策测试页面 | `/trips/decision?tripId=xxx` | 测试行程节奏调整 |
| `POST /decision/replace-nodes` | 规划工作台侧边栏 | `/plan-studio?tripId=xxx` | Neptune 策略：路线节点替换 |
| `POST /decision/replace-nodes` | 决策测试页面 | `/trips/decision?tripId=xxx` | 测试路线节点替换 |

---

## 📄 详细页面说明

### 1. 准备度页面 (`/readiness`)

**文件路径**: `src/pages/readiness/index.tsx`

**使用的接口**:

#### 1.1 `POST /readiness/check`
- **调用位置**: `loadData()` 函数（第 157 行）
- **使用场景**: 当主接口 `getTripReadiness` 不可用时，作为备用方案
- **代码片段**:
  ```typescript
  try {
    const checkResult = await readinessApi.check(buildCheckReadinessDto(tripData));
    setReadinessData(convertCheckResultToReadinessData(checkResult, tripData));
  } catch (checkErr) {
    // 继续使用其他备用方案
  }
  ```

#### 1.2 `GET /readiness/risk-warnings?tripId=xxx`
- **调用位置**: `loadData()` 函数（第 164 行）
- **使用场景**: 当主接口和 `check` 接口都不可用时，作为备用方案
- **代码片段**:
  ```typescript
  const [checklist, riskWarnings] = await Promise.all([
    readinessApi.getPersonalizedChecklist(tripId).catch(() => null),
    readinessApi.getRiskWarnings(tripId).catch(() => null),
  ]);
  ```

**页面功能**:
- 显示行程准备度状态（ready/nearly/not-ready）
- 显示阻塞项（blockers）和修复方案
- 显示风险预警和应对措施
- 支持自动修复和手动修复

**访问方式**: 
- URL: `/readiness?tripId={tripId}`
- 从行程详情页面或规划工作台跳转

---

### 2. 国家详情页面 (`/countries/:countryCode`)

**文件路径**: `src/pages/countries/[countryCode].tsx`

**使用的接口**:

#### 2.1 `GET /countries/:countryCode/terrain-advice`
- **调用位置**: `loadCountryData()` 函数（第 77 行）
- **使用场景**: 加载国家的地形适配建议信息
- **代码片段**:
  ```typescript
  const [currency, payment, pack, terrain, routes] = await Promise.allSettled([
    countriesApi.getCurrencyStrategy(countryCode),
    countriesApi.getPaymentInfo(countryCode),
    countriesApi.getPack(countryCode).catch(() => null),
    countriesApi.getTerrainAdvice(countryCode).catch(() => null), // 地形建议
    routeDirectionsApi.getByCountry(countryCode).catch(() => []),
  ]);
  ```

**页面功能**:
- 显示国家基本信息
- 显示货币策略和支付信息
- **显示地形适配建议**（DEM 相关）:
  - 风险阈值（高海拔阈值、陡坡阈值、最大日爬升、最大连续高海拔天数）
  - 体力等级映射（easy/moderate/hard/extreme）
  - 地形约束（最大/最小海拔、允许坡度范围）
  - 适应策略（高海拔适应、路线风险说明）
  - 装备推荐（基于地形、训练建议）
  - 季节性约束（道路通行、天气影响）

**访问方式**: 
- URL: `/countries/{countryCode}`
- 例如: `/countries/NP` (尼泊尔)

---

### 3. 规划工作台侧边栏组件

**文件路径**: `src/components/plan-studio/PlanStudioSidebar.tsx`

**使用的接口**:

#### 3.1 `POST /decision/validate-safety` (Abu 策略)
- **调用位置**: `handleValidateSafety()` 函数（第 172 行）
- **使用场景**: 用户点击 "Ask Agent Refine" 按钮时，使用 Abu 策略校验行程安全性
- **代码片段**:
  ```typescript
  const result = await decisionApi.validateSafety(request);
  
  if (result.allowed) {
    toast.success(t('planStudio.sidebar.abu.validationPassed'));
  } else {
    toast.warning(t('planStudio.sidebar.abu.validationFailed', { 
      violations: result.violations.length 
    }));
  }
  ```

#### 3.2 `POST /decision/adjust-pacing` (Dr.Dre 策略)
- **调用位置**: `handleAdjustPacing()` 函数（第 215 行）
- **使用场景**: 用户点击 "Ask Agent Optimize" 按钮时，使用 Dr.Dre 策略调整行程节奏
- **代码片段**:
  ```typescript
  const result = await decisionApi.adjustPacing(request);
  
  if (result.success) {
    toast.success(t('planStudio.sidebar.dre.pacingAdjusted', { 
      changes: result.changes.length 
    }));
  }
  ```

#### 3.3 `POST /decision/replace-nodes` (Neptune 策略)
- **调用位置**: `handleReplaceNodes()` 函数（第 262 行）
- **使用场景**: 用户点击 "Ask Agent Fix" 按钮时，使用 Neptune 策略替换不可用的路线节点
- **代码片段**:
  ```typescript
  const result = await decisionApi.replaceNodes(request);
  
  if (result.success) {
    toast.success(t('planStudio.sidebar.neptune.nodesReplaced', { 
      replacements: result.replacements.length 
    }));
  }
  ```

**组件功能**:
- 根据当前选择的 persona 模式（Abu/Dr.Dre/Neptune）显示不同的侧边栏内容
- 显示指标总览（Dr.Dre 视图）
- 显示指标异常和风险预警
- 提供三人格策略的操作按钮

**访问方式**: 
- 作为规划工作台页面的右侧边栏组件
- URL: `/plan-studio?tripId={tripId}`
- 通过切换 persona 模式（Abu/Dr.Dre/Neptune）来使用不同的策略接口

---

### 4. 决策测试页面 (`/trips/decision`)

**文件路径**: `src/pages/trips/decision.tsx`

**使用的接口**:

#### 4.1 `POST /decision/validate-safety`
- **调用位置**: 测试函数中（第 205 行）
- **使用场景**: 测试和调试安全规则校验功能

#### 4.2 `POST /decision/adjust-pacing`
- **调用位置**: 测试函数中（第 241 行）
- **使用场景**: 测试和调试行程节奏调整功能

#### 4.3 `POST /decision/replace-nodes`
- **调用位置**: 测试函数中（第 277 行）
- **使用场景**: 测试和调试路线节点替换功能

**页面功能**:
- 提供决策引擎接口的测试界面
- 可以手动构建请求参数并测试接口
- 显示接口响应结果

**访问方式**: 
- URL: `/trips/decision?tripId={tripId}`
- 主要用于开发和测试

---

## 🗺️ 页面路由映射

### 主要用户页面

1. **准备度页面**
   - 路由: `/readiness?tripId={tripId}`
   - 使用的 DEM 接口: `POST /readiness/check`, `GET /readiness/risk-warnings`
   - 用户场景: 查看行程准备度，了解风险和应对措施

2. **国家详情页面**
   - 路由: `/countries/{countryCode}`
   - 使用的 DEM 接口: `GET /countries/:countryCode/terrain-advice`
   - 用户场景: 查看目的地地形信息，了解行程规划要点

3. **规划工作台页面**
   - 路由: `/plan-studio?tripId={tripId}`
   - 使用的 DEM 接口: `POST /decision/validate-safety`, `POST /decision/adjust-pacing`, `POST /decision/replace-nodes`
   - 用户场景: 使用三人格策略优化和调整行程

### 开发/测试页面

4. **决策测试页面**
   - 路由: `/trips/decision?tripId={tripId}`
   - 使用的 DEM 接口: 所有决策引擎接口
   - 用户场景: 开发和测试决策引擎功能

---

## 📊 接口使用统计

| 接口 | 使用页面数 | 主要用途 |
|------|----------|---------|
| `POST /readiness/check` | 1 | 准备度检查（备用方案） |
| `GET /countries/:countryCode/terrain-advice` | 1 | 地形适配建议展示 |
| `GET /readiness/risk-warnings` | 1 | 风险预警展示（备用方案） |
| `POST /decision/validate-safety` | 2 | 安全规则校验（Abu 策略） |
| `POST /decision/adjust-pacing` | 2 | 行程节奏调整（Dr.Dre 策略） |
| `POST /decision/replace-nodes` | 2 | 路线节点替换（Neptune 策略） |

---

## 🔍 如何找到这些页面

### 在代码中搜索

1. **准备度相关接口**:
   ```bash
   grep -r "readinessApi" src/pages/
   ```

2. **地形适配建议接口**:
   ```bash
   grep -r "getTerrainAdvice" src/pages/
   ```

3. **决策引擎接口**:
   ```bash
   grep -r "decisionApi" src/
   ```

### 在浏览器中访问

1. **准备度页面**: 
   - 需要 tripId 参数
   - 示例: `http://localhost:3000/readiness?tripId=xxx`

2. **国家详情页面**: 
   - 需要 countryCode 参数
   - 示例: `http://localhost:3000/countries/NP`

3. **规划工作台页面**: 
   - 需要 tripId 参数
   - 示例: `http://localhost:3000/plan-studio?tripId=xxx`

4. **决策测试页面**: 
   - 需要 tripId 参数
   - 示例: `http://localhost:3000/trips/decision?tripId=xxx`

---

## 📝 注意事项

1. **备用方案**: 准备度页面中的 `check` 和 `risk-warnings` 接口是作为备用方案使用的，当主接口 `getTripReadiness` 不可用时才会调用。

2. **Persona 模式**: 规划工作台侧边栏中的决策引擎接口根据当前选择的 persona 模式（Abu/Dr.Dre/Neptune）来调用不同的接口。

3. **错误处理**: 所有接口调用都包含错误处理，如果接口失败，会显示友好的错误提示。

4. **加载状态**: 所有接口调用都显示加载状态，提升用户体验。

---

**最后更新**: 2025-01-XX

