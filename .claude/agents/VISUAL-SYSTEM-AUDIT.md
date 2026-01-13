# TripNARA 视觉系统检查报告

**检查时间**: 2024  
**检查人**: Brand Designer (视觉与品牌系统负责人)  
**检查范围**: 设计 Token、组件库、状态系统、三人格视觉、四态裁决系统

---

## 📋 执行摘要

### ✅ 做得好的地方
1. **基础组件库完整**: 50+ 个 shadcn/ui 组件已实现
2. **暗色模式支持**: CSS 变量系统支持主题切换
3. **字体系统**: 品牌字体（Inter Light）、技术字体（JetBrains Mono）已定义
4. **三人格图标系统**: 已有 PersonaIcons 组件和视觉标识

### ⚠️ 需要改进的地方
1. **四态裁决系统不统一**: 不同组件使用了不同的状态映射和颜色
2. **设计 Token 不完整**: 缺少决策状态专用 Token
3. **颜色系统混乱**: 存在硬编码颜色值，未统一使用 Token
4. **三人格视觉不一致**: 不同页面使用了不同的颜色方案
5. **缺少 GateStatusBanner 组件**: 核心组件未实现

---

## 🔍 详细检查结果

### 1. 设计 Token 系统

#### ✅ 现状
- **字体系统**: ✅ 已定义
  - `.font-brand`: Inter Light (300), letter-spacing 0.4em
  - `.font-mono-brand`: JetBrains Mono
  - `.font-body`: Inter Regular (400)

- **圆角系统**: ✅ 已定义
  - `--radius`: 0.625rem (基础)
  - `--radius-sm` 到 `--radius-4xl`: 基于基础值的计算

- **颜色系统**: ⚠️ **部分缺失**
  - 基础颜色: ✅ 已定义（primary, secondary, accent, destructive）
  - **决策状态颜色**: ❌ **缺失**（ALLOW / NEED_CONFIRM / SUGGEST_REPLACE / REJECT）
  - **三人格颜色**: ❌ **缺失**（Abu / Dr.Dre / Neptune）

#### ❌ 问题
1. **`src/styles/variables.css` 与 `globals.css` 重复**
   - `variables.css` 定义了旧的颜色系统（`--primary-color: #007bff`）
   - `globals.css` 使用了新的 oklch 颜色系统
   - **建议**: 删除 `variables.css` 或统一到一个文件

2. **硬编码颜色值**
   - 多处使用 `bg-green-50`, `bg-yellow-50`, `bg-red-50` 等 Tailwind 类名
   - 未使用设计 Token
   - **示例**:
     ```tsx
     // ❌ 错误: 硬编码
     className="bg-green-50 text-green-700 border-green-200"
     
     // ✅ 正确: 使用 Token
     className="bg-gate-allow text-gate-allow-foreground border-gate-allow-border"
     ```

#### 📝 改进建议

**1. 添加决策状态 Token**

在 `src/styles/globals.css` 中添加：

```css
:root {
  /* 决策状态 - ALLOW (通过) */
  --gate-allow: oklch(0.95 0.02 145); /* 淡绿色背景 */
  --gate-allow-foreground: oklch(0.35 0.15 145); /* 深绿色文字 */
  --gate-allow-border: oklch(0.85 0.05 145); /* 绿色边框 */
  
  /* 决策状态 - NEED_CONFIRM (需确认) */
  --gate-confirm: oklch(0.98 0.02 85); /* 淡黄色背景 */
  --gate-confirm-foreground: oklch(0.45 0.15 85); /* 深黄色文字 */
  --gate-confirm-border: oklch(0.90 0.05 85); /* 黄色边框 */
  
  /* 决策状态 - SUGGEST_REPLACE (建议替换) */
  --gate-suggest: oklch(0.97 0.02 280); /* 淡紫色背景 */
  --gate-suggest-foreground: oklch(0.50 0.15 280); /* 深紫色文字 */
  --gate-suggest-border: oklch(0.88 0.05 280); /* 紫色边框 */
  
  /* 决策状态 - REJECT (拒绝) */
  --gate-reject: oklch(0.95 0.02 25); /* 淡红色背景 */
  --gate-reject-foreground: oklch(0.45 0.20 25); /* 深红色文字 */
  --gate-reject-border: oklch(0.85 0.08 25); /* 红色边框 */
}

.dark {
  /* 暗色模式下的决策状态 */
  --gate-allow: oklch(0.20 0.05 145);
  --gate-allow-foreground: oklch(0.85 0.10 145);
  --gate-allow-border: oklch(0.30 0.08 145);
  
  --gate-confirm: oklch(0.25 0.05 85);
  --gate-confirm-foreground: oklch(0.90 0.10 85);
  --gate-confirm-border: oklch(0.35 0.08 85);
  
  --gate-suggest: oklch(0.22 0.05 280);
  --gate-suggest-foreground: oklch(0.88 0.10 280);
  --gate-suggest-border: oklch(0.32 0.08 280);
  
  --gate-reject: oklch(0.25 0.08 25);
  --gate-reject-foreground: oklch(0.90 0.15 25);
  --gate-reject-border: oklch(0.35 0.10 25);
}
```

