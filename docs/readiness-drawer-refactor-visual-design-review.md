# 准备度抽屉重构 PRD - 视觉设计评估报告

## 📋 评估概览

**评估人**：TripNARA Visual / Brand Designer  
**评估对象**：准备度抽屉重构 PRD  
**评估日期**：2026-01-28  
**评估结论**：✅ **整体方向正确，但需要补充视觉系统规范**

---

## ✅ 符合 TripNARA 设计哲学的部分

### 1. **Clarity over Charm（清晰优先于讨喜）** ✅

**PRD 体现**：
- 明确的信息简化目标（12+个数据点 → ≤6个）
- 聚焦核心价值：让用户快速理解问题
- 移除冗余信息（证据状态摘要、数据新鲜度）

**评估**：✅ **完全符合** TripNARA 的"清晰优先"原则。简化顶部汇总区是正确的决策。

### 2. **Decision is a UI primitive（决策是 UI 原语）** ✅

**PRD 体现**：
- 保留核心状态（BLOCK/WARN/PASS）
- 保留总体分数
- 保留关键统计（阻塞项、警告项）

**评估**：✅ **符合** 决策型应用的要求。状态和分数是决策的核心，必须保留。

### 3. **Evidence is the aesthetic（证据就是美学）** ⚠️

**PRD 体现**：
- 移除证据状态摘要（5个指标）
- 移除数据新鲜度（3个时间戳）
- 但保留 `coverageMapData` 用于核心内容区

**评估**：⚠️ **需要补充** 证据在核心内容区的呈现规范。证据信息虽然不在顶部汇总，但在 Findings 中必须清晰呈现。

---

## ⚠️ 需要补充的视觉设计规范

### 1. **GateStatus 视觉系统规范缺失**

**问题**：PRD 提到保留"核心状态（BLOCK/WARN/PASS）"，但没有定义视觉规范。

**当前实现**（从代码中看到）：
```tsx
// 状态标签使用大色块 Badge
{gateStatus === 'BLOCK' && (
  <Badge className="w-full justify-center bg-red-500 text-white py-2 text-sm font-semibold">
    <AlertCircle className="mr-2 h-4 w-4" />
    {t('dashboard.readiness.page.drawer.status.block')}
  </Badge>
)}
```

**视觉设计建议**：

#### GateStatus 视觉规范（必须补充）

**原则**：**四态裁决必须系统级一致**，符合 TripNARA 的"决策是 UI 原语"原则。

**视觉策略**：
- **避免情绪化大色块**：不使用 `bg-red-500`、`bg-yellow-500`、`bg-green-500` 这种高饱和度纯色
- **使用层级、描边、icon、标签**：通过视觉层级传达状态，而不是颜色

**推荐实现**：

```typescript
// GateStatus 视觉 Token（需要添加到 Design System）
const gateStatusTokens = {
  BLOCK: {
    border: 'border-red-500',
    text: 'text-red-700',
    bg: 'bg-red-50',
    icon: AlertCircle,
    iconColor: 'text-red-600',
  },
  WARN: {
    border: 'border-amber-500',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
  },
  PASS: {
    border: 'border-green-500',
    text: 'text-green-700',
    bg: 'bg-green-50',
    icon: CheckCircle2,
    iconColor: 'text-green-600',
  },
};
```

**组件规范**：

```tsx
// ReadinessDrawerHeader 中的状态标签应该使用：
<Badge
  variant="outline"
  className={cn(
    'w-full justify-center py-2 text-sm font-semibold',
    gateStatusTokens[gateStatus].border,
    gateStatusTokens[gateStatus].bg,
    gateStatusTokens[gateStatus].text
  )}
>
  <Icon className={cn('mr-2 h-4 w-4', gateStatusTokens[gateStatus].iconColor)} />
  {label}
</Badge>
```

