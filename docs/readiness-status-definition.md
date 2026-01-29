# 准备度状态定义规范

**文档版本**: v1.0  
**创建时间**: 2026-01-28  
**最后更新**: 2026-01-29  
**负责人**: 产品经理（Danny）

---

## 📋 一、状态定义（4个核心状态）

根据产品需求文档和API接口规范，准备度检查应包含以下**4个核心状态**：

### 1.1 阻塞项（Blocker）
- **英文标识**: `blocker`
- **中文显示**: `阻塞` / `阻塞项`
- **定义**: 必须解决的问题，否则不允许进入执行阶段
- **严重程度**: 最高
- **颜色标识**: 红色（`red`）
- **业务规则**: 存在阻塞项时，准备度状态为 `not-ready`，不允许进入执行阶段

### 1.2 必须项（Must）
- **英文标识**: `must`
- **中文显示**: `必须` / `必须项`
- **定义**: 强烈建议完成的事项，未完成会有警告，但允许进入执行阶段
- **严重程度**: 高
- **颜色标识**: 橙黄色（`amber` / `orange`）
- **业务规则**: 存在必须项时，准备度状态为 `nearly`，允许进入执行阶段但会显示警告

### 1.3 建议项（Should）
- **英文标识**: `should`
- **中文显示**: `建议` / `建议项`
- **定义**: 建议完成的事项，未完成不影响执行
- **严重程度**: 中
- **颜色标识**: 灰色（`gray`）
- **业务规则**: 不影响准备度状态判断，仅作为提示

### 1.4 可选项（Optional）
- **英文标识**: `optional`
- **中文显示**: `可选` / `可选项`
- **定义**: 可选完成的事项，不影响准备度评估
- **严重程度**: 低
- **颜色标识**: 灰色（`gray`）
- **业务规则**: 不影响准备度状态判断，仅作为参考

---

## 🎯 二、风险项（Risks）

**风险项**是独立于上述4个状态的特殊分类，用于标识潜在风险：

- **英文标识**: `risks`
- **中文显示**: `风险` / `风险项`
- **定义**: 行程中可能存在的潜在风险（天气、地形、安全等）
- **严重程度分级**: `high`（高风险）、`medium`（中风险）、`low`（低风险）
- **颜色标识**: 
  - 高风险: 红色（`red`）
  - 中风险: 橙黄色（`amber` / `orange`）
  - 低风险: 灰色（`gray`）
- **业务规则**: 风险项不影响准备度状态判断，但会影响准备度分数计算

---

## 📊 三、API接口状态字段映射

### 3.1 ReadinessCheckResult 接口（POST /readiness/check）

```typescript
interface ReadinessCheckResult {
  summary: {
    totalBlockers: number;    // ✅ 对应 blocker
    totalMust: number;         // ✅ 对应 must
    totalShould: number;       // ✅ 对应 should
    totalOptional: number;    // ✅ 对应 optional
    totalRisks?: number;       // ✅ 对应 risks（可选）
  };
  findings: ReadinessFinding[];
  risks: Risk[];
}
```

### 3.2 PersonalizedChecklistResponse 接口（GET /readiness/personalized-checklist）

```typescript
interface PersonalizedChecklistResponse {
  checklist: {
    blocker: ReadinessFindingItem[];  // ✅ 对应 blocker
    must: ReadinessFindingItem[];     // ✅ 对应 must
    should: ReadinessFindingItem[];   // ✅ 对应 should
    optional: ReadinessFindingItem[]; // ✅ 对应 optional
  };
  summary: {
    totalBlockers: number;    // ✅ 对应 blocker
    totalMust: number;        // ✅ 对应 must
    totalShould: number;      // ✅ 对应 should
    totalOptional: number;   // ✅ 对应 optional
  };
}
```

### 3.3 ScoreBreakdownResponse 接口（GET /readiness/trip/:id/score）

```typescript
interface ScoreSummary {
  blockers: number;      // ✅ 对应 blocker
  must: number;          // ✅ 对应 must（🆕 v1.7.0统一）
  should: number;        // ✅ 对应 should（🆕 v1.7.0统一）
  warnings?: number;     // ⚠️ 已废弃，值等于 must（向后兼容）
  suggestions?: number;  // ⚠️ 已废弃，值等于 should（向后兼容）
  highRisks: number;     // ✅ 对应 risks（高风险）
  mediumRisks: number;  // ✅ 对应 risks（中风险）
  lowRisks: number;      // ✅ 对应 risks（低风险）
}
```

