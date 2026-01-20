# 视觉改进体现位置详细说明

> 更新日期：2026-01-19
> 基于：visual-designer-review-report.md 和 visual-designer-fixes-summary.md

---

## 📍 修复体现的具体位置

### 1. 精确颜色值修复

#### 位置1：风险评分配置 (`src/lib/risk-score.ts`)

**修复前：**
```typescript
'very-low': {
  color: 'text-green-700',      // Tailwind 默认
  bgColor: 'bg-green-50',       // Tailwind 默认
}
```

**修复后：**
```typescript
'very-low': {
  color: 'text-[#4CAF50]',      // ✅ 文档指定精确值
  bgColor: 'bg-[#E8F5E9]',     // ✅ 文档指定精确值
  borderColor: 'border-[#C8E6C9]',
}
```

**影响范围：**
- ✅ 所有使用 `RiskScoreBadge` 的地方
- ✅ 所有使用 `RiskScoreDisplay` 的地方
- ✅ 所有通过 `getRiskScoreConfig()` 获取颜色的地方

**具体使用位置：**
1. `src/components/trips/ApprovalCard.tsx` (275-281行)
2. `src/components/trips/ApprovalDialog.tsx` (239-242行)
3. `src/pages/trips/what-if.tsx` (多处使用)
4. `src/components/ui/risk-score-display.tsx` (所有风险评分显示)

---

### 2. 推荐标记优化

#### 位置1：DataCard 组件 (`src/components/ui/data-card.tsx`)

**修复前：**
```tsx
recommended && 'ring-2 ring-green-300 bg-green-50/50'
// 视觉表现：2px 边框 + 50% 不透明度背景（较明显）
```

**修复后：**
```tsx
recommended && 'ring-1 ring-[#4CAF50]/30 bg-[#E8F5E9]/30'
// 视觉表现：1px 边框 + 30% 不透明度背景（更克制）
```

**影响范围：**
- ✅ 所有使用 `DataCard` 且标记为 `recommended` 的地方
- ✅ `src/components/trip-planner/TripPlannerAssistant.tsx` 中的对比表

**具体使用位置：**
1. `src/components/trip-planner/TripPlannerAssistant.tsx` (ComparisonContent 组件)
2. `src/pages/UiTestExperienceDesign.tsx` (测试页面)
3. `src/components/ui/decision-funnel.tsx` (浏览阶段的卡片展示)

**视觉改进：**
- 修复前：推荐标记使用 `ring-2`（2px 边框）和 `bg-green-50/50`（50% 不透明度），视觉较明显
- 修复后：使用 `ring-1`（1px 边框）和 `bg-[#E8F5E9]/30`（30% 不透明度），更符合"Clarity over Charm"原则

---

### 3. 数据来源标注强化

#### 位置1：RiskScoreDisplay 组件 (`src/components/ui/risk-score-display.tsx`)

**修复前：**
```tsx
{dimension.source && (
  <p className="text-xs text-muted-foreground/70">
    来源：{dimension.source}
  </p>
)}
// 简单的文字显示，不够突出
```

**修复后：**
```tsx
{dimension.source && (
  <div className="flex items-start gap-2 p-2 rounded bg-muted/50 border border-border/50">
    <div className="flex-1">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          数据来源
        </span>
      </div>
      <p className="text-xs font-medium text-foreground">
        {dimension.source}
      </p>
    </div>
  </div>
)}
// ✅ 独立的卡片样式，更突出，参考"研究/审计工具"风格
```

**影响范围：**
- ✅ 所有使用 `RiskScoreDisplay` 且提供 `dimensions` 的地方
- ✅ 维度展开时显示的数据来源

**具体使用位置：**
1. `src/pages/trips/what-if.tsx` (491-517行) - 基础指标的风险评估
2. `src/pages/UiTestExperienceDesign.tsx` - 测试页面展示
3. 任何使用 `RiskScoreDisplay` 并提供 `dimensions` 的页面

**视觉改进：**
- 修复前：数据来源只是简单的灰色文字
- 修复后：
  - 独立的卡片样式（`bg-muted/50 border`）
  - 清晰的标签（"数据来源"）
  - 更突出的文字（`font-medium text-foreground`）
  - 参考"研究/审计工具"的视觉风格

---

### 4. 置信度显示优化

#### 位置1：RiskScoreDisplay 组件 (`src/components/ui/risk-score-display.tsx`)

**修复前：**
```tsx
<div className="flex items-center justify-between text-xs text-muted-foreground mb-0.5">
  <span>置信度</span>
  <span>{dimension.confidence}%</span>
</div>
<div className="w-full h-1 rounded-full bg-muted overflow-hidden">
  <div className="h-full bg-primary transition-all" />
</div>
// 简单的进度条，没有颜色编码和文字说明
```