**理由**：
- ✅ 符合 TripNARA 的"克制"原则（Quiet confidence）
- ✅ 避免情绪化，保持专业感
- ✅ 通过层级和描边传达状态，而不是纯色块

---

### 2. **分数圆圈视觉规范缺失**

**问题**：PRD 提到"分数圆圈（16x16，带颜色边框）"，但尺寸和颜色规范不清晰。

**当前实现**：
```tsx
<div className={cn(
  'flex-shrink-0 w-16 h-16 rounded-full flex flex-col items-center justify-center border-4',
  scoreBreakdown.score.overall < 60 
    ? 'border-red-500 text-red-600'
    : scoreBreakdown.score.overall < 80
    ? 'border-yellow-500 text-yellow-600'
    : 'border-green-500 text-green-600'
)}>
  <span className="text-xl font-bold">{scoreBreakdown.score.overall}</span>
  <span className="text-xs text-gray-400">/100</span>
</div>
```

**视觉设计建议**：

#### 分数圆圈视觉规范（必须补充）

**尺寸规范**：
- ✅ `w-16 h-16`（64px）合理，但需要确认是否与 Design System 一致
- ⚠️ `border-4`（16px）可能过粗，建议改为 `border-2`（8px）或 `border-[3px]`（12px）

**颜色规范**：
- ⚠️ 当前使用 `border-red-500`、`border-yellow-500`、`border-green-500` 过于鲜艳
- ✅ 建议使用更克制的颜色：
  - `< 60`：`border-red-600` + `bg-red-50`（背景）
  - `60-79`：`border-amber-600` + `bg-amber-50`
  - `≥ 80`：`border-green-600` + `bg-green-50`

**Typography 规范**：
- ✅ `text-xl font-bold` 合理
- ✅ `/100` 使用 `text-xs text-gray-400` 合理

**推荐实现**：

```tsx
// 分数圆圈组件规范
<div className={cn(
  'flex-shrink-0 w-16 h-16 rounded-full flex flex-col items-center justify-center border-2',
  scoreBreakdown.score.overall < 60 
    ? 'border-red-600 bg-red-50 text-red-700'
    : scoreBreakdown.score.overall < 80
    ? 'border-amber-600 bg-amber-50 text-amber-700'
    : 'border-green-600 bg-green-50 text-green-700'
)}>
  <span className="text-xl font-bold">{scoreBreakdown.score.overall}</span>
  <span className="text-xs text-gray-500">/100</span>
</div>
```

---

### 3. **统计指标视觉规范缺失**

**问题**：PRD 提到"2个关键统计指标（阻塞项数量、警告项数量）"，但没有定义布局和视觉规范。

**当前实现**（4个指标）：
```tsx
<div className="grid grid-cols-4 gap-2 text-center">
  <div className="text-xs">
    <div className="font-semibold text-red-600">{blockers}</div>
    <div className="text-gray-500">{label}</div>
  </div>
  {/* ... */}
</div>
```

**视觉设计建议**：

#### 统计指标视觉规范（必须补充）

**布局规范**：
- ✅ 从 `grid-cols-4` 改为 `grid-cols-2`（符合 PRD 的简化目标）
- ✅ `gap-2` 合理
- ✅ `text-center` 合理

**Typography 规范**：
- ✅ `text-xs` 合理（小尺寸，不抢夺主要信息）
- ✅ `font-semibold` 合理（数字突出）
- ⚠️ 颜色使用需要与 Design System 对齐

**推荐实现**：

```tsx
// 统计指标组件规范
<div className="grid grid-cols-2 gap-3 px-4 pb-3">
  <div className="text-center">
    <div className="text-base font-semibold text-red-700">
      {scoreBreakdown.summary.blockers || 0}
    </div>
    <div className="text-xs text-gray-600 mt-0.5">
      {t('dashboard.readiness.page.drawer.stats.blockers')}
    </div>
  </div>
  <div className="text-center">
    <div className="text-base font-semibold text-amber-700">
      {scoreBreakdown.summary.warnings || 0}
    </div>
    <div className="text-xs text-gray-600 mt-0.5">
      {t('dashboard.readiness.page.drawer.stats.must')}
    </div>
  </div>
</div>
```

