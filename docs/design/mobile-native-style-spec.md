# TripNARA Mobile Native App · 样式规范

> 从 `/.claude/agents/视觉设计师.md` 提取，适配 iOS / Android Native 实现。  
> 与 Web / H5 共享同一语义 Token 与裁决语言；布局可调整，语义不可改变。

---

## 1. 设计使命

TripNARA 是 **决策型旅行应用（Decision-first Travel Application）**。

移动端视觉必须传达：

- **Decision-first** — 裁决状态是一级 UI 原语
- **Trust-first** — 证据、来源、版本可追溯
- **Evidence-first** — 证据即美学，接近审计/研究工具
- **Quiet confidence** — 高级感来自精确，而非装饰

用户第一眼必须看到：

1. 当前结论
2. 计划是否可执行
3. 风险或问题是什么
4. 影响了哪些内容
5. 下一步应该做什么

### 1.1 视觉原则

| 原则 | 含义 |
|------|------|
| Clarity over Charm | 清晰优先于讨喜；禁止种草、氛围、情绪滤镜 |
| Evidence is the Aesthetic | 来源、时间、置信度、引用位置必须可见 |
| Decision is a UI Primitive | 同一 Gate 状态在 Banner / Card / Timeline / Toast 中语义一致 |
| Friction is Intentional | `NEED_CONFIRM` 必须签收式交互，禁止一键继续 |
| One System, Many Surfaces | iOS / Android / Web / H5 共享语义 Token |
| Quiet Confidence | 靠比例、字级、留白、对齐建立秩序；禁止黑金、渐变、玻璃拟态、彩色阴影 |

### 1.2 禁止倾向

- 小红书式种草 UI、大图瀑布流、旅行氛围插画
- 卡通拟人三人格（Abu / Dr.Dre / Neptune 是决策维度符号，不是聊天机器人）
- 用颜色替代状态说明、用动效替代状态解释
- 黑金高级感、多层玻璃拟态、炫技 AI 思考动画

---

## 2. 色彩系统

### 2.1 总原则

产品 UI（Layer A）仅使用两类颜色：

1. **中性色** — 页面、卡片、按钮、文字、边框、Evidence、Diff、Decision Log
2. **三种语义色** — Success / Warning / Error，**仅作反馈信号**

页面有效视觉面积中：

- 黑白灰占比 ≥ 90%
- Warning（`#946200`）单视口累计覆盖 ≤ 5%，且仅限 Icon / 极短标签字色
- 同一视口最多两种语义色；当前主状态只能有一种语义色

### 2.2 Layer A · 产品 UI Token

| 语义 | Token | Light Hex | Dark Hex | 用途 |
|------|-------|-----------|----------|------|
| 主 CTA | `primary` | `oklch(0.205 0 0)` ≈ `#2E2E2E` | `oklch(0.922 0 0)` | 主按钮、Confirm、Apply、Save |
| 主 CTA 文字 | `primaryForeground` | `oklch(0.985 0 0)` | `oklch(0.205 0 0)` | 主按钮文字 |
| 页面背景 | `background` | `oklch(1 0 0)` `#FFFFFF` | `oklch(0.145 0 0)` | 页面底 |
| 正文 | `foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | 标题、正文、链接 |
| 卡片面 | `card` | `oklch(1 0 0)` | `oklch(0.205 0 0)` | 卡片、Sheet、Panel |
| 卡片文字 | `cardForeground` | 同 `foreground` | 同 `foreground` | — |
| 辅助面 | `muted` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | Inset、次要背景 |
| 辅助文字 | `mutedForeground` | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` | 日期、数据、辅助 Icon |
| 边框 | `border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` | 卡片、分割线 |
| 通过 / 安全 | `success` | `#5E7D5B` | `#7A9976` | 状态 Icon、极小标签 |
| 需确认 | `warning` | `#946200` | `#C9A227` | 状态 Icon、10–12pt 短标签 |
| 阻断 / 危险 | `error` | `#8F3D28` | `#C46A52` | 状态 Icon、极小标签 |

**主 CTA 规则：**

- 必须使用 `primary` 近黑色，禁止绿 / 黄 / 红 / 蓝 / 紫按钮
- 禁止渐变按钮

**语义色面积预算：**

三种语义色**只能**用于：

- Toast Icon
- 状态 Icon（16×16 pt 量级）
- 必要的小型状态圆点
- 地图上的硬风险 Icon
- 极小面积系统状态反馈

**禁止**用于：