**2. 添加三人格颜色 Token**

```css
:root {
  /* Abu - 安全守护者 (静谧蓝/冰川白) */
  --persona-abu: oklch(0.95 0.02 240);
  --persona-abu-foreground: oklch(0.40 0.12 240);
  --persona-abu-accent: oklch(0.60 0.15 240);
  
  /* Dr.Dre - 节奏设计师 (森林绿/柔棕) */
  --persona-dre: oklch(0.96 0.02 120);
  --persona-dre-foreground: oklch(0.38 0.12 120);
  --persona-dre-accent: oklch(0.58 0.15 120);
  
  /* Neptune - 结构修复者 (修复绿) */
  --persona-neptune: oklch(0.95 0.02 145);
  --persona-neptune-foreground: oklch(0.35 0.12 145);
  --persona-neptune-accent: oklch(0.55 0.15 145);
}
```

**3. 在 Tailwind Config 中注册 Token**

```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        'gate-allow': 'var(--gate-allow)',
        'gate-allow-foreground': 'var(--gate-allow-foreground)',
        'gate-allow-border': 'var(--gate-allow-border)',
        // ... 其他状态
        'persona-abu': 'var(--persona-abu)',
        // ... 其他三人格
      },
    },
  },
}
```

---

### 2. 四态裁决系统

#### ❌ 严重问题: 状态映射不一致

**问题 1: 状态名称不统一**

不同组件使用了不同的状态名称：

| 组件 | 使用的状态 | 应该使用的状态 |
|------|-----------|---------------|
| `PersonaCard.tsx` | `ALLOW`, `NEED_CONFIRM`, `REJECT`, `ADJUST`, `REPLACE` | ✅ 正确 |
| `PlanningWorkbenchTab.tsx` | `ALLOW`, `NEED_CONFIRM`, `REJECT` | ✅ 正确 |
| `AbuView.tsx` | `PASSED`, `WARN`, `BLOCKED` | ❌ 错误，应映射到标准状态 |
| `ReadinessDrawer.tsx` | `BLOCK`, `WARN`, `PASS` | ❌ 错误，应映射到标准状态 |
| `PlanStudioSidebar.tsx` | `BLOCK`, `WARN`, `PASS` | ❌ 错误，应映射到标准状态 |

**问题 2: 颜色使用不一致**

```tsx
// PersonaCard.tsx - 使用硬编码颜色
case 'ALLOW':
  className: 'bg-green-50 text-green-700 border-green-200'  // ❌

// PlanningWorkbenchTab.tsx - 使用硬编码颜色
case 'ALLOW':
  className: 'bg-green-50 text-green-700 border-green-200'  // ❌

// AbuView.tsx - 使用硬编码颜色
case 'PASSED':
  return 'bg-green-50 border-green-200'  // ❌
```

#### 📝 改进建议

**1. 创建统一的 GateStatus 类型和工具函数**

