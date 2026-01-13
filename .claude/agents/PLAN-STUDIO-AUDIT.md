# 规划工作台页面检查报告

**检查时间**: 2024  
**检查人**: Brand Designer (视觉与品牌系统负责人)  
**检查范围**: 规划工作台相关页面、视觉系统使用、角色协作

---

## 📋 执行摘要

### ✅ 做得好的地方
1. **核心组件使用**: `PlanningWorkbenchTab.tsx` 和 `OptimizeTab.tsx` 已使用 `gate-status.ts` 工具函数
2. **组件结构**: 使用了基础 UI 组件（Card、Button、Badge、Tabs 等）
3. **功能完整**: 规划工作台功能完整，包含多个标签页

### ⚠️ 需要改进的地方
1. **硬编码状态颜色**: 多个页面使用硬编码的颜色类名
2. **Pipeline 状态显示**: `index.tsx` 中的 Pipeline 状态指示器使用硬编码颜色
3. **错误/成功提示**: 多个标签页的错误和成功提示使用硬编码颜色
4. **未使用核心组件**: 未使用 GateStatusBanner、SuggestionCard 等核心组件
5. **角色协作问题**: Agent UI Agent 未充分使用 Design System Agent 提供的组件和 Token

---

## 🔍 详细检查结果

### 1. 规划工作台主页面 (`src/pages/plan-studio/index.tsx`)

#### ❌ 问题 1: Pipeline 状态指示器硬编码颜色

**当前实现**:
```tsx
// PipelineStatusIndicator 组件
<div 
  className={`h-full transition-all ${
    riskStages > 0 ? 'bg-yellow-500' : 
    inProgressStages > 0 ? 'bg-blue-500' : 
    'bg-green-500'
  }`}
/>

// PipelineStageCard 组件
const getStatusIcon = () => {
  switch (stage.status) {
    case 'completed':
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    case 'in-progress':
      return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
    case 'risk':
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    // ...
  }
};

const getStatusBadge = () => {
  switch (stage.status) {
    case 'completed':
      return <Badge className="bg-green-50 text-green-700 border-green-200">已完成</Badge>;
    case 'in-progress':
      return <Badge className="bg-blue-50 text-blue-700 border-blue-200">进行中</Badge>;
    case 'risk':
      return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">有风险</Badge>;
    // ...
  }
};
```

**问题**:
- ❌ 硬编码颜色，未使用设计 Token
- ❌ Pipeline 状态（completed/in-progress/risk）应该映射到决策状态（ALLOW/NEED_CONFIRM/REJECT）
- ❌ 可以考虑使用 `GateStatusBanner` 组件

**改进建议**:
- 创建 Pipeline 状态到决策状态的映射
- 使用 `gate-status.ts` 工具函数
- 或创建 Pipeline 状态专用的 Token（如果与决策状态不同）

---

### 2. 规划工作台标签页 (`src/pages/plan-studio/PlanningWorkbenchTab.tsx`)

#### ✅ 做得好的地方
- ✅ 已使用 `gate-status.ts` 工具函数（`getConsolidatedDecisionStyle`）
- ✅ 综合决策状态显示使用设计 Token

#### ❌ 问题: 错误提示硬编码颜色

**当前实现**:
```tsx
<Card className="border-red-200 bg-red-50">
  <CardContent className="pt-6">
    <div className="flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-red-900">执行失败</p>
        <p className="text-sm text-red-700 mt-1">{error}</p>
      </div>
    </div>
  </CardContent>
</Card>
```

**问题**:
- ❌ 硬编码颜色（`border-red-200 bg-red-50 text-red-600 text-red-900 text-red-700`）

**改进建议**:
- 使用决策状态 Token（REJECT 状态）
- 或创建错误提示专用的 Token

---

### 3. 优化标签页 (`src/pages/plan-studio/OptimizeTab.tsx`)

#### ✅ 做得好的地方
- ✅ 已使用 `gate-status.ts` 工具函数（`getConsolidatedDecisionStyle`）
- ✅ 综合决策状态显示使用设计 Token

#### ❌ 问题 1: 错误提示硬编码颜色