- 卡片 / Banner / Panel / Tag 背景
- 按钮背景
- Tab / 导航选中态
- 进度条填充、图表扇区、左边线色带
- 大于 Caption 字号的段落正文

### 2.3 Gate 四态映射

面始终中性，仅 Icon / 小字色表达语义：

| GateStatus | 语义色 Token | Icon（Lucide 参考） | 面 |
|------------|--------------|---------------------|-----|
| `ALLOW` | `success` | `CheckCircle2` | 中性 `card` |
| `NEED_CONFIRM` | `warning` | `TriangleAlert` | 中性 `card` |
| `SUGGEST_REPLACE` | 无彩色 | `Route` | 中性 `card` + Diff 结构 |
| `REJECT` | `error` | `ShieldX` | 中性 `card` |

```typescript
export type GateStatus =
  | 'ALLOW'
  | 'NEED_CONFIRM'
  | 'SUGGEST_REPLACE'
  | 'REJECT';

export type SemanticFeedbackTone = 'success' | 'warning' | 'error';

export const gateSemanticTone: Record<
  GateStatus,
  SemanticFeedbackTone | null
> = {
  ALLOW: 'success',
  NEED_CONFIRM: 'warning',
  SUGGEST_REPLACE: null,
  REJECT: 'error',
};
```

**各态视觉要点：**

- **ALLOW** — Success Icon + 中性正文；禁止绿色背景 / 庆祝动画
- **NEED_CONFIRM** — Warning Icon + 中性 ConfirmPanel；主确认按钮仍为黑色
- **SUGGEST_REPLACE** — 纯中性；用 A/B、Diff、数据变化表达差异；禁止蓝 / 紫 / 冰川蓝
- **REJECT** — Error Icon + 中性面；必须同时展示 Evidence 与替代方案；禁止 Shake / 闪红

**状态不得只依赖颜色**，必须同时包含：Icon、状态文字、结论、原因、影响范围、下一步动作。

### 2.4 Layer B · 品牌 / 地图（Native 白名单）

冰岛地貌三色**不得**进入 Layer A 产品组件：

| 地貌 | Hex | Native 用途 |
|------|-----|-------------|
| 苔原绿 | `#5E7D5B` | 与 `success` 同色；地图覆盖 / 通过态 |
| 冰川蓝 | `#88C0D0` | 地图轨迹、按天配色、营销插图 |
| 熔岩橙 | `#C25A3C` | 未接入产品 UI；预留地图 / 外部环境 |

Native 白名单场景：Map Tab、路线渲染、Marker、Odyssey Intake 品牌渐变、官网 WebView。

### 2.5 卡片与信息面

所有业务卡片：

```
background: card
foreground: cardForeground
border: 1px border
shadow: none（或极轻 elevation，见 §4.3）
```

产品信息 Inset 面：

```
background: muted @ 15% opacity
border: 1px border
cornerRadius: radiusLg
iconColor: mutedForeground
```

工程参考：`src/lib/semantic-ui-classes.ts`

---

## 3. 字体与排版

### 3.1 字体族

| 角色 | Web 参考 | iOS Native | Android Native |
|------|----------|------------|----------------|
| 品牌标题 | Inter Light 300 | SF Pro Display Light | Roboto Light |
| 正文 / 功能 | Inter Regular/Medium | SF Pro Text | Roboto |
| 数据 / 坐标 | JetBrains Mono | SF Mono | Roboto Mono |

- 品牌标题：`letterSpacing: 0.4em`，`textTransform: uppercase`（仅 Logo / 品牌导航）
- 正文 `lineHeight`: 1.5–1.6
- 全局 `-webkit-font-smoothing: antialiased` 等效：iOS 默认；Android 开启 `includeFontPadding: false`

### 3.2 字级 Scale（Mobile）

基于 4pt 网格，以 `@1x` 为基准（iOS pt / Android sp）：

| Token | Size | Weight | Line Height | 用途 |
|-------|------|--------|-------------|------|
| `display` | 28 | 600 | 34 | 极少用大标题 |
| `pageTitle` | 22 | 600 | 28 | 页面标题 |
| `sectionTitle` | 17 | 600 | 22 | 区块标题 |
| `cardTitle` | 15 | 600 | 20 | 卡片标题 |
| `body` | 15 | 400 | 22 | 正文 |
| `bodyMedium` | 15 | 500 | 22 | 强调正文 |
| `secondary` | 13 | 400 | 18 | 次要说明 |
| `caption` | 11 | 400 | 14 | 辅助信息 |
| `label` | 11 | 500 | 14 | 标签、Badge 文字 |
| `metric` | 20 | 700 | 24 | 分数、关键数值 |