**视觉改进**：
- ✅ 数字使用 `text-base`（比 `text-xs` 稍大，更易读）
- ✅ 标签使用 `text-gray-600`（比 `text-gray-500` 稍深，更清晰）
- ✅ 添加 `mt-0.5` 间距，提升可读性

---

### 4. **操作按钮视觉规范缺失**

**问题**：PRD 提到"1行2个按钮"，但没有定义按钮样式和布局规范。

**当前实现**（3个按钮，2行）：
```tsx
<div className="flex items-center gap-2">
  <Button variant="outline" size="sm" className="flex-1">刷新</Button>
  <Button variant="outline" size="sm" className="flex-1">获取证据</Button>
  <Button variant="ghost" size="icon"><X /></Button>
</div>
<div className="flex items-center gap-2">
  <Button variant="outline" size="sm" className="flex-1">生成打包清单</Button>
</div>
```

**视觉设计建议**：

#### 操作按钮视觉规范（必须补充）

**布局规范**：
- ✅ 1行2个按钮：`flex items-center gap-2`
- ✅ 每个按钮 `flex-1`（等宽）
- ✅ `gap-2` 合理

**按钮样式规范**：
- ✅ 使用 `variant="outline"`（符合 TripNARA 的克制风格）
- ✅ 使用 `size="sm"`（小尺寸，不抢夺主要内容）
- ⚠️ 需要定义加载状态的视觉反馈

**推荐实现**：

```tsx
// 操作按钮组件规范
<div className="flex items-center gap-2 px-4 pb-4">
  <Button
    variant="outline"
    size="sm"
    onClick={onRefresh}
    disabled={refreshing}
    className="flex-1"
  >
    {refreshing ? (
      <>
        <Spinner className="mr-2 h-4 w-4" />
        <span>刷新中...</span>
      </>
    ) : (
      <>
        <RefreshCw className="mr-2 h-4 w-4" />
        <span>刷新</span>
      </>
    )}
  </Button>
  <Button
    variant="outline"
    size="sm"
    onClick={onGeneratePackingList}
    disabled={generatingPackingList}
    className="flex-1"
  >
    {generatingPackingList ? (
      <>
        <Spinner className="mr-2 h-4 w-4" />
        <span>生成中...</span>
      </>
    ) : (
      <>
        <Package className="mr-2 h-4 w-4" />
        <span>生成打包清单</span>
      </>
    )}
  </Button>
</div>
```

**视觉改进**：
- ✅ 加载状态使用 `Spinner` 组件（符合 Design System）
- ✅ 图标使用 `lucide-react`（符合项目规范）
- ✅ 图标尺寸 `h-4 w-4`（符合 `size="sm"` 的按钮）

---

### 5. **信息层级和间距规范缺失**

**问题**：PRD 提到"简化顶部汇总区"，但没有定义信息层级和间距规范。

**视觉设计建议**：

#### 信息层级规范（必须补充）

**层级1：核心状态（最高优先级）**
- 分数圆圈 + 状态标签
- 间距：`pt-4 pb-3`（顶部内边距 16px，底部内边距 12px）

**层级2：关键统计（次要优先级）**
- 2个统计指标
- 间距：`pb-3`（底部内边距 12px）

**层级3：操作按钮（最低优先级）**
- 2个操作按钮
- 间距：`pb-4`（底部内边距 16px）

**推荐实现**：