**修复后：**
```tsx
<div className="space-y-1.5">
  <div className="flex items-center justify-between">
    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      置信度
    </span>
    <span className="text-xs font-semibold text-foreground">
      {dimension.confidence}%
    </span>
  </div>
  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
    <div
      className={cn(
        'h-full transition-all',
        dimension.confidence >= 90
          ? 'bg-[#4CAF50]'      // ✅ 高置信度：绿色
          : dimension.confidence >= 75
          ? 'bg-[#FFC107]'      // ✅ 中置信度：黄色
          : 'bg-[#FF9800]'      // ✅ 低置信度：橙色
      )}
      style={{ width: `${dimension.confidence}%` }}
    />
  </div>
  <p className="text-[10px] text-muted-foreground">
    {dimension.confidence >= 90
      ? '高度可信'
      : dimension.confidence >= 75
      ? '较为可信'
      : '需要谨慎'}
  </p>
</div>
// ✅ 颜色编码 + 文字说明，更清晰
```

**影响范围：**
- ✅ 所有显示置信度的地方
- ✅ 维度展开时的置信度显示

**视觉改进：**
- 修复前：简单的进度条，没有颜色区分
- 修复后：
  - 颜色编码（高/中/低置信度）
  - 文字说明（"高度可信"/"较为可信"/"需要谨慎"）
  - 更清晰的标签和数值显示

---

### 5. 排版系统工具函数

#### 位置1：新建文件 (`src/lib/typography.ts`)

**新增内容：**
```typescript
export const typography = {
  h1: {
    className: 'text-2xl md:text-[32px] leading-[1.2] font-semibold',
    desktop: 'text-[32px]',
    mobile: 'text-2xl', // 24px
    lineHeight: 1.2,
    fontWeight: 600,
  },
  // ... 其他级别
};

export function getHeadingClass(level: 1 | 2 | 3, className?: string): string {
  // 返回符合文档规范的标题样式
}
```

**使用方式：**
```tsx
import { getHeadingClass, getBodyClass } from '@/lib/typography';

<h1 className={getHeadingClass(1)}>标题</h1>
<p className={getBodyClass()}>正文</p>
```

**影响范围：**
- ✅ 可以在任何组件中使用排版工具函数
- ✅ 确保字号、行高符合文档规范

**当前使用位置：**
- 尚未在所有组件中应用（需要逐步迁移）
- 已导出，可供使用

---

## 🎨 视觉改进的实际效果

### 1. 风险评分颜色

**使用场景1：审批卡片**
- **位置：** `src/components/trips/ApprovalCard.tsx`
- **效果：** 风险等级现在使用精确的文档颜色值，视觉更统一

**使用场景2：What-If 页面**
- **位置：** `src/pages/trips/what-if.tsx`
- **效果：** 基础指标和候选方案的风险评分使用统一的颜色系统

**使用场景3：规划助手对比表**
- **位置：** `src/components/trip-planner/TripPlannerAssistant.tsx`
- **效果：** 对比表中的选项使用 DataCard，推荐标记更克制

---

### 2. 推荐标记优化

**使用场景：对比表展示**
- **位置：** `src/components/trip-planner/TripPlannerAssistant.tsx` (ComparisonContent)
- **效果：**
  - 修复前：推荐选项有明显的绿色背景和粗边框
  - 修复后：推荐选项使用细边框和轻微背景色，更符合"Clarity over Charm"原则

**视觉对比：**
```
修复前：ring-2 ring-green-300 bg-green-50/50
        ┌─────────────────────┐
        │  ════════════════   │  ← 2px 绿色边框
        │  ████████████████   │  ← 50% 绿色背景
        │  推荐选项            │
        └─────────────────────┘

修复后：ring-1 ring-[#4CAF50]/30 bg-[#E8F5E9]/30
        ┌─────────────────────┐
        │  ─────────────────   │  ← 1px 细边框
        │  ░░░░░░░░░░░░░░░░   │  ← 30% 轻微背景
        │  推荐选项            │
        └─────────────────────┘
```

---

### 3. 数据来源标注强化

**使用场景：风险维度展开**
- **位置：** `src/components/ui/risk-score-display.tsx`
- **效果：**
  - 修复前：数据来源只是简单的灰色小字
  - 修复后：数据来源使用独立的卡片样式，有清晰的标签，更突出

