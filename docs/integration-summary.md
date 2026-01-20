# 体验设计组件集成总结

> 集成日期：2026-01-19
> 基于文档：experience-design-v1.0.md

---

## 已完成集成

### 1. 风险评分系统集成 ✅

#### 更新的组件
- **ApprovalCard** (`src/components/trips/ApprovalCard.tsx`)
  - 使用 `RiskScoreBadge` 替代旧的 `Badge` 组件
  - 通过 `riskLevelToScore()` 转换旧的 RiskLevel 到新的风险评分

- **ApprovalDialog** (`src/components/trips/ApprovalDialog.tsx`)
  - 使用 `RiskScoreBadge` 替代旧的 `Badge` 组件
  - 保持向后兼容

#### 更新的工具函数
- **approval.ts** (`src/utils/approval.ts`)
  - 添加 `riskLevelToScore()` 函数，将旧的 RiskLevel 转换为风险评分 (0-100)
  - 更新 `getRiskLevelColorClass()` 使用新的风险评分系统

### 2. What-If 页面集成 ✅

#### 更新的页面
- **what-if.tsx** (`src/pages/trips/what-if.tsx`)
  - 集成 `RiskScoreDisplay` 组件显示基础指标的风险评估
  - 集成 `RiskScoreBadge` 组件显示候选方案的风险等级
  - 添加 `riskLevelToScore()` 辅助函数转换字符串风险等级

#### 功能改进
- 基础指标现在显示完整的风险评分三层展示（总结→分解→详细）
- 候选方案列表使用统一的风险评分显示
- 支持风险维度分解（时间风险、完成度风险）

### 3. 组件导出索引 ✅

#### 新增文件
- **index.ts** (`src/components/ui/index.ts`)
  - 统一导出所有新的体验设计组件
  - 方便导入和使用

---

## 使用示例

### 在现有代码中使用新的风险评分组件

```tsx
// 导入组件
import { RiskScoreDisplay, RiskScoreBadge, DataCard, DecisionFunnel } from '@/components/ui';
import { riskLevelToScore } from '@/utils/approval';

// 使用 RiskScoreBadge（简要显示）
<RiskScoreBadge score={65} showLabel={true} />

// 使用 RiskScoreDisplay（完整展示）
<RiskScoreDisplay
  overallScore={65}
  dimensions={[
    {
      name: '安全风险',
      score: 40,
      description: '基于地形和天气数据',
      source: 'DEM地形数据',
      confidence: 95,
    },
  ]}
/>

// 转换旧的 RiskLevel
const score = riskLevelToScore('high'); // 返回 80

// 使用 DataCard
<DataCard
  title="路线名称"
  metrics={[
    { label: '难度', value: '中等' },
    { label: '距离', value: 10, unit: 'km' },
  ]}
  riskScore={45}
  matchScore={85}
/>

// 使用 DecisionFunnel
<DecisionFunnel
  stage="browse"
  options={[...]}
  onStageChange={(stage) => {}}
  onOptionSelect={(id) => {}}
  onConfirm={(id) => {}}
/>
```

---

## 向后兼容性

### 兼容层实现

所有旧的 `RiskLevel` 类型（'low' | 'medium' | 'high' | 'critical'）都通过 `riskLevelToScore()` 函数自动转换为新的风险评分系统：

```typescript
// 映射关系
low      → 25  (0-30 范围的中值)
medium   → 50  (46-60 范围的中值)
high     → 80  (76-90 范围的中值)
critical → 95  (91-100 范围的高值)
```

### 字符串风险等级转换

对于字符串风险等级（'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'），在 `what-if.tsx` 中实现了转换函数：

```typescript
function riskLevelToScore(riskLevel: string): number {
  const mapping: Record<string, number> = {
    'LOW': 25,
    'MEDIUM': 50,
    'HIGH': 80,
    'CRITICAL': 95,
  };
  return mapping[riskLevel] || 50;
}
```

---

## 下一步工作

### P1 优先级（重要）
1. ✅ 更新 ApprovalCard 和 ApprovalDialog 使用新的风险评分系统
2. ✅ 在 What-If 页面集成 RiskScoreDisplay 组件
3. ⏳ 在决策页面集成 DecisionFunnel 组件
4. ⏳ 在 TripPlannerAssistant 中集成 DataCard 组件

### P2 优先级（优化）
1. 在其他页面逐步替换旧的风险显示方式
2. 添加更多风险维度数据源
3. 实现数据来源标注功能
4. 实现置信度可视化

---

## 文件清单

### 新增文件
- `src/components/ui/index.ts` - 组件统一导出

### 修改文件
- `src/components/trips/ApprovalCard.tsx` - 集成 RiskScoreBadge
- `src/components/trips/ApprovalDialog.tsx` - 集成 RiskScoreBadge
- `src/utils/approval.ts` - 添加兼容层函数
- `src/pages/trips/what-if.tsx` - 集成 RiskScoreDisplay 和 RiskScoreBadge

---

*集成完成日期：2026-01-19*