```typescript
// src/lib/gate-status.ts
export type GateStatus = 'ALLOW' | 'NEED_CONFIRM' | 'SUGGEST_REPLACE' | 'REJECT';

export type LegacyGateStatus = 'PASSED' | 'PASS' | 'WARN' | 'BLOCKED' | 'BLOCK';

/**
 * 将旧的状态映射到新的标准状态
 */
export function normalizeGateStatus(status: string): GateStatus {
  const upper = status.toUpperCase();
  if (upper === 'PASSED' || upper === 'PASS' || upper === 'ALLOW') {
    return 'ALLOW';
  }
  if (upper === 'WARN' || upper === 'NEED_CONFIRM') {
    return 'NEED_CONFIRM';
  }
  if (upper === 'BLOCKED' || upper === 'BLOCK' || upper === 'REJECT') {
    return 'REJECT';
  }
  if (upper === 'SUGGEST_REPLACE' || upper === 'REPLACE') {
    return 'SUGGEST_REPLACE';
  }
  return 'NEED_CONFIRM'; // 默认
}

/**
 * 获取状态样式类名
 */
export function getGateStatusClasses(status: GateStatus): string {
  switch (status) {
    case 'ALLOW':
      return 'bg-gate-allow text-gate-allow-foreground border-gate-allow-border';
    case 'NEED_CONFIRM':
      return 'bg-gate-confirm text-gate-confirm-foreground border-gate-confirm-border';
    case 'SUGGEST_REPLACE':
      return 'bg-gate-suggest text-gate-suggest-foreground border-gate-suggest-border';
    case 'REJECT':
      return 'bg-gate-reject text-gate-reject-foreground border-gate-reject-border';
  }
}

/**
 * 获取状态图标
 */
export function getGateStatusIcon(status: GateStatus) {
  switch (status) {
    case 'ALLOW':
      return CheckCircle2;
    case 'NEED_CONFIRM':
      return AlertCircle;
    case 'SUGGEST_REPLACE':
      return ArrowRight;
    case 'REJECT':
      return XCircle;
  }
}

/**
 * 获取状态标签文本
 */
export function getGateStatusLabel(status: GateStatus): string {
  switch (status) {
    case 'ALLOW':
      return '通过';
    case 'NEED_CONFIRM':
      return '需确认';
    case 'SUGGEST_REPLACE':
      return '建议替换';
    case 'REJECT':
      return '拒绝';
  }
}
```

**2. 创建 GateStatusBanner 组件**

```tsx
// src/components/ui/gate-status-banner.tsx
import { cn } from '@/lib/utils';
import { getGateStatusClasses, getGateStatusIcon, getGateStatusLabel, type GateStatus } from '@/lib/gate-status';

interface GateStatusBannerProps {
  status: GateStatus;
  message?: string;
  className?: string;
}

export function GateStatusBanner({ status, message, className }: GateStatusBannerProps) {
  const Icon = getGateStatusIcon(status);
  const label = getGateStatusLabel(status);
  const classes = getGateStatusClasses(status);
  
  return (
    <div className={cn('flex items-center gap-2 px-4 py-2 rounded-md border', classes, className)}>
      <Icon className="w-4 h-4" />
      <span className="font-medium">{label}</span>
      {message && <span className="text-sm opacity-90">{message}</span>}
    </div>
  );
}
```

---

### 3. 三人格视觉系统

#### ⚠️ 问题: 颜色使用不一致

**当前实现**:

1. **PersonaAlertsSection.tsx**:
   ```tsx
   case 'ABU':
     return {
       bg: 'bg-red-50/50 border-red-200/60',  // ❌ 使用红色
       icon: 'text-red-700',
     };
   case 'DR_DRE':
     return {
       bg: 'bg-orange-50/50 border-orange-200/60',  // ❌ 使用橙色
     };
   case 'NEPTUNE':
     return {
       bg: 'bg-green-50/50 border-green-200/60',  // ✅ 使用绿色（正确）
     };
   ```

2. **设计规范要求**:
   - **Abu**: 静谧蓝/冰川白（不是红色！）
   - **Dr.Dre**: 森林绿/柔棕（不是橙色！）
   - **Neptune**: 修复绿（✅ 正确）

#### 📝 改进建议

**1. 统一使用三人格 Token**

```tsx
// 使用 Token 替代硬编码
case 'ABU':
  return {
    bg: 'bg-persona-abu border-persona-abu-accent',
    icon: 'text-persona-abu-foreground',
  };
case 'DR_DRE':
  return {
    bg: 'bg-persona-dre border-persona-dre-accent',
    icon: 'text-persona-dre-foreground',
  };
case 'NEPTUNE':
  return {
    bg: 'bg-persona-neptune border-persona-neptune-accent',
    icon: 'text-persona-neptune-foreground',
  };
```

**2. 创建 PersonaCard 统一组件**

所有三人格卡片应使用统一的 `PersonaCard` 组件，确保视觉一致。

---

### 4. 组件库检查

#### ✅ 基础组件
- 50+ 个 shadcn/ui 组件已实现
- 组件结构符合规范（使用 `cva`, `forwardRef`）

#### ❌ 缺失的核心组件

根据设计规范，以下组件**必须实现**但**尚未实现**：