```tsx
// ReadinessDrawerHeader 完整布局规范
<div className="flex-shrink-0 border-b border-gray-200 bg-white">
  {/* 层级1：核心状态 */}
  <div className="px-4 pt-4 pb-3">
    <div className="flex items-center gap-3">
      {/* 分数圆圈 */}
      <ScoreCircle score={scoreBreakdown?.score?.overall} />
      {/* 状态标签 */}
      <GateStatusBadge status={gateStatus} />
    </div>
  </div>

  {/* 层级2：关键统计 */}
  {scoreBreakdown?.summary && (
    <div className="px-4 pb-3">
      <StatsGrid blockers={blockers} warnings={warnings} />
    </div>
  )}

  {/* 层级3：操作按钮 */}
  <div className="px-4 pb-4">
    <ActionButtons {...actionsProps} />
  </div>
</div>
```

**间距 Token 规范**：
- `pt-4` = 16px（顶部内边距）
- `pb-3` = 12px（中间内边距）
- `pb-4` = 16px（底部内边距）
- `px-4` = 16px（水平内边距）
- `gap-3` = 12px（元素间距）

---

### 6. **组件拆分后的视觉一致性规范缺失**

**问题**：PRD 提到组件拆分（`ReadinessDrawerHeader`、`ReadinessDrawerActions`），但没有定义组件间的视觉一致性规范。

**视觉设计建议**：

#### 组件视觉一致性规范（必须补充）

**原则**：**One system, many surfaces（一个系统，多端一致）**

**Token 统一**：
- 所有组件使用相同的间距 Token（`px-4`、`pb-3`、`pb-4`）
- 所有组件使用相同的颜色 Token（`text-gray-600`、`border-gray-200`）
- 所有组件使用相同的 Typography Token（`text-xs`、`text-sm`、`font-semibold`）

**组件规范**：

```typescript
// ReadinessDrawerHeader 组件规范
interface ReadinessDrawerHeaderProps {
  scoreBreakdown: ScoreBreakdownResponse | null;
  gateStatus: GateStatus;
  readinessResult: ReadinessCheckResult | null;
}

// 视觉规范：
// - 容器：flex-shrink-0 border-b border-gray-200 bg-white
// - 内边距：px-4（水平），pt-4 pb-3 pb-4（垂直，分层）
// - 间距：gap-3（元素间距）
```

```typescript
// ReadinessDrawerActions 组件规范
interface ReadinessDrawerActionsProps {
  onRefresh: () => void;
  onGeneratePackingList: () => void;
  refreshing: boolean;
  generatingPackingList: boolean;
}

// 视觉规范：
// - 容器：flex items-center gap-2 px-4 pb-4
// - 按钮：variant="outline" size="sm" flex-1
// - 图标：h-4 w-4（lucide-react）
```

---

## 🎨 必须补充的设计 Token

### 1. **GateStatus 颜色 Token**

```typescript
// tailwind.config.js 或 CSS Variables
const gateStatusColors = {
  block: {
    border: 'border-red-600',
    text: 'text-red-700',
    bg: 'bg-red-50',
    icon: 'text-red-600',
  },
  warn: {
    border: 'border-amber-600',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    icon: 'text-amber-600',
  },
  pass: {
    border: 'border-green-600',
    text: 'text-green-700',
    bg: 'bg-green-50',
    icon: 'text-green-600',
  },
};
```

### 2. **分数圆圈颜色 Token**

```typescript
const scoreColors = {
  low: {
    border: 'border-red-600',
    bg: 'bg-red-50',
    text: 'text-red-700',
  },
  medium: {
    border: 'border-amber-600',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
  },
  high: {
    border: 'border-green-600',
    bg: 'bg-green-50',
    text: 'text-green-700',
  },
};
```

### 3. **间距 Token**

```typescript
const spacingTokens = {
  drawerPadding: 'px-4',        // 16px
  drawerPaddingTop: 'pt-4',     // 16px
  drawerPaddingBottom: 'pb-4',  // 16px
  drawerPaddingBottomSmall: 'pb-3', // 12px
  drawerGap: 'gap-3',           // 12px
  drawerGapSmall: 'gap-2',      // 8px
};
```