**当前实现**:
```tsx
<Card className="border-red-200 bg-red-50">
  <div className="flex items-center gap-2 text-red-800">
    // ...
  </div>
</Card>

<Card className="border-red-200 bg-red-50">
  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
  <p className="text-sm font-medium text-red-900">规划工作台执行失败</p>
  <p className="text-sm text-red-700 mt-1">{workbenchError}</p>
</Card>
```

**问题**:
- ❌ 硬编码颜色

#### ❌ 问题 2: 成功提示硬编码颜色

**当前实现**:
```tsx
<Card className="border-green-200 bg-green-50">
  <CheckCircle2 className="h-5 w-5 text-green-600" />
</Card>
```

**问题**:
- ❌ 硬编码颜色

---

### 4. 找点标签页 (`src/pages/plan-studio/PlacesTab.tsx`)

#### ❌ 问题: 错误/成功提示硬编码颜色

**当前实现**:
```tsx
<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
  // 错误提示
</div>

<div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
  // 成功提示
</div>
```

**问题**:
- ❌ 硬编码颜色

---

### 5. 时间轴标签页 (`src/pages/plan-studio/ScheduleTab.tsx`)

#### ❌ 问题: 状态显示硬编码颜色

**当前实现**:
```tsx
? 'text-red-600 bg-red-50'
: 'text-yellow-600 bg-yellow-50'
: 'text-blue-600 bg-blue-50'

className={`p-2 border rounded cursor-pointer hover:bg-gray-50 ${
  ? 'border-red-200 bg-red-50'
  : 'border-yellow-200 bg-yellow-50'
  : 'border-blue-200 bg-blue-50'
}`}

className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
```

**问题**:
- ❌ 硬编码颜色
- ⚠️ 可以考虑使用决策状态 Token

---

### 6. What-If 标签页 (`src/pages/plan-studio/WhatIfTab.tsx`)

#### ❌ 问题: 错误提示硬编码颜色

**当前实现**:
```tsx
<Card className="border-red-200 bg-red-50 mt-6">
  <div className="flex items-center gap-2 text-red-800">
    // ...
  </div>
</Card>
```

**问题**:
- ❌ 硬编码颜色

---

### 7. 规划工作台侧边栏 (`src/components/plan-studio/PlanStudioSidebar.tsx`)

#### ✅ 做得好的地方
- ✅ 已使用 `gate-status.ts` 工具函数（`normalizeGateStatus`, `getGateStatusIcon`, `getGateStatusClasses`）

#### ⚠️ 需要检查
- 需要检查是否有其他硬编码颜色

---

## 🔗 角色协作分析

### 当前协作情况

#### ✅ 正确的协作
1. **Design System Agent** → **Agent UI Agent**
   - Design System Agent 提供了基础组件（Card、Button、Badge 等）
   - Agent UI Agent 使用了这些基础组件
   - `PlanningWorkbenchTab.tsx` 和 `OptimizeTab.tsx` 使用了 `gate-status.ts` 工具函数

#### ❌ 协作问题

1. **Brand Designer** → **Agent UI Agent**
   - ❌ Brand Designer 已定义设计 Token 和核心组件
   - ❌ Agent UI Agent 未充分使用这些 Token 和组件
   - ❌ 规划工作台页面仍在使用硬编码颜色（错误提示、成功提示、Pipeline 状态等）

2. **Design System Agent** → **Agent UI Agent**
   - ❌ Design System Agent 已实现核心组件（GateStatusBanner、SuggestionCard 等）
   - ❌ Agent UI Agent 未使用这些核心组件
   - ❌ 规划工作台页面未使用 GateStatusBanner 显示状态

3. **Brand Designer** → **Design System Agent**
   - ✅ 设计规范已定义
   - ✅ Token 已实现
   - ✅ 核心组件已实现

### 协作流程问题

**问题**: Agent UI Agent 在实现规划工作台页面时，没有：
1. 查看 Brand Designer 的设计规范
2. 查看 Design System Agent 提供的核心组件
3. 使用设计 Token 而是硬编码颜色（错误提示、成功提示、Pipeline 状态等）

**应该的流程**:
1. Brand Designer 定义设计规范 ✅（已完成）
2. Design System Agent 实现组件 ✅（已完成）
3. Agent UI Agent 使用组件和 Token ⚠️（部分执行，但不够充分）

---

## 📝 改进建议

### 优先级 1: 立即修复（视觉一致性）

#### 1. 创建 Pipeline 状态 Token 或映射到决策状态