### 3.3 Tabular Numbers

以下字段**必须**使用等宽数字（iOS: `.monospacedDigit()`；Android: `fontFeatureSettings: "tnum"`）：

- 时间、金额、公里数、海拔、温度
- 百分比、风险分数、版本号、置信度

---

## 4. 间距、圆角与 elevation

### 4.1 Spacing Scale（4pt 网格）

| Token | Value | 用途 |
|-------|-------|------|
| `space1` | 4 | 紧凑 Icon 间距 |
| `space2` | 8 | 行内元素、Chip 内边距 |
| `space3` | 12 | 卡片内小间距 |
| `space4` | 16 | 页面水平边距、卡片内边距 |
| `space5` | 20 | 区块间距 |
| `space6` | 24 | Section 间距 |
| `space8` | 32 | 大区块分隔 |
| `space10` | 40 | 页面顶/底留白 |

**Mobile 页面边距：** 水平 `16pt`；Safe Area 内再叠加系统 inset。

### 4.2 Radius

基准 `--radius: 10pt`（0.625rem）：

| Token | Value | 用途 |
|-------|-------|------|
| `radiusSm` | 6 | 小 Tag、输入框 |
| `radiusMd` | 8 | 按钮 |
| `radiusLg` | 10 | 卡片、Panel |
| `radiusXl` | 14 | Sheet、Modal |
| `radius2xl` | 18 | 大型 Bottom Sheet |
| `radiusFull` | 9999 | Pill Badge |

### 4.3 Elevation / Shadow

TripNARA 以**边框 + 留白**建立层级，阴影克制：

| Token | iOS | Android | 用途 |
|-------|-----|---------|------|
| `elevationNone` | 无 shadow | elevation 0 | 默认卡片 |
| `elevationSm` | shadowOpacity 0.04, radius 2 | elevation 1 | Hover / 轻浮起 |
| `elevationMd` | shadowOpacity 0.08, radius 4 | elevation 2 | Sheet、FAB |

禁止彩色阴影。

### 4.4 Border

- 默认：`1px`，颜色 `border`
- 强调左边线（Gate Banner）：`4px` 左边线，颜色仍为 `border`（非语义色）
- 禁止语义色描边

---

## 5. 图标系统

- 图标库：与 Web 对齐使用 Lucide 语义（Native 可映射 SF Symbols / Material Icons 等等价形）
- 默认色：`mutedForeground` 或 `foreground`
- 仅明确系统状态 Icon 可使用 `success` / `warning` / `error`
- 标准尺寸：`16pt`（状态）、`20pt`（列表）、`24pt`（导航）

```typescript
export const decisionIcons = {
  gate: 'ShieldCheck',
  evidence: 'FileSearch',
  version: 'GitCommitHorizontal',
  diff: 'GitCompareArrows',
  confirm: 'BadgeCheck',
  repair: 'Route',
  reject: 'ShieldX',
  warning: 'ShieldAlert',
  audit: 'ClipboardList',
  timeline: 'History',
} as const;
```

**三人格 Symbol 规则：**

- 同一 viewBox、stroke width、圆角语言、视觉重量
- 默认中性色；禁止动物面部、眼睛、表情、四肢、彩色填充

---

## 6. 动效系统

动效只解释状态变化，不制造智能感。

### 6.1 Motion Token

| 系统 | Duration | Easing | 用途 |
|------|----------|--------|------|
| System 1 · 即时反馈 | 100–180ms | `cubic-bezier(0.2, 0, 0, 1)` | Press、Toggle、Checkbox、小型切换 |
| System 2 · 阶段性过程 | 240–360ms | 同上 | Verifying、Repairing、Applying、Rollback |

### 6.2 场景动效

| 场景 | 动效 |
|------|------|
| Gate 结果出现 | 内容渐入，Icon 轻微 settle |
| NEED_CONFIRM | ConfirmPanel 从上下文位置展开 |
| Evidence 打开 | Bottom Sheet 平滑进入 |
| 应用建议 | Diff 收束为新版本标识 |
| 回滚 | 退回旧版本并显示结果 |
| REJECT | 静态出现，不 Shake |
| Error | 160ms Fade In |
| Success | 160ms Fade + 轻微 Scale |
| Warning | 静态出现，不闪烁 |

### 6.3 禁止

呼吸光、无限渐变、大面积 shimmer、弹簧过冲、Shake、闪红、彩纸庆祝、无意义 AI 思考动画。

