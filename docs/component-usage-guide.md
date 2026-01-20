# 体验设计组件使用指南

> 基于文档：experience-design-v1.0.md
> 更新日期：2026-01-19

---

## 目录

1. [快速开始](#快速开始)
2. [风险评分组件](#风险评分组件)
3. [数据卡片组件](#数据卡片组件)
4. [决策漏斗组件](#决策漏斗组件)
5. [最佳实践](#最佳实践)
6. [常见问题](#常见问题)

---

## 快速开始

### 安装和导入

所有组件已经集成到项目中，可以直接导入使用：

```tsx
import { 
  RiskScoreDisplay, 
  RiskScoreBadge, 
  DataCard, 
  DecisionFunnel 
} from '@/components/ui';
```

或者从具体文件导入：

```tsx
import { RiskScoreDisplay } from '@/components/ui/risk-score-display';
import { DataCard } from '@/components/ui/data-card';
import { DecisionFunnel } from '@/components/ui/decision-funnel';
```

---

## 风险评分组件

### RiskScoreBadge（简要显示）

用于在列表、卡片等位置简要显示风险评分。

```tsx
import { RiskScoreBadge } from '@/components/ui';

<RiskScoreBadge score={65} showLabel={true} />
```

**Props:**
- `score: number` - 风险评分（0-100）
- `showLabel?: boolean` - 是否显示标签（默认 true）
- `className?: string` - 自定义类名

**示例：**
```tsx
// 显示评分和标签
<RiskScoreBadge score={65} showLabel={true} />
// 输出：65% 中等风险

// 仅显示评分
<RiskScoreBadge score={65} showLabel={false} />
// 输出：65%
```

### RiskScoreDisplay（完整展示）

用于详细展示风险评分，支持三层展示（总结→分解→详细）。

```tsx
import { RiskScoreDisplay } from '@/components/ui';
import type { RiskDimension } from '@/components/ui';

const dimensions: RiskDimension[] = [
  {
    name: '安全风险',
    score: 40,
    description: '基于地形和天气数据评估',
    source: 'DEM地形数据 + 天气预报',
    confidence: 95,
  },
  {
    name: '体力风险',
    score: 60,
    description: '需要较强体力',
    source: '用户反馈',
    confidence: 85,
  },
];

<RiskScoreDisplay
  overallScore={50}
  dimensions={dimensions}
  showDetails={false}
  compact={false}
/>
```

**Props:**
- `overallScore: number` - 综合风险评分（0-100）
- `dimensions?: RiskDimension[]` - 风险维度分解（可选）
- `showDetails?: boolean` - 是否默认展开详细分析（默认 false）
- `compact?: boolean` - 紧凑模式（默认 false）
- `className?: string` - 自定义类名

**RiskDimension 接口：**
```typescript
interface RiskDimension {
  name: string;           // 维度名称
  score: number;          // 维度评分（0-100）
  description?: string;   // 描述
  source?: string;        // 数据来源
  confidence?: number;    // 置信度（0-100）
}
```

---

## 数据卡片组件

### DataCard（标准化数据卡片）

用于展示路线、选项等数据，符合体验设计文档规范。

```tsx
import { DataCard } from '@/components/ui';

<DataCard
  title="天子山核心路线"
  description="景观优美的挑战路线"
  metrics={[
    { label: '难度等级', value: '困难', highlight: true },
    { label: '景观评分', value: '5/5' },
    { label: '距离', value: 15, unit: 'km' },
    { label: '爬升', value: 1200, unit: 'm' },
  ]}
  riskScore={65}
  matchScore={75}
  recommended={false}
  actions={[
    { label: '选择', onClick: () => {}, variant: 'default' },
    { label: '查看详情', onClick: () => {}, variant: 'outline' },
  ]}
/>
```

**Props:**
- `title: string` - 卡片标题
- `description?: string` - 卡片描述（可选）
- `metrics: Metric[]` - 关键指标数组
- `riskScore?: number` - 风险评分（0-100，可选）
- `matchScore?: number` - 匹配度（0-100，可选）
- `actions?: Action[]` - 行动按钮数组（可选）
- `recommended?: boolean` - 是否推荐（默认 false）
- `className?: string` - 自定义类名

**Metric 接口：**
```typescript
interface Metric {
  label: string;      // 指标标签
  value: string | number;  // 指标值
  unit?: string;      // 单位（可选）
  highlight?: boolean; // 是否高亮（可选）
}
```

**Action 接口：**
```typescript
interface Action {
  label: string;      // 按钮文本
  onClick: () => void; // 点击回调
  variant?: 'default' | 'secondary' | 'outline'; // 按钮样式
}
```

---

## 决策漏斗组件

### DecisionFunnel（三层决策漏斗）

实现浏览→理解→判断的三层决策流程。

```tsx
import { DecisionFunnel } from '@/components/ui';
import type { DecisionOption, DecisionStage } from '@/components/ui';

const [stage, setStage] = useState<DecisionStage>('browse');
const [selectedId, setSelectedId] = useState<string>();

const options: DecisionOption[] = [
  {
    id: 'route-a',
    name: '挑战自我',
    description: '景观最优但难度最高',
    metrics: [
      { label: '难度', value: '困难(4/5)' },
      { label: '距离', value: 15, unit: 'km' },
    ],
    riskScore: 65,
    matchScore: 75,
    recommended: false,
    details: {
      whyNotPerfect: ['需要较强体力'],
      whyConsider: ['景观最优'],
      suggestions: '建议提前锻炼',
    },
  },
];

<DecisionFunnel
  stage={stage}
  options={options}
  selectedOptionId={selectedId}
  onStageChange={(stage) => setStage(stage)}
  onOptionSelect={(id) => setSelectedId(id)}
  onConfirm={(id) => console.log('Confirmed:', id)}
/>
```

**Props:**
- `stage: DecisionStage` - 当前阶段（'browse' | 'understand' | 'judge'）
- `options: DecisionOption[]` - 选项数组
- `selectedOptionId?: string` - 当前选中的选项ID
- `onStageChange?: (stage: DecisionStage) => void` - 阶段改变回调
- `onOptionSelect?: (optionId: string) => void` - 选项选择回调
- `onConfirm?: (optionId: string) => void` - 确认回调
- `className?: string` - 自定义类名

**DecisionOption 接口：**
```typescript
interface DecisionOption {
  id: string;
  name: string;
  description?: string;
  metrics: Metric[];
  riskScore?: number;
  matchScore?: number;
  recommended?: boolean;
  details?: {
    whyNotPerfect?: string[];
    whyConsider?: string[];
    suggestions?: string;
  };
}
```

**三个阶段：**

1. **浏览阶段（browse）**
   - 卡片矩阵展示多个选项
   - 中立色，无推荐标记
   - 快速扫描和初步判断

2. **理解阶段（understand）**
   - 展开详细信息页面
   - 完整的数据和分析
   - "为什么不完美？"和"但为什么推荐考虑？"的展示

3. **判断阶段（judge）**
   - 确认对话框
   - 强调关键信息
   - 风险提示
   - 反思机会

---

## 最佳实践

### 1. 风险评分的使用

```tsx
// ✅ 正确：在列表中使用 Badge
<div className="flex items-center gap-2">
  <span>路线A</span>
  <RiskScoreBadge score={65} showLabel={true} />
</div>

// ✅ 正确：在详情页使用完整展示
<RiskScoreDisplay
  overallScore={65}
  dimensions={dimensions}
/>

// ❌ 错误：不要在 Badge 中显示太多信息
<RiskScoreBadge score={65} showLabel={true} />
// 不要添加额外的文本或图标
```

### 2. 数据卡片的使用

```tsx
// ✅ 正确：指标数量适中（2-6个）
<DataCard
  metrics={[
    { label: '难度', value: '中等' },
    { label: '距离', value: 10, unit: 'km' },
    { label: '爬升', value: 600, unit: 'm' },
    { label: '用时', value: '4小时' },
  ]}
/>

// ❌ 错误：指标过多
<DataCard
  metrics={[
    // 超过6个指标会让卡片显得拥挤
  ]}
/>
```

### 3. 决策漏斗的使用

```tsx
// ✅ 正确：明确管理阶段状态
const [stage, setStage] = useState<DecisionStage>('browse');
const [selectedId, setSelectedId] = useState<string>();

// ✅ 正确：提供完整的选项信息
const options: DecisionOption[] = [
  {
    id: 'route-a',
    name: '挑战自我',
    metrics: [...],
    riskScore: 65,
    matchScore: 75,
    details: {
      whyNotPerfect: [...],
      whyConsider: [...],
    },
  },
];

// ❌ 错误：缺少必要信息
const options = [
  {
    id: 'route-a',
    name: '挑战自我',
    // 缺少 metrics、riskScore 等信息
  },
];
```

---

## 常见问题

### Q1: 如何将旧的 RiskLevel 转换为风险评分？

使用 `riskLevelToScore()` 函数：

```tsx
import { riskLevelToScore } from '@/utils/approval';

const score = riskLevelToScore('high'); // 返回 80
```

### Q2: 风险评分的6个等级是什么？

- 0-30: 低风险（绿色）
- 31-45: 中低风险（浅绿-黄绿）
- 46-60: 中等风险（黄色）
- 61-75: 中高风险（橙黄）
- 76-90: 高风险（橙色）
- 91-100: 极高风险（红色）

### Q3: 如何自定义风险评分的颜色？

风险评分的颜色由 `src/lib/risk-score.ts` 中的配置决定。如果需要自定义，可以修改 `RISK_SCORE_CONFIGS` 对象。

### Q4: DecisionFunnel 的三个阶段如何切换？

组件会自动根据 `stage` prop 显示对应的界面。你需要管理 `stage` 状态：

```tsx
const [stage, setStage] = useState<DecisionStage>('browse');

<DecisionFunnel
  stage={stage}
  onStageChange={(newStage) => setStage(newStage)}
  // ...
/>
```

### Q5: 数据卡片支持多少个指标？

建议使用 2-6 个指标。指标过多会让卡片显得拥挤，影响用户体验。

---

## 更多资源

- [体验设计文档 v1.0](./experience-design-v1.0.md)
- [实现总结](./implementation-summary.md)
- [集成总结](./integration-summary.md)
- [组件测试页面](../../src/pages/UiTestExperienceDesign.tsx)

---

*最后更新：2026-01-19*