---

## 📐 布局规范补充

### 顶部汇总区布局规范

```
┌─────────────────────────────────────┐
│ px-4 pt-4                           │
│ ┌─────────┐ ┌───────────────────┐ │
│ │ 分数圆圈 │ │   状态标签         │ │ gap-3
│ │ 64x64px  │ │   (flex-1)        │ │
│ └─────────┘ └───────────────────┘ │
│ pb-3                               │
├─────────────────────────────────────┤
│ px-4                                │
│ ┌──────────┐ ┌──────────┐         │
│ │ 阻塞项: X │ │ 警告项: Y │         │ gap-3
│ └──────────┘ └──────────┘         │
│ pb-3                               │
├─────────────────────────────────────┤
│ px-4                                │
│ ┌──────────┐ ┌──────────┐         │
│ │   刷新    │ │ 生成打包清单 │     │ gap-2
│ └──────────┘ └──────────┘         │
│ pb-4                               │
└─────────────────────────────────────┘
```

**尺寸规范**：
- 抽屉宽度：`w-[480px]`（固定）
- 分数圆圈：`w-16 h-16`（64x64px）
- 状态标签：`flex-1`（自适应）
- 统计指标：`grid-cols-2`（2列网格）
- 操作按钮：`flex-1`（等宽）

---

## ✅ 符合设计原则的部分

### 1. **信息简化** ✅

- ✅ 从12+个数据点减少到≤6个
- ✅ 移除冗余信息（证据状态摘要、数据新鲜度）
- ✅ 聚焦核心价值（状态、分数、关键统计）

### 2. **功能聚焦** ✅

- ✅ 移除冰岛信息源（功能重复）
- ✅ 合并操作按钮（刷新 + 获取证据）
- ✅ 简化操作流程

### 3. **组件拆分** ✅

- ✅ 拆分为 `ReadinessDrawerHeader`、`ReadinessDrawerActions`、`ReadinessDrawerContent`
- ✅ 提升可维护性

---

## ⚠️ 需要改进的部分

### 1. **视觉规范缺失** ⚠️

**问题**：PRD 缺少具体的视觉设计规范（颜色、间距、Typography、组件样式）。

**建议**：补充以下内容：
- GateStatus 视觉规范（颜色、图标、Badge 样式）
- 分数圆圈视觉规范（尺寸、颜色、Typography）
- 统计指标视觉规范（布局、颜色、Typography）
- 操作按钮视觉规范（样式、加载状态）
- 信息层级和间距规范

### 2. **状态系统规范缺失** ⚠️

**问题**：PRD 提到"状态设计"，但没有定义状态系统的视觉规范。

**建议**：补充以下内容：
- 加载状态（`loading`、`refreshing`、`generatingPackingList`）的视觉反馈
- 错误状态的视觉反馈
- 空状态的视觉反馈

### 3. **动效规范缺失** ⚠️

**问题**：PRD 没有提到动效规范。

**建议**：补充以下内容：
- 抽屉打开/关闭动效（`transition-transform duration-300`）
- 加载状态的动效（`Spinner` 旋转）
- 状态切换的动效（平滑过渡）

---

## 📋 必须补充的 PRD 章节

### 建议在 PRD 中补充以下章节：

#### 0.11.1 视觉设计规范（新增）

**内容**：
- GateStatus 视觉规范（颜色、图标、Badge 样式）
- 分数圆圈视觉规范（尺寸、颜色、Typography）
- 统计指标视觉规范（布局、颜色、Typography）
- 操作按钮视觉规范（样式、加载状态）
- 信息层级和间距规范

#### 0.11.2 设计 Token 定义（新增）

**内容**：
- GateStatus 颜色 Token
- 分数圆圈颜色 Token
- 间距 Token
- Typography Token

#### 0.11.3 状态系统视觉规范（新增）