**🆕 v1.7.0统一**: `ScoreBreakdownResponse.summary` 现在使用标准的 `must` 和 `should` 字段，同时保留 `warnings` 和 `suggestions` 以保持向后兼容。

### 3.4 ReadinessSummaryDto 接口（GET /trips/:id/insight）

```typescript
interface ReadinessSummaryDto {
  status: ReadinessStatus;
  blockers: number;      // ✅ 对应 blocker
  must: number;          // ✅ 对应 must（🆕 v1.7.0统一）
  should: number;        // ✅ 对应 should（🆕 v1.7.0统一）
  warnings?: number;     // ⚠️ 已废弃，值等于 must（向后兼容）
  suggestions?: number;  // ⚠️ 已废弃，值等于 should（向后兼容）
}
```

---

## 🔧 四、前端显示状态映射

### 4.1 统一后的实现

```typescript
// ✅ 推荐：使用新字段，同时兼容旧字段
const blockers = readinessData?.summary?.blockers ?? 0;
const must = readinessData?.summary?.must ?? 
              readinessData?.summary?.warnings ?? 0;  // 向后兼容
const should = readinessData?.summary?.should ?? 
               readinessData?.summary?.suggestions ?? 0; // 向后兼容
const optional = readinessData?.summary?.optional ?? 0;
const totalRisks = (readinessData?.summary?.highRisks ?? 0) + 
                   (readinessData?.summary?.mediumRisks ?? 0) + 
                   (readinessData?.summary?.lowRisks ?? 0);
```

### 4.2 统一的颜色标识

```typescript
// 阻塞项
const blockerColor = 'bg-red-50 text-red-700 border-red-500';

// 必须项
const mustColor = 'bg-amber-50 text-amber-700 border-amber-500';

// 建议项
const shouldColor = 'bg-gray-50 text-gray-600 border-gray-300';

// 可选项
const optionalColor = 'bg-gray-50 text-gray-600 border-gray-300';

// 风险项（根据严重程度）
const riskColors = {
  high: 'bg-red-50 text-red-700 border-red-500',
  medium: 'bg-amber-50 text-amber-700 border-amber-500',
  low: 'bg-gray-50 text-gray-600 border-gray-300',
};
```

---

## ✅ 五、统一规范

### 5.1 后端API规范

**标准字段命名**（推荐）:
- `totalBlockers` / `blockers` → 阻塞项
- `totalMust` / `must` → 必须项
- `totalShould` / `should` → 建议项
- `totalOptional` / `optional` → 可选项
- `totalRisks` / `risks` → 风险项（按严重程度分为 `highRisks`, `mediumRisks`, `lowRisks`）

**废弃字段**（向后兼容）:
- `warnings` → 应映射到 `must`（值等于 `must`）
- `suggestions` → 应映射到 `should`（值等于 `should`）

### 5.2 前端显示规范

**统一的中文显示**:
- `阻塞` / `阻塞项` → blocker
- `必须` / `必须项` → must
- `建议` / `建议项` → should
- `可选` / `可选项` → optional
- `风险` / `风险项` → risks

**统一的颜色标识**:
- 阻塞项: `bg-red-50 text-red-700` / `border-red-500`
- 必须项: `bg-amber-50 text-amber-700` / `border-amber-500`
- 建议项: `bg-gray-50 text-gray-600` / `border-gray-300`
- 可选项: `bg-gray-50 text-gray-600` / `border-gray-300`
- 风险项: 根据严重程度（high/medium/low）使用不同颜色

---

## 📝 六、已修复问题

### 6.1 后端API统一 ✅

- [x] **ScoreBreakdownResponse.summary** 已使用 `must` 和 `should`，同时保留 `warnings` 和 `suggestions`（向后兼容）
- [x] **ReadinessSummaryDto** 已使用 `must` 和 `should`，同时保留 `warnings` 和 `suggestions`（向后兼容）
- [x] **ReadinessScoreFinding.type** 支持 `must` 和 `should` 类型

### 6.2 前端代码统一 ✅

- [x] **ScheduleTab.tsx** 已使用 `must` 和 `should`，同时兼容旧字段 `warnings` 和 `suggestions`
- [x] **ReadinessPage** 已使用 `totalMust` 和 `totalShould`（来自 ReadinessCheckResult）
- [x] 添加向后兼容逻辑，支持旧字段名