### 6.4 Reduced Motion

必须尊重系统「减少动态效果」设置：关闭非必要 transition / animation。

---

## 7. 状态系统

### 7.1 AsyncDecisionState

```typescript
export type AsyncDecisionState =
  | 'IDLE'
  | 'LOADING'
  | 'BROWSING'
  | 'VERIFYING'
  | 'REPAIRING'
  | 'AWAITING_CONSENT'
  | 'DONE'
  | 'FAILED'
  | 'DEGRADED';
```

| 状态 | 视觉策略 |
|------|----------|
| IDLE / LOADING / BROWSING / VERIFYING / REPAIRING | 中性 |
| AWAITING_CONSENT | Warning Icon |
| DONE | Success Icon |
| FAILED | Error Icon |
| DEGRADED | Warning Icon |

`BROWSING` / `VERIFYING` / `REPAIRING` 不得使用蓝 / 紫进度条；通过阶段名称、Icon、步骤序号、中性进度条区分。

### 7.2 Empty / Error / Skeleton

- 专业、克制
- 禁止旅行插画、彩色空状态、大面积 Shimmer、情绪化错误插画

---

## 8. Mobile Native 适配

### 8.1 布局与密度

- 移动端信息优先级：**Current State → Important Decision → Next Action → Details**
- 可以调整布局，**不能**改变 Gate / Evidence / Version 语义
- 高信息密度页面（Planning / Execution）保持秩序：用 Section 分割、固定 Summary 区

### 8.2 Safe Area

- 所有全屏内容 respect Safe Area（刘海、Home Indicator、Dynamic Island）
- Bottom Tab Bar 高度含 Safe Area bottom inset
- Sheet / Modal 顶部 drag indicator 区域额外 `8pt`

### 8.3 Touch Target

- 最小可点击区域：**44×44 pt**（iOS HIG / Material 等效）
- 列表行可视觉紧凑，但 hit area 不得小于 44pt
- 主 CTA 高度建议 **48pt**，水平 padding `16pt`

### 8.4 导航结构

Tab Bar（语义中性，选中态用 `foreground` + 字重，禁止彩色选中）：

- Home · Itinerary · Map · Communication · More

Gate / Decision 状态出现在：

- 顶部 Status Banner
- 卡片内联条
- Timeline 节点
- Map Marker（Layer B 色仅限地图）
- Push / In-app Toast
- Bottom Sheet（Evidence / Confirm）

### 8.5 原生组件映射

| Web 组件 | iOS | Android |
|----------|-----|---------|
| Card | 自定义 View / List Row | Material Card（无 tint） |
| Button primary | `.borderedProminent` 自定义近黑 | FilledButton 近黑 |
| Drawer | `.sheet` / Bottom Sheet | ModalBottomSheet |
| Dialog | `.alert` / Sheet | AlertDialog |
| Toast | Banner / Snackbar 中性底 | Snackbar 中性底 |
| Tabs | 分段控件 / TabView | TabRow 中性 |

### 8.6 NEED_CONFIRM 签收交互

高风险确认必须使用 Native 签收模式：

- 展示确认清单（确认什么 / 为什么 / 风险 / 影响 / 不确认后果 / 替代方案 / 将生成版本）
- 主按钮 `primary` 近黑，文案明确（如「确认并应用 v3」）
- 禁止 swipe-to-confirm 替代阅读；可辅以二次确认 checkbox

### 8.7 A/B 方案对比

只允许：

- A / B 字母标识
- 中性背景、中性描边
- 标题、数据变化、结构差异

禁止：彩色背景、粗彩色左边线、蓝紫对比、红绿对比、高饱和色块。

---

## 9. 核心组件规范（Mobile）

### 9.1 GateStatusBanner

- 背景：中性 `card`
- 左边线：`4pt border`（非语义色）
- 内容：Gate Icon + 核心结论 + 影响范围 + 主要原因 + Evidence 入口 + 下一步 + 当前版本

### 9.2 SuggestionCard

- 中性卡片
- 结论 / 影响 / 收益 / 代价 / 原因 / Evidence / Diff / 操作

### 9.3 EvidenceDrawer（Bottom Sheet）

每条 Evidence 必须展示：

- Publisher、Title、Published At、Retrieved At
- Confidence、引用位置、关联决策、关联行程段、Source URL

### 9.4 ConfirmPanel

- 中性 Sheet 面
- 确认什么 / 为什么 / 风险 / 影响 / 不确认后果 / 替代方案 / 确认记录

