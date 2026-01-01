# Onboarding Illustrations

黑白线稿 + 酒红点睛风格的引导插画组件库。

## 设计原则

- **黑白线稿**：主体使用 `#1F2937` 灰色线条
- **酒红点睛**：关键元素使用 `#DC2626` 品牌色
- **极简风格**：线条柔和，圆角设计
- **青年感**：不卡通，保持理性专业

## 可用插画

### 1. WelcomeRouteIllustration
欢迎页路线规划插画
- 地图轮廓
- 路线轨迹
- 指南针
- 关键节点（酒红）

**使用场景**：Welcome Modal

### 2. EmptyTripsIllustration
空行程插画
- 行李箱（黑白）
- 地图（黑白）
- 加号按钮（酒红）

**使用场景**：Trips 列表为空

### 3. EmptyPlacesIllustration
空地点插画
- 搜索框（黑白）
- 地点标记（黑白）
- 搜索图标（酒红）

**使用场景**：Places Tab 为空

### 4. EmptyScheduleIllustration
空日程插画
- 时间轴（黑白）
- 日历（黑白）
- 当前日期（酒红）

**使用场景**：Schedule Tab 为空

### 5. EmptyExecuteIllustration
空执行插画
- 路线轨迹（黑白）
- 导航箭头（黑白）
- 下一步标记（酒红）

**使用场景**：Execute 页面为空

### 6. ChecklistProgressIllustration
清单进度插画
- 清单项（黑白）
- 已完成项（酒红）

**使用场景**：Checklist 组件

### 7. HealthBarIllustration
健康度插画
- 仪表盘（黑白）
- 指针（酒红）

**使用场景**：Health Bar 说明

## 使用示例

```tsx
import { EmptyTripsIllustration } from '@/components/illustrations/OnboardingIllustrations';
import EmptyState from '@/components/onboarding/EmptyState';

// 方式1：直接使用插画
<EmptyTripsIllustration size={200} />

// 方式2：通过 EmptyState 组件（推荐）
<EmptyState
  type="trips"
  title="还没有行程"
  description="创建您的第一个行程，开始规划之旅"
  actionLabel="创建行程"
  onAction={() => navigate('/trips/new')}
  demoActionLabel="查看示例"
  onDemoAction={() => createDemoTrip()}
/>
```

## 自定义颜色

```tsx
<EmptyTripsIllustration
  size={200}
  strokeColor="#374151"  // 自定义线条颜色
  highlightColor="#EF4444"  // 自定义点睛色
/>
```

## 样式调整

所有插画都支持 `className` 属性，可以添加 Tailwind 类：

```tsx
<EmptyTripsIllustration
  size={200}
  className="opacity-60 hover:opacity-100 transition-opacity"
/>
```