### 6.3 文档统一 ✅

- [x] 更新API文档，明确状态字段命名规范
- [x] 更新Swagger文档，包含新字段说明
- [x] 创建状态映射表，供前后端开发参考

---

## 🎯 七、状态判断规则

### 7.1 准备度状态（ReadinessStatus）

```typescript
type ReadinessStatus = 'ready' | 'nearly' | 'not-ready';

// 判断规则
if (totalBlockers > 0) {
  status = 'not-ready';  // 存在阻塞项，不允许进入执行阶段
} else if (totalMust > 0 && mustCompleted < totalMust) {
  status = 'nearly';      // 存在未完成的必须项，警告但允许执行
} else {
  status = 'ready';       // 准备就绪
}
```

### 7.2 准备度分数计算

```typescript
// 分数计算权重（示例）
const SCORE_WEIGHTS = {
  BLOCKER_PENALTY: 20,      // 每个 blocker 扣 20 分
  MUST_PENALTY: 10,         // 每个 must 扣 10 分
  HIGH_RISK_PENALTY: 10,    // 每个高风险扣 10 分
  RISK_PENALTY: 5,          // 每个风险扣 5 分
};

const overallScore = Math.max(0, 100 - 
  (totalBlockers * SCORE_WEIGHTS.BLOCKER_PENALTY) - 
  (totalMust * SCORE_WEIGHTS.MUST_PENALTY) -
  (highRiskCount * SCORE_WEIGHTS.HIGH_RISK_PENALTY) - 
  (riskCount * SCORE_WEIGHTS.RISK_PENALTY)
);
```

---

## 📚 八、相关接口

### 已统一的接口

1. ✅ `POST /readiness/check` - ReadinessCheckResult（已使用标准字段）
2. ✅ `GET /readiness/personalized-checklist` - PersonalizedChecklistResponse（已使用标准字段）
3. ✅ `GET /readiness/trip/:tripId/score` - ScoreBreakdownResponse（v1.7.0已统一）
4. ✅ `GET /trips/:id/insight` - ReadinessSummaryDto（v1.7.0已统一）

---

## 🔄 九、向后兼容性

### ✅ 完全向后兼容

所有接口同时返回新旧字段：

```typescript
{
  summary: {
    blockers: 0,
    must: 2,           // 🆕 新字段
    should: 1,        // 🆕 新字段
    warnings: 2,      // ⚠️ 废弃字段（值等于 must）
    suggestions: 1,   // ⚠️ 废弃字段（值等于 should）
    highRisks: 1,
    mediumRisks: 1,
    lowRisks: 0
  }
}
```

### 前端迁移建议

```typescript
// ✅ 推荐：使用新字段，同时兼容旧字段
const must = readinessData?.summary?.must ?? 
              readinessData?.summary?.warnings ?? 0;
const should = readinessData?.summary?.should ?? 
               readinessData?.summary?.suggestions ?? 0;

// ⚠️ 不推荐：仅使用旧字段
const warnings = readinessData?.summary?.warnings;  // 已废弃
```

---

## 📝 十、变更日志

### v1.7.0 (2026-01-29)
- ✅ 统一字段命名：`warnings` → `must`，`suggestions` → `should`
- ✅ `ReadinessScoreResponse.summary` 新增 `must` 和 `should` 字段
- ✅ `ReadinessSummaryDto` 新增 `must` 和 `should` 字段
- ✅ `ReadinessScoreFinding.type` 支持 `must` 和 `should` 类型
- ✅ 保持向后兼容：保留 `warnings` 和 `suggestions` 字段（标记为废弃）
- ✅ 更新相关服务代码使用新字段名
- ✅ 更新API文档和Swagger文档

---

## ✅ 总结

准备度状态字段已成功统一：

1. ✅ **字段统一**：`warnings` → `must`，`suggestions` → `should`
2. ✅ **向后兼容**：保留旧字段，值等于新字段
3. ✅ **类型支持**：Finding类型支持 `must` 和 `should`
4. ✅ **文档更新**：API文档和Swagger已更新
5. ✅ **前端更新**：ScheduleTab.tsx 已更新，使用新字段并兼容旧字段

**下一步**：
- ⏳ 检查其他前端组件是否完全使用新字段
- ⏳ 未来版本可考虑移除废弃字段

---

**规范完成时间**: 2026-01-29  
**实施状态**: ✅ 已完成，向后兼容