1. **GateStatusBanner** - 裁决状态条
2. **SuggestionCard** - 建议卡（结论/影响/动作/证据）
3. **EvidenceDrawer** - 证据抽屉（已有但需要检查是否符合规范）
4. **DecisionLog** - 决策日志（已有但需要检查是否符合规范）
5. **ConfirmPanel** - 确认点清单
6. **DiffViewer** - 版本差异视图

#### 📝 改进建议

**优先级 1（立即实现）**:
- `GateStatusBanner` - 四态裁决的核心组件
- `SuggestionCard` - 建议系统的核心组件

**优先级 2（近期实现）**:
- `ConfirmPanel` - NEED_CONFIRM 流程必需
- `DiffViewer` - 版本对比必需

---

### 5. 动效系统

#### ⚠️ 问题: 缺少动效规范

**现状**:
- 只有基础的 `accordion-down` 和 `accordion-up` 动画
- 缺少状态转换动效
- 缺少加载状态动效

#### 📝 改进建议

**1. 定义状态转换动效**

```css
/* src/styles/globals.css */
@keyframes gate-status-transition {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.gate-status-enter {
  animation: gate-status-transition 0.2s ease-out;
}
```

**2. 定义加载状态动效**

```css
@keyframes evidence-loading {
  0%, 100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

.evidence-loading {
  animation: evidence-loading 1.5s ease-in-out infinite;
}
```

---

## 🎯 行动计划

### 阶段 1: 紧急修复（1-2 天）

1. **统一状态系统**
   - [ ] 创建 `src/lib/gate-status.ts` 工具函数
   - [ ] 更新所有组件使用统一的状态映射
   - [ ] 添加决策状态 Token 到 `globals.css`

2. **修复三人格颜色**
   - [ ] 添加三人格颜色 Token
   - [ ] 更新 `PersonaAlertsSection.tsx` 使用正确颜色
   - [ ] 确保所有三人格相关组件使用 Token

3. **清理重复文件**
   - [ ] 删除或整合 `src/styles/variables.css`

### 阶段 2: 核心组件实现（3-5 天）

1. **实现 GateStatusBanner**
   - [ ] 创建组件文件
   - [ ] 实现所有状态变体
   - [ ] 添加动效
   - [ ] 更新所有使用硬编码状态的地方

2. **实现 SuggestionCard**
   - [ ] 创建组件文件
   - [ ] 实现证据展示
   - [ ] 实现动作按钮

### 阶段 3: 系统完善（1 周）

1. **完善动效系统**
   - [ ] 定义所有状态转换动效
   - [ ] 定义加载状态动效
   - [ ] 添加到 Tailwind config

2. **完善组件库**
   - [ ] 实现 ConfirmPanel
   - [ ] 实现 DiffViewer
   - [ ] 检查并完善 EvidenceDrawer

3. **文档和测试**
   - [ ] 更新组件文档
   - [ ] 添加使用示例
   - [ ] 视觉回归测试

---

## 📊 符合度评估

| 设计原则 | 符合度 | 说明 |
|---------|--------|------|
| Clarity over Charm | 70% | 基础组件清晰，但状态系统混乱 |
| Evidence is the aesthetic | 60% | 有证据抽屉，但缺少统一的可信呈现 |
| Decision is a UI primitive | 40% | **严重缺失** - 缺少 GateStatusBanner |
| Friction is intentional | 50% | 有 ApprovalDialog，但缺少 ConfirmPanel |
| One system, many surfaces | 80% | 组件库统一，但 Token 不完整 |
| Quiet confidence | 75% | 整体克制，但颜色使用不一致 |

**总体符合度: 62.5%** ⚠️

---

## 🔗 相关文件

- 设计规范: `.claude/agents/ Brand Designer.md`
- 组件实现: `src/components/ui/`
- 样式文件: `src/styles/globals.css`
- Tailwind 配置: `tailwind.config.js`

---

## 📝 总结

项目的基础组件库已经建立，但**核心的决策状态系统和三人格视觉系统需要立即统一和修复**。主要问题是：

1. **状态映射不一致** - 需要统一到标准四态
2. **颜色 Token 缺失** - 需要添加决策状态和三人格 Token
3. **核心组件缺失** - GateStatusBanner 和 SuggestionCard 必须实现
4. **硬编码颜色** - 需要全部替换为 Token

建议**立即开始阶段 1 的修复工作**，确保视觉系统的一致性和可维护性。