**问题**: Pipeline 状态（completed/in-progress/risk）需要统一的视觉风格

**建议**: 在 `globals.css` 中添加 Pipeline 状态 Token，或映射到决策状态

```css
:root {
  /* Pipeline 状态 - completed (已完成) */
  --pipeline-completed: var(--gate-allow);
  --pipeline-completed-foreground: var(--gate-allow-foreground);
  --pipeline-completed-border: var(--gate-allow-border);
  
  /* Pipeline 状态 - in-progress (进行中) */
  --pipeline-progress: var(--gate-confirm);
  --pipeline-progress-foreground: var(--gate-confirm-foreground);
  --pipeline-progress-border: var(--gate-confirm-border);
  
  /* Pipeline 状态 - risk (有风险) */
  --pipeline-risk: var(--gate-suggest);
  --pipeline-risk-foreground: var(--gate-suggest-foreground);
  --pipeline-risk-border: var(--gate-suggest-border);
}
```

#### 2. 创建错误/成功提示 Token

**问题**: 错误和成功提示使用硬编码颜色

**建议**: 使用决策状态 Token（错误 → REJECT，成功 → ALLOW）

#### 3. 修复 Pipeline 状态指示器

**文件**: `src/pages/plan-studio/index.tsx`

```tsx
// ❌ 当前
<div className={`h-full transition-all ${
  riskStages > 0 ? 'bg-yellow-500' : 
  inProgressStages > 0 ? 'bg-blue-500' : 
  'bg-green-500'
}`} />

// ✅ 应该
import { normalizeGateStatus, getGateStatusClasses } from '@/lib/gate-status';

const getPipelineStatus = (stageStatus: string) => {
  // 映射 Pipeline 状态到决策状态
  switch (stageStatus) {
    case 'completed':
      return 'ALLOW';
    case 'in-progress':
      return 'NEED_CONFIRM';
    case 'risk':
      return 'SUGGEST_REPLACE';
    default:
      return 'REJECT';
  }
};

<div className={cn('h-full transition-all', getGateStatusClasses(getPipelineStatus(...)))} />
```

#### 4. 修复错误/成功提示

**文件**: `src/pages/plan-studio/PlanningWorkbenchTab.tsx`, `OptimizeTab.tsx`, `PlacesTab.tsx`, `WhatIfTab.tsx`

```tsx
// ❌ 当前
<Card className="border-red-200 bg-red-50">
  <AlertCircle className="w-5 h-5 text-red-600" />
  <p className="text-sm font-medium text-red-900">执行失败</p>
  <p className="text-sm text-red-700 mt-1">{error}</p>
</Card>

// ✅ 应该
import { getGateStatusClasses } from '@/lib/gate-status';

<Card className={cn('border', getGateStatusClasses('REJECT'))}>
  <AlertCircle className={cn('w-5 h-5', getGateStatusClasses('REJECT'))} />
  <p className={cn('text-sm font-medium', getGateStatusClasses('REJECT'))}>执行失败</p>
  <p className={cn('text-sm mt-1', getGateStatusClasses('REJECT'))}>{error}</p>
</Card>
```

### 优先级 2: 使用核心组件

#### 1. 在 Pipeline 状态中使用 GateStatusBanner

**当前**: 使用 Badge 显示状态
**建议**: 对于需要决策的场景，使用 GateStatusBanner

#### 2. 在错误提示中使用 GateStatusBanner

**当前**: 使用 Card 显示错误
**建议**: 使用 GateStatusBanner 统一显示错误状态

---

## 🎯 角色协作改进建议

### 1. Agent UI Agent 应该

**在实现新页面时**:
1. ✅ 先查看 Design System Agent 提供的核心组件
2. ✅ 先查看 Brand Designer 的设计 Token
3. ✅ 使用设计 Token 而不是硬编码颜色
4. ✅ 使用核心组件而不是重复实现

**在修改现有页面时**:
1. ✅ 检查是否可以使用新的核心组件
2. ✅ 检查是否可以使用设计 Token
3. ✅ 向 Design System Agent 请求新组件（如果需要）

### 2. Design System Agent 应该

**在提供组件时**:
1. ✅ 提供清晰的使用文档
2. ✅ 提供使用示例
3. ✅ 确保组件易于使用

### 3. Brand Designer 应该