**视觉对比：**
```
修复前：
┌─────────────────────────────┐
│ 安全风险    ████░ 40%       │
│ └─ 来源：DEM地形数据        │  ← 简单文字
└─────────────────────────────┘

修复后：
┌─────────────────────────────┐
│ 安全风险    ████░ 40%       │
│ ┌─────────────────────────┐ │
│ │ 数据来源                 │ │  ← 独立卡片
│ │ DEM地形数据 + 天气预报   │ │  ← 更突出
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

---

### 4. 置信度显示优化

**使用场景：风险维度详细信息**
- **位置：** `src/components/ui/risk-score-display.tsx`
- **效果：**
  - 修复前：简单的进度条，没有颜色区分
  - 修复后：颜色编码 + 文字说明，更清晰

**视觉对比：**
```
修复前：
置信度 95%
████████████████░░

修复后：
置信度 95%
████████████████░░  ← 绿色（高置信度）
高度可信            ← 文字说明
```

---

## 📊 改进影响统计

### 直接使用新组件的页面

1. **测试页面**
   - `/ui-test/experience-design` - 完整展示所有新组件

2. **审批相关**
   - `ApprovalCard` - 使用 RiskScoreBadge
   - `ApprovalDialog` - 使用 RiskScoreBadge

3. **What-If 分析**
   - `what-if.tsx` - 使用 RiskScoreDisplay 和 RiskScoreBadge

4. **规划助手**
   - `TripPlannerAssistant.tsx` - 使用 DataCard 展示对比选项

### 间接影响（通过组件系统）

- 所有未来使用这些组件的页面都会自动获得改进
- 颜色系统统一，确保视觉一致性
- 排版系统可用，确保文字规范

---

## 🔍 如何查看改进效果

### 方法1：访问测试页面

```
http://localhost:5173/ui-test/experience-design
```

这个页面展示了：
- ✅ 所有风险评分组件的使用
- ✅ 数据卡片的展示
- ✅ 决策漏斗的完整流程
- ✅ 修复后的视觉效果

### 方法2：查看实际使用页面

1. **审批流程**
   - 触发一个需要审批的操作
   - 查看 `ApprovalCard` 或 `ApprovalDialog`
   - 观察风险评分的颜色和显示

2. **What-If 分析**
   - 访问 `/dashboard/trips/what-if?tripId=xxx`
   - 查看基础指标的风险评估
   - 观察数据来源和置信度的显示

3. **规划助手**
   - 在规划工作台使用助手
   - 当助手返回对比表时
   - 观察推荐标记的视觉表现

---

## 📝 代码位置索引

### 核心组件文件

| 组件 | 文件路径 | 关键改进位置 |
|------|---------|-------------|
| RiskScoreDisplay | `src/components/ui/risk-score-display.tsx` | 200-224行（数据来源标注） |
| RiskScoreBadge | `src/components/ui/risk-score-display.tsx` | 240-276行 |
| DataCard | `src/components/ui/data-card.tsx` | 78-82行（推荐标记） |
| DecisionFunnel | `src/components/ui/decision-funnel.tsx` | 全部 |

### 工具函数文件

| 工具 | 文件路径 | 关键改进位置 |
|------|---------|-------------|
| risk-score.ts | `src/lib/risk-score.ts` | 56-117行（精确颜色值） |
| typography.ts | `src/lib/typography.ts` | 全部（新建） |

### 集成位置

| 页面/组件 | 文件路径 | 使用的新组件 |
|-----------|---------|-------------|
| ApprovalCard | `src/components/trips/ApprovalCard.tsx` | RiskScoreBadge |
| ApprovalDialog | `src/components/trips/ApprovalDialog.tsx` | RiskScoreBadge |
| What-If 页面 | `src/pages/trips/what-if.tsx` | RiskScoreDisplay, RiskScoreBadge |
| TripPlannerAssistant | `src/components/trip-planner/TripPlannerAssistant.tsx` | DataCard |

---

## 🎯 改进效果总结

### 视觉一致性 ✅

- **颜色系统**：所有风险评分使用统一的精确颜色值
- **排版系统**：提供统一的排版工具函数
- **组件风格**：所有组件遵循相同的设计原则

### 专业性提升 ✅

- **数据来源标注**：更突出，参考"研究/审计工具"风格
- **置信度显示**：颜色编码 + 文字说明，更清晰
- **推荐标记**：更克制，符合"Clarity over Charm"原则

### 用户体验 ✅

- **信息层级**：更清晰的视觉层级
- **可读性**：更好的对比度和间距
- **可信度**：数据来源和置信度更突出

---

*文档生成日期：2026-01-19*
*所有改进已体现在代码中，可以直接查看和使用*