**内容**：
- 加载状态视觉反馈
- 错误状态视觉反馈
- 空状态视觉反馈

#### 0.11.4 动效规范（新增）

**内容**：
- 抽屉打开/关闭动效
- 加载状态动效
- 状态切换动效

---

## 🎯 验收标准补充（视觉层面）

### 视觉验收标准

1. **GateStatus 视觉一致性**
   - ✅ 所有 GateStatus 使用相同的颜色 Token
   - ✅ 所有 GateStatus 使用相同的图标和 Badge 样式
   - ✅ 符合 TripNARA 的"克制"原则（不使用情绪化大色块）

2. **信息层级清晰**
   - ✅ 核心状态（分数、状态标签）最显眼
   - ✅ 关键统计（阻塞项、警告项）次要显眼
   - ✅ 操作按钮最低优先级

3. **间距一致性**
   - ✅ 所有组件使用相同的间距 Token
   - ✅ 信息层级通过间距体现

4. **组件可复用性**
   - ✅ `ReadinessDrawerHeader` 可在其他页面复用
   - ✅ `ReadinessDrawerActions` 可在其他页面复用
   - ✅ 所有组件符合 Design System 规范

---

## 📝 总结

### ✅ 优点

1. **方向正确**：简化信息、聚焦核心价值，符合 TripNARA 的设计哲学
2. **结构清晰**：组件拆分合理，提升可维护性
3. **目标明确**：信息密度从12+个减少到≤6个

### ⚠️ 需要补充

1. **视觉规范缺失**：需要补充 GateStatus、分数圆圈、统计指标、操作按钮的视觉规范
2. **设计 Token 缺失**：需要定义颜色、间距、Typography Token
3. **状态系统规范缺失**：需要定义加载、错误、空状态的视觉反馈
4. **动效规范缺失**：需要定义动效语义和参数

### 🎯 建议

**立即补充**：
1. 在 PRD 中新增"0.11.1 视觉设计规范"章节
2. 在 PRD 中新增"0.11.2 设计 Token 定义"章节
3. 在 PRD 中新增"0.11.3 状态系统视觉规范"章节
4. 在 PRD 中新增"0.11.4 动效规范"章节

**实施建议**：
1. 先定义 Design Token（颜色、间距、Typography）
2. 再实现组件（使用 Token，确保一致性）
3. 最后验收（确保符合 TripNARA 设计哲学）

---

## 📎 附件：推荐的设计 Token 代码

### tailwind.config.js 补充

```javascript
// 在 tailwind.config.js 中添加
module.exports = {
  theme: {
    extend: {
      colors: {
        // GateStatus 颜色
        gate: {
          block: {
            border: '#dc2626', // red-600
            text: '#b91c1c',    // red-700
            bg: '#fef2f2',     // red-50
            icon: '#dc2626',   // red-600
          },
          warn: {
            border: '#d97706', // amber-600
            text: '#b45309',    // amber-700
            bg: '#fffbeb',     // amber-50
            icon: '#d97706',   // amber-600
          },
          pass: {
            border: '#16a34a', // green-600
            text: '#15803d',   // green-700
            bg: '#f0fdf4',     // green-50
            icon: '#16a34a',  // green-600
          },
        },
        // 分数颜色
        score: {
          low: {
            border: '#dc2626',
            bg: '#fef2f2',
            text: '#b91c1c',
          },
          medium: {
            border: '#d97706',
            bg: '#fffbeb',
            text: '#b45309',
          },
          high: {
            border: '#16a34a',
            bg: '#f0fdf4',
            text: '#15803d',
          },
        },
      },
      spacing: {
        'drawer-padding': '16px',
        'drawer-padding-small': '12px',
        'drawer-gap': '12px',
        'drawer-gap-small': '8px',
      },
    },
  },
};
```

---

**评估完成时间**：2026-01-28  
**下一步行动**：补充 PRD 中的视觉设计规范章节
