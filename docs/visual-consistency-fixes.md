# 规划工作台视觉一致性修复方案

## 📋 问题分析

根据截图和代码审查，发现以下**样式不一致**问题：

### 1. **颜色使用不一致** ⚠️

**问题**：
- **红色使用混乱**：
  - 纯红色背景横幅（"存在阻塞项"）
  - 红色边框横幅（"必须 Must (4)"）
  - `bg-red-100` vs `bg-red-50` vs `text-red-700` 混用
- **蓝色使用不明确**：
  - 日期（"1月27日"）使用蓝色
  - 交通标签使用蓝色
  - 但蓝色应该用于什么场景？需要统一语义
- **灰色层次混乱**：
  - 按钮、卡片背景、边框使用不同的灰色
  - 缺乏统一的灰色 Token

**违反原则**：
- ❌ **"四态色彩要克制：主靠层级、描边、icon、标签，避免情绪化大红大绿"**
- ❌ **"颜色承担全部信息（必须靠层级、布局与标签系统）"**

---

### 2. **组件样式不一致** ⚠️

**问题**：
- **卡片样式**：
  - 主内容区：`hover:shadow-md`（有阴影）
  - 准备度抽屉：`Card` 默认（只有边框）
  - 证据卡片：`border rounded-lg`（只有边框）
- **按钮/标签样式**：
  - 交通标签：蓝色/灰色填充
  - 抽屉按钮：浅灰色填充
  - Badge：不同的背景色和边框组合
- **横幅样式**：
  - 纯红色背景横幅 vs 红色边框横幅
  - 两种样式混用，缺乏统一规范

**违反原则**：
- ❌ **"One system, many surfaces（一个系统，多端一致）"**

---

### 3. **信息层级不清晰** ⚠️

**问题**：
- **数字突出度不一致**：
  - 红色数字（30, 6, 20）过于突出
  - 但 Typography 层级不统一
- **日期颜色语义不清**：
  - 日期使用蓝色，与红色警告形成对比
  - 但蓝色应该用于什么场景？需要明确语义
- **间距不统一**：
  - 不同组件的间距 Token 不一致

**违反原则**：
- ❌ **"规划工作台的高信息密度仍然"轻、稳、可读""**

---

## 🎨 统一设计规范（必须执行）

### 1. **颜色 Token 统一规范**

#### GateStatus 颜色 Token（四态裁决）

```typescript
// 符合 TripNARA "克制"原则：主靠层级、描边、icon、标签
const gateStatusTokens = {
  BLOCK: {
    border: 'border-red-600',      // #dc2626（描边）
    text: 'text-red-700',          // #b91c1c（文字）
    bg: 'bg-red-50',               // #fef2f2（背景，极浅）
    icon: 'text-red-600',          // #dc2626（图标）
    // ❌ 禁止：bg-red-500（纯红色背景）
  },
  WARN: {
    border: 'border-amber-600',     // #d97706
    text: 'text-amber-700',         // #b45309
    bg: 'bg-amber-50',              // #fffbeb
    icon: 'text-amber-600',          // #d97706
  },
  PASS: {
    border: 'border-green-600',     // #16a34a
    text: 'text-green-700',          // #15803d
    bg: 'bg-green-50',               // #f0fdf4
    icon: 'text-green-600',         // #16a34a
  },
};
```

**原则**：
- ✅ **禁止纯色背景**（`bg-red-500`、`bg-yellow-500`）
- ✅ **使用极浅背景**（`bg-red-50`、`bg-amber-50`）
- ✅ **通过描边和图标传达状态**，而不是颜色

---

#### 功能颜色 Token（蓝色、灰色）

```typescript
// 蓝色：用于信息性内容（日期、链接、交通）
const infoTokens = {
  date: 'text-blue-600',           // #2563eb（日期）
  link: 'text-blue-600',           // #2563eb（链接）
  transport: 'bg-blue-50 text-blue-700 border-blue-200', // 交通标签
};

// 灰色：用于中性内容（按钮、边框、背景）
const neutralTokens = {
  buttonBg: 'bg-gray-50',          // #f9fafb（按钮背景）
  buttonBorder: 'border-gray-200',  // #e5e7eb（按钮边框）
  cardBorder: 'border-gray-200',   // #e5e7eb（卡片边框）
  cardBg: 'bg-white',               // #ffffff（卡片背景）
};
```

