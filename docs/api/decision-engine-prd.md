# 决策引擎 API - 产品需求文档 (PRD)

## 1. 文档信息

| 项目 | 内容 |
|------|------|
| 版本 | v1.0 |
| 创建日期 | 2026-02-22 |
| 状态 | 待评审 |
| 负责人 | 产品 + 后端 |

---

## 2. 背景与目标

### 2.1 背景
- 决策引擎（三人格 Abu/Dr.Dre/Neptune）已具备生成、修复、校验等能力
- 现有接口分散在 `/decision` 下，缺乏统一入口与清晰契约
- 规划工作台、行程详情等前端需要稳定的决策能力 API

### 2.2 目标
- 提供**统一的决策引擎 API**，作为前端与决策能力的唯一对接入口
- 先实现**后端接口**，再对接前端
- 接口设计遵循 RESTful，支持 Swagger 文档

---

## 3. 接口清单

### 3.1 核心接口（P0）

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 生成计划 | POST | `/api/decision-engine/v1/generate-plan` | 根据世界状态生成行程计划 |
| 修复计划 | POST | `/api/decision-engine/v1/repair-plan` | 天气/闭馆等变化时最小改动修复 |
| 安全校验 | POST | `/api/decision-engine/v1/validate-safety` | Abu 策略校验物理安全 |
| 约束校验 | POST | `/api/decision-engine/v1/check-constraints` | 检查计划是否满足约束 |

### 3.2 增强接口（P1）

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 多方案生成 | POST | `/api/decision-engine/v1/generate-multiple-plans` | 生成 2–N 个不同权衡方案 |
| 决策解释 | POST | `/api/decision-engine/v1/explain-plan` | 返回计划的可解释 UI 数据 |

### 3.3 辅助接口（P2）

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 节奏调整 | POST | `/api/decision-engine/v1/adjust-pacing` | Dr.Dre 节奏调整 |
| 节点替换 | POST | `/api/decision-engine/v1/replace-nodes` | Neptune 节点替换 |
| 健康检查 | GET | `/api/decision-engine/v1/health` | 服务可用性检查 |

---

## 4. 接口详细设计

### 4.1 生成计划

**POST** `/api/decision-engine/v1/generate-plan`

**请求体**:
```json
{
  "tripId": "string",
  "state": {
    "context": {
      "destination": "IS",
      "startDate": "2026-01-02",
      "durationDays": 7,
      "preferences": { "pace": "moderate", "riskTolerance": "medium" }
    },
    "candidatesByDate": { "2026-01-02": [] }
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "plan": { "version": "1.0", "days": [] },
    "log": { "runId": "", "explanation": "", "strategyMix": [] }
  }
}
```

### 4.2 修复计划

**POST** `/api/decision-engine/v1/repair-plan`

**请求体**:
```json
{
  "tripId": "string",
  "state": { "..." },
  "plan": { "days": [] },
  "trigger": "weather_update"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "plan": { "..." },
    "log": { "..." },
    "triggers": [],
    "changedSlotIds": []
  }
}
```

### 4.3 安全校验

**POST** `/api/decision-engine/v1/validate-safety`

**请求体**:
```json
{
  "tripId": "string",
  "plan": { "..." },
  "worldContext": { "..." }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "allowed": true,
    "violations": [],
    "alternativeRoutes": []
  }
}
```

### 4.4 约束校验

**POST** `/api/decision-engine/v1/check-constraints`

**请求体**:
```json
{
  "state": { "..." },
  "plan": { "..." }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "feasible": true,
    "violations": [],
    "infeasibilityExplanation": null
  }
}
```

### 4.5 多方案生成

**POST** `/api/decision-engine/v1/generate-multiple-plans`

**请求体**:
```json
{
  "state": { "..." },
  "constraints": { "hard_constraints": {}, "soft_constraints": {} },
  "count": 3
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "variants": [
      { "id": "conservative", "plan": {}, "score": {}, "tradeoffs": [] }
    ],
    "log": { "..." }
  }
}
```

### 4.6 决策解释

**POST** `/api/decision-engine/v1/explain-plan`

**请求体**:
```json
{
  "plan": { "..." },
  "log": { "..." },
  "violations": []
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "summary": "string",
    "whyThisPlan": [],
    "slots": [],
    "violations": []
  }
}
```

---

## 5. 错误码

| 错误码 | 说明 |
|--------|------|
| 4001 | 参数校验失败 |
| 4002 | 行程不存在 |
| 4003 | tripId 必填 |
| 5001 | 决策引擎内部错误 |
| 5002 | 依赖服务不可用 |

---

## 6. 实现计划

| 阶段 | 内容 | 预计 |
|------|------|------|
| Phase 1 | PRD 评审、接口定稿 | 1 天 |
| Phase 2 | 后端接口实现（P0） | 2 天 |
| Phase 3 | 后端接口实现（P1） | 1 天 |
| Phase 4 | Swagger 文档、联调 | 1 天 |
| Phase 5 | 前端对接 | 待定 |

---

## 7. 实现说明

### 7.1 已实现
- **控制器**: `src/trips/decision/decision-engine.controller.ts`
- **DTO**: `src/trips/decision/dto/decision-engine-api.dto.ts`
- **路由前缀**: `/api/decision-engine/v1`（若全局有 `/api` 前缀则完整路径为 `/api/decision-engine/v1/*`）

### 7.2 前端对接

**API 客户端**：`src/api/decision-engine.ts`

```typescript
import {
  health,
  generatePlan,
  repairPlan,
  validateSafety,
  checkConstraints,
  generateMultiplePlans,
  explainPlan,
  adjustPacing,
  replaceNodes,
} from '@/api/decision-engine';

// 示例：生成计划
const res = await generatePlan({
  tripId: 'trip-123',
  state: { context: { destination: 'IS', startDate: '2026-01-02', durationDays: 7 }, candidatesByDate: {} },
});
if (res.success && res.data) {
  console.log(res.data.plan, res.data.log);
}

// 示例：决策解释
const explainRes = await explainPlan({ plan, log, violations });
if (explainRes.success && explainRes.data) {
  // 渲染 whyThisPlan、slots、violations
}
```

**注意**：请求需携带认证（若接口需登录），确保 `fetch` 的 `credentials: 'include'` 或携带 token。

### 7.3 与现有接口关系
- 新 API 封装现有 `TripDecisionEngineService`、`StrategyOrchestratorService`、`ConstraintEngineService`、`ExplainabilityService` 等
- 现有 `/decision/validate-safety` 等可保留，新 API 作为推荐入口