### 9.5 DiffViewer

- 删除 / 替换 / 移动的结构化 Diff
- 时间 / 距离 / 预算 / 风险影响
- 将生成的版本号

---

## 10. Native Token 定义（参考实现）

```typescript
/** TripNARA Mobile Native Design Tokens */
export const mobileNativeTokens = {
  color: {
    light: {
      primary: '#2E2E2E',
      primaryForeground: '#FAFAFA',
      background: '#FFFFFF',
      foreground: '#1F1F1F',
      card: '#FFFFFF',
      cardForeground: '#1F1F1F',
      muted: '#F5F5F5',
      mutedForeground: '#737373',
      border: '#E8E8E8',
      success: '#5E7D5B',
      warning: '#946200',
      error: '#8F3D28',
    },
    dark: {
      primary: '#E8E8E8',
      primaryForeground: '#2E2E2E',
      background: '#1F1F1F',
      foreground: '#FAFAFA',
      card: '#2E2E2E',
      cardForeground: '#FAFAFA',
      muted: '#3A3A3A',
      mutedForeground: '#A3A3A3',
      border: 'rgba(255,255,255,0.10)',
      success: '#7A9976',
      warning: '#C9A227',
      error: '#C46A52',
    },
    map: {
      glacier: '#88C0D0',
      tundra: '#5E7D5B',
      lava: '#C25A3C',
    },
  },
  typography: {
    display: { size: 28, weight: '600', lineHeight: 34 },
    pageTitle: { size: 22, weight: '600', lineHeight: 28 },
    sectionTitle: { size: 17, weight: '600', lineHeight: 22 },
    cardTitle: { size: 15, weight: '600', lineHeight: 20 },
    body: { size: 15, weight: '400', lineHeight: 22 },
    secondary: { size: 13, weight: '400', lineHeight: 18 },
    caption: { size: 11, weight: '400', lineHeight: 14 },
    metric: { size: 20, weight: '700', lineHeight: 24 },
  },
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 },
  radius: { sm: 6, md: 8, lg: 10, xl: 14, '2xl': 18, full: 9999 },
  motion: {
    instant: { duration: 150, easing: [0.2, 0, 0, 1] },
    process: { duration: 300, easing: [0.2, 0, 0, 1] },
  },
  touch: { minTarget: 44, primaryButtonHeight: 48 },
} as const;
```

---

## 11. 工程对齐

| 资产 | 路径 |
|------|------|
| Web Design Tokens | `src/utils/design-tokens.ts` |
| 语义 UI 类名 | `src/lib/semantic-ui-classes.ts` |
| 地图专用色 | `src/lib/brand-map-colors.ts` |
| CSS 变量源 | `src/styles/globals.css` |
| 色彩 CI 规则 | `.cursor/rules/semantic-colors.mdc` |

Native 实现不得硬编码 Layer A 语义 Hex；地图可用 `brand-map-colors.ts` 常量。

---

## 12. 验收标准

### 视觉

- [ ] 3 秒内可识别当前计划状态
- [ ] 主 CTA 始终近黑色
- [ ] 所有卡片 / Banner 中性色
- [ ] Success / Warning / Error 仅 Icon 与极小字色
- [ ] Warning 单视口 ≤ 5%，无铺底 / 进度条 / 图表填充
- [ ] 无蓝色 / 紫色产品语义；冰川蓝仅限 Map Layer B
- [ ] 不通过颜色区分普通结构；不依赖颜色理解状态

### 信息

- [ ] 每个裁决有明确原因，可追溯 Evidence
- [ ] NEED_CONFIRM 有确认清单；SUGGEST_REPLACE 有 Diff；REJECT 有替代方案

### 可访问性

- [ ] 正文 / 背景 WCAG AA
- [ ] Focus / VoiceOver / TalkBack 可用
- [ ] 状态不只依赖颜色
- [ ] 支持 Reduced Motion
- [ ] Icon 有文本或 accessibility label

### Mobile Native

- [ ] Safe Area 正确
- [ ] 最小 Touch Target 44pt
- [ ] 暗色模式 Token 完整
- [ ] Gate 语义与 Web 一致

---

## 13. 核心准则（摘录）

> **清晰优先于讨喜。**  
> **证据优先于氛围。**  
> **责任优先于智能感。**  
> **黑白灰负责结构，绿黄红只负责反馈。**

---

*来源：`.claude/agents/视觉设计师.md` · 工程 Token：`src/styles/globals.css`*