**原则**：
- ✅ **蓝色用于信息性内容**（日期、链接、交通）
- ✅ **灰色用于中性内容**（按钮、边框、背景）
- ✅ **避免蓝色用于警告/错误**（红色/黄色才是警告）

---

### 2. **卡片样式统一规范**

#### 卡片变体 Token

```typescript
const cardVariants = {
  // 标准卡片（主内容区）
  standard: 'border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow',
  
  // 抽屉卡片（准备度抽屉）
  drawer: 'border border-gray-200 bg-white', // 无阴影，保持轻量
  
  // 证据卡片（证据覆盖）
  evidence: 'border border-gray-200 bg-white rounded-lg', // 只有边框，无阴影
  
  // 统计卡片（阻塞项/必须项统计）
  stat: 'bg-gray-50 border border-gray-200 rounded-lg', // 浅灰背景
};
```

**原则**：
- ✅ **主内容区**：使用阴影（`shadow-sm` → `hover:shadow-md`）
- ✅ **抽屉内容**：无阴影，保持轻量
- ✅ **证据卡片**：只有边框，无阴影
- ✅ **统计卡片**：浅灰背景（`bg-gray-50`）

---

### 3. **横幅样式统一规范**

#### GateStatus 横幅 Token

```typescript
// ❌ 禁止：纯红色背景横幅
// <div className="bg-red-500 text-white">存在阻塞项</div>

// ✅ 正确：红色边框 + 浅红背景 + 红色文字
const gateStatusBanner = {
  BLOCK: 'border-l-4 border-red-600 bg-red-50 text-red-700',
  WARN: 'border-l-4 border-amber-600 bg-amber-50 text-amber-700',
  PASS: 'border-l-4 border-green-600 bg-green-50 text-green-700',
};
```

**组件实现**：

```tsx
// GateStatusBanner 组件
<div className={cn(
  'px-4 py-3 border-l-4 rounded-r',
  gateStatusTokens[status].border,
  gateStatusTokens[status].bg,
  gateStatusTokens[status].text
)}>
  <div className="flex items-center gap-2">
    <Icon className={cn('h-4 w-4', gateStatusTokens[status].iconColor)} />
    <span className="font-semibold">{message}</span>
  </div>
</div>
```

**原则**：
- ✅ **统一使用左侧边框**（`border-l-4`）
- ✅ **统一使用浅色背景**（`bg-red-50`）
- ✅ **统一使用深色文字**（`text-red-700`）
- ❌ **禁止纯色背景**（`bg-red-500`）

---

### 4. **按钮/标签样式统一规范**

#### 按钮变体 Token

```typescript
const buttonVariants = {
  // 主要操作按钮
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  
  // 次要操作按钮（抽屉中）
  secondary: 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100',
  
  // 标签按钮（交通、日期）
  tag: 'bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-1',
  
  // 关闭按钮
  ghost: 'hover:bg-gray-100',
};
```

**原则**：
- ✅ **主要操作**：蓝色（`bg-blue-600`）
- ✅ **次要操作**：灰色（`bg-gray-50`）
- ✅ **标签**：浅蓝背景（`bg-blue-50`）
- ✅ **统一圆角**：`rounded-lg`（按钮）、`rounded-full`（标签）

---

### 5. **Typography 统一规范**

#### 数字 Typography Token

```typescript
const typographyTokens = {
  // 分数（大数字）
  score: 'text-xl font-bold',              // 20px，粗体
  
  // 统计数字（中等）
  statNumber: 'text-base font-semibold',    // 16px，半粗体
  
  // 标签文字（小）
  label: 'text-xs text-gray-600',          // 12px，灰色
  
  // 日期（信息性）
  date: 'text-sm text-blue-600',          // 14px，蓝色
};
```