**在定义规范时**:
1. ✅ 确保规范清晰明确
2. ✅ 提供可执行的代码（Token、组件规范）
3. ✅ 定期检查实现是否符合规范

---

## 📊 问题统计

| 页面/组件 | 硬编码颜色 | 未使用 Token | 未使用核心组件 | 修复状态 |
|----------|-----------|-------------|---------------|---------|
| plan-studio/index.tsx | ✅ 是 | ✅ 是 | ✅ 是 | ❌ 待修复 |
| PlanningWorkbenchTab.tsx | ✅ 是 | ⚠️ 部分 | ✅ 是 | ⚠️ 部分修复 |
| OptimizeTab.tsx | ✅ 是 | ⚠️ 部分 | ✅ 是 | ⚠️ 部分修复 |
| PlacesTab.tsx | ✅ 是 | ✅ 是 | ✅ 是 | ❌ 待修复 |
| ScheduleTab.tsx | ✅ 是 | ✅ 是 | ✅ 是 | ❌ 待修复 |
| WhatIfTab.tsx | ✅ 是 | ✅ 是 | ✅ 是 | ❌ 待修复 |
| PlanStudioSidebar.tsx | ❌ 否 | ✅ 是 | ✅ 是 | ✅ 已修复 |

---

## 🔧 具体修复方案

### 修复 1: plan-studio/index.tsx

**需要修改**:
1. PipelineStatusIndicator 使用设计 Token
2. PipelineStageCard 使用设计 Token
3. 创建 Pipeline 状态到决策状态的映射

### 修复 2: PlanningWorkbenchTab.tsx

**需要修改**:
1. 错误提示使用决策状态 Token（REJECT）

### 修复 3: OptimizeTab.tsx

**需要修改**:
1. 错误提示使用决策状态 Token（REJECT）
2. 成功提示使用决策状态 Token（ALLOW）

### 修复 4: PlacesTab.tsx

**需要修改**:
1. 错误提示使用决策状态 Token（REJECT）
2. 成功提示使用决策状态 Token（ALLOW）

### 修复 5: ScheduleTab.tsx

**需要修改**:
1. 状态显示使用决策状态 Token
2. 按钮颜色使用设计 Token

### 修复 6: WhatIfTab.tsx

**需要修改**:
1. 错误提示使用决策状态 Token（REJECT）

---

## 🚀 行动计划

### 阶段 1: 创建 Pipeline 状态 Token 或映射（立即）

1. **决定**: Pipeline 状态是否映射到决策状态，或创建独立的 Token
2. **实现**: 在 `globals.css` 中添加 Token（如果需要）
3. **创建工具函数**: `src/lib/pipeline-status.ts`（如果需要）

### 阶段 2: 修复错误/成功提示（立即）

1. **修复所有标签页的错误提示** - 使用决策状态 Token（REJECT）
2. **修复所有标签页的成功提示** - 使用决策状态 Token（ALLOW）

### 阶段 3: 修复 Pipeline 状态显示（立即）

1. **修复 PipelineStatusIndicator** - 使用设计 Token
2. **修复 PipelineStageCard** - 使用设计 Token

### 阶段 4: 考虑使用核心组件（后续）

1. **评估是否可以使用 GateStatusBanner** - 显示 Pipeline 状态
2. **评估是否可以使用 GateStatusBanner** - 显示错误状态

---

## ✅ 验收标准

修复完成后，应该满足：

- [ ] 所有规划工作台页面使用设计 Token（无硬编码颜色）
- [ ] Pipeline 状态使用统一的 Token
- [ ] 错误/成功提示使用决策状态 Token
- [ ] 代码无重复（共享工具函数）
- [ ] 视觉一致性（所有页面使用相同的 Token）

---

## 📝 总结

规划工作台相关页面存在以下主要问题：

1. **视觉系统使用不充分**: 部分页面使用设计 Token，但错误提示、成功提示、Pipeline 状态等仍使用硬编码颜色
2. **Pipeline 状态未统一**: Pipeline 状态（completed/in-progress/risk）未使用设计 Token
3. **代码重复**: 多个页面重复实现相同的错误/成功提示样式
4. **角色协作问题**: Agent UI Agent 未充分使用 Design System Agent 提供的资源

**建议立即开始修复**，确保视觉系统的一致性和可维护性。
