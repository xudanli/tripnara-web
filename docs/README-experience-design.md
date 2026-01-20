# 体验设计组件文档

> 基于文档：experience-design-v1.0.md
> 最后更新：2026-01-19

---

## 📚 文档索引

1. [体验设计文档 v1.0](./experience-design-v1.0.md) - 完整的设计规范
2. [匹配度评估报告](./experience-design-compliance-report.md) - 项目与设计文档的匹配度
3. [实现总结](./implementation-summary.md) - 已实现的功能
4. [集成总结](./integration-summary.md) - 组件集成情况
5. [最终集成总结](./final-integration-summary.md) - 完整的工作总结
6. [组件使用指南](./component-usage-guide.md) - 详细的使用文档

---

## 🚀 快速开始

### 查看组件演示

访问测试页面查看所有组件的实际效果：

```
http://localhost:5173/ui-test/experience-design
```

### 导入组件

```tsx
import { 
  RiskScoreDisplay, 
  RiskScoreBadge, 
  DataCard, 
  DecisionFunnel 
} from '@/components/ui';
```

### 基本使用

```tsx
// 风险评分
<RiskScoreBadge score={65} showLabel={true} />

// 数据卡片
<DataCard
  title="路线名称"
  metrics={[
    { label: '难度', value: '中等' },
    { label: '距离', value: 10, unit: 'km' },
  ]}
  riskScore={45}
  matchScore={85}
/>

// 决策漏斗
<DecisionFunnel
  stage="browse"
  options={options}
  onStageChange={(stage) => {}}
  onOptionSelect={(id) => {}}
  onConfirm={(id) => {}}
/>
```

---

## 📦 组件列表

### 1. 风险评分组件

- **RiskScoreBadge** - 简要显示风险评分
- **RiskScoreDisplay** - 完整展示风险评分（三层展示）

**文件位置：**
- `src/components/ui/risk-score-display.tsx`
- `src/lib/risk-score.ts`

### 2. 数据卡片组件

- **DataCard** - 标准化的数据展示卡片

**文件位置：**
- `src/components/ui/data-card.tsx`

### 3. 决策漏斗组件

- **DecisionFunnel** - 三层决策流程（浏览→理解→判断）

**文件位置：**
- `src/components/ui/decision-funnel.tsx`

---

## 🎨 设计系统

### 颜色系统

风险评分颜色映射（0-100）：

- **0-30**: 绿色（低风险）
- **31-45**: 浅绿-黄绿（中低风险）
- **46-60**: 黄色（中等风险）
- **61-75**: 橙黄（中高风险）
- **76-90**: 橙色（高风险）
- **91-100**: 红色（极高风险）

**CSS 变量：**
- `--risk-very-low` 到 `--risk-very-high`
- 支持浅色背景和暗色模式

### 排版系统

- 字体：Inter（默认）
- 字号：基于 Tailwind 标准
- 行高：1.2-1.6（根据文本长度）

---

## 🔧 工具函数

### 风险评分工具

```tsx
import {
  getRiskScoreLevel,
  getRiskScoreConfig,
  getRiskScoreColorClasses,
  formatRiskScore,
  getRiskScoreMeaning,
} from '@/lib/risk-score';
```

### 兼容层函数

```tsx
import { riskLevelToScore } from '@/utils/approval';

// 将旧的 RiskLevel 转换为风险评分
const score = riskLevelToScore('high'); // 返回 80
```

---

## 📖 使用示例

### 示例1：在列表中使用风险评分

```tsx
import { RiskScoreBadge } from '@/components/ui';

function RouteList({ routes }) {
  return (
    <div>
      {routes.map(route => (
        <div key={route.id}>
          <span>{route.name}</span>
          <RiskScoreBadge score={route.riskScore} />
        </div>
      ))}
    </div>
  );
}
```

### 示例2：在详情页使用完整风险展示

```tsx
import { RiskScoreDisplay } from '@/components/ui';

function RouteDetail({ route }) {
  return (
    <div>
      <h1>{route.name}</h1>
      <RiskScoreDisplay
        overallScore={route.riskScore}
        dimensions={route.riskDimensions}
      />
    </div>
  );
}
```

### 示例3：使用数据卡片展示路线选项

```tsx
import { DataCard } from '@/components/ui';

function RouteOptions({ routes }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {routes.map(route => (
        <DataCard
          key={route.id}
          title={route.name}
          metrics={[
            { label: '难度', value: route.difficulty },
            { label: '距离', value: route.distance, unit: 'km' },
          ]}
          riskScore={route.riskScore}
          matchScore={route.matchScore}
          recommended={route.recommended}
        />
      ))}
    </div>
  );
}
```

### 示例4：使用决策漏斗

```tsx
import { DecisionFunnel } from '@/components/ui';
import { useState } from 'react';

function RouteSelection() {
  const [stage, setStage] = useState('browse');
  const [selectedId, setSelectedId] = useState();

  return (
    <DecisionFunnel
      stage={stage}
      options={routeOptions}
      selectedOptionId={selectedId}
      onStageChange={setStage}
      onOptionSelect={setSelectedId}
      onConfirm={(id) => {
        console.log('Confirmed:', id);
      }}
    />
  );
}
```

---

## 🔗 相关资源

- [体验设计文档 v1.0](./experience-design-v1.0.md)
- [组件使用指南](./component-usage-guide.md)
- [测试页面](../../src/pages/UiTestExperienceDesign.tsx)

---

## 📝 更新日志

### 2026-01-19
- ✅ 实现6级风险评分颜色映射系统
- ✅ 创建风险评分可视化组件
- ✅ 创建标准化数据卡片组件
- ✅ 创建三层决策漏斗组件
- ✅ 集成到现有页面（ApprovalCard、What-If、TripPlannerAssistant）
- ✅ 创建使用指南和测试页面

---

*如有问题或建议，请查看相关文档或联系开发团队。*