**原则**：
- ✅ **分数**：最大、最粗（`text-xl font-bold`）
- ✅ **统计数字**：中等、半粗（`text-base font-semibold`）
- ✅ **标签**：最小、灰色（`text-xs text-gray-600`）
- ✅ **日期**：中等、蓝色（`text-sm text-blue-600`）

---

## 🔧 必须修复的组件

### 1. **ReadinessDrawerHeader** ✅（已修复）

**当前状态**：已使用克制风格（`outline + bg-red-50`）

**无需修改**：符合规范

---

### 2. **ChecklistSection** ⚠️（需要修复）

**问题**：
- Badge 使用了 `bg-red-100`（应该使用 `bg-red-50`）
- 卡片样式不一致（应该统一）

**修复方案**：

```tsx
// 修复前
badgeClassName: 'bg-red-100 text-red-800 border-red-200',

// 修复后（符合 TripNARA 克制原则）
badgeClassName: 'bg-red-50 text-red-700 border-red-200',
```

---

### 3. **证据卡片** ⚠️（需要修复）

**问题**：
- 日期使用蓝色，但语义不明确
- 卡片样式不一致

**修复方案**：
- 统一日期颜色为蓝色（信息性内容）
- 统一卡片样式（只有边框，无阴影）

---

### 4. **统计卡片** ⚠️（需要修复）

**问题**：
- 统计卡片背景色不一致
- 数字 Typography 不统一

**修复方案**：
- 统一背景色为 `bg-gray-50`
- 统一数字 Typography 为 `text-base font-semibold`

---

## 📐 Tailwind Config 补充

### 添加统一的颜色 Token

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // GateStatus 颜色（已存在，但需要统一使用）
        gate: {
          block: {
            border: '#dc2626',    // red-600
            text: '#b91c1c',      // red-700
            bg: '#fef2f2',        // red-50
            icon: '#dc2626',      // red-600
          },
          warn: {
            border: '#d97706',    // amber-600
            text: '#b45309',      // amber-700
            bg: '#fffbeb',        // amber-50
            icon: '#d97706',      // amber-600
          },
          pass: {
            border: '#16a34a',    // green-600
            text: '#15803d',      // green-700
            bg: '#f0fdf4',        // green-50
            icon: '#16a34a',      // green-600
          },
        },
        // 信息性颜色（蓝色）
        info: {
          date: '#2563eb',        // blue-600
          link: '#2563eb',        // blue-600
          transport: {
            bg: '#eff6ff',        // blue-50
            text: '#1e40af',      // blue-800
            border: '#bfdbfe',    // blue-200
          },
        },
      },
    },
  },
};
```

---

## ✅ 验收标准

### 颜色一致性

- [ ] 所有 GateStatus 使用统一的颜色 Token（`gate.block`、`gate.warn`、`gate.pass`）
- [ ] 禁止使用纯色背景（`bg-red-500`、`bg-yellow-500`）
- [ ] 所有信息性内容（日期、链接）使用蓝色（`info.date`、`info.link`）
- [ ] 所有中性内容（按钮、边框）使用灰色（`gray-50`、`gray-200`）

### 组件一致性

- [ ] 所有卡片使用统一的样式 Token（`cardVariants`）
- [ ] 所有横幅使用统一的样式（`border-l-4 + bg-50 + text-700`）
- [ ] 所有按钮使用统一的样式 Token（`buttonVariants`）
- [ ] 所有标签使用统一的样式（`bg-blue-50 + text-blue-700`）

### 信息层级

- [ ] 所有数字使用统一的 Typography Token（`typographyTokens`）
- [ ] 所有间距使用统一的 Token（`px-4`、`pb-3`、`gap-3`）
- [ ] 信息层级清晰（核心状态 > 关键统计 > 操作按钮）

---

## 🎯 下一步行动

1. **立即修复** `ChecklistSection` 组件的 Badge 颜色
2. **统一** 证据卡片的样式
3. **统一** 统计卡片的样式
4. **添加** Tailwind Config 中的颜色 Token
5. **验收** 所有组件符合统一规范
