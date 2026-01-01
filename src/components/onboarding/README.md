# TripNARA Onboarding System

完整的首次引导系统，包含 Welcome Modal、Checklist、Spotlight Tour 等组件。

## 组件说明

### 1. WelcomeModal
首次登录时显示的欢迎模态框，让用户选择目标体验类型：
- Steady & Safe（Abu 权重）
- Balanced（Dr.Dre 权重）
- Exploratory（Neptune 容错）

### 2. Checklist
常驻的进度卡片，显示首日 5 步：
1. Pick a style
2. Add 3 places
3. Schedule 1 day
4. Run Optimize
5. Enter Execute

### 3. SpotlightTour
聚光灯引导组件，逐点高亮并显示说明。

### 4. EmptyState
空态组件，用于各页面的空状态展示。

## 使用方式

```tsx
import { useOnboarding } from '@/hooks/useOnboarding';
import WelcomeModal from '@/components/onboarding/WelcomeModal';
import Checklist from '@/components/onboarding/Checklist';
import SpotlightTour from '@/components/onboarding/SpotlightTour';

function MyPage() {
  const { isFirstTime, showChecklist, completeWelcome, completeStep } = useOnboarding();
  
  return (
    <>
      <WelcomeModal
        open={isFirstTime}
        onComplete={completeWelcome}
      />
      {showChecklist && <Checklist completedSteps={...} />}
      <SpotlightTour steps={tourSteps} />
    </>
  );
}
```

## 引导步骤配置

每个页面的引导步骤通过 `data-tour` 属性标记目标元素：

```tsx
<div data-tour="my-target">...</div>
```

然后在 Tour 配置中引用：

```tsx
const tourSteps: TourStep[] = [
  {
    id: 'my-step',
    target: '[data-tour="my-target"]',
    title: '标题',
    description: '描述',
    position: 'bottom',
  },
];
```

## 状态管理

引导状态通过 `useOnboarding` hook 管理，自动保存到 localStorage。

