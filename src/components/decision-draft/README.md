# 决策草案组件

用于 TripNARA 可视化决策编排工具的 React 组件库。

## 组件列表

### DecisionCanvas
决策画布组件，用于可视化决策节点、证据节点和影响节点。

**Props:**
- `draftId: string` - 决策草案ID
- `userMode: 'toc' | 'expert' | 'studio'` - 用户模式
- `onNodeClick?: (nodeId: string) => void` - 节点点击回调
- `onNodeEdit?: (nodeId: string) => void` - 节点编辑回调
- `className?: string` - 自定义样式类

**使用示例:**
```tsx
import { DecisionCanvas } from '@/components/decision-draft';

<DecisionCanvas
  draftId="draft-123"
  userMode="expert"
  onNodeClick={(nodeId) => console.log('Clicked:', nodeId)}
  onNodeEdit={(nodeId) => console.log('Edit:', nodeId)}
/>
```

### DecisionNode
决策节点组件，显示决策步骤的卡片。

**Props:**
- `step: DecisionStep` - 决策步骤数据
- `userMode: UserMode` - 用户模式
- `selected?: boolean` - 是否选中
- `highlighted?: boolean` - 是否高亮
- `onClick?: () => void` - 点击回调
- `onEdit?: () => void` - 编辑回调

### EvidenceNode
证据节点组件，显示证据引用的卡片。

**Props:**
- `evidence: EvidenceRef` - 证据引用数据
- `selected?: boolean` - 是否选中
- `onClick?: () => void` - 点击回调

### ImpactNode
影响节点组件，显示影响的行程部分。

**Props:**
- `impactId: string` - 影响ID
- `title: string` - 标题
- `description?: string` - 描述
- `affectedParts: string[]` - 受影响部分列表
- `selected?: boolean` - 是否选中
- `onClick?: () => void` - 点击回调

### ExplanationPanel
解释面板组件，显示决策步骤的解释信息。

**Props:**
- `draftId: string` - 决策草案ID
- `stepId: string` - 步骤ID
- `userMode: UserMode` - 用户模式
- `open: boolean` - 是否打开
- `onClose?: () => void` - 关闭回调

**使用示例:**
```tsx
import { ExplanationPanel } from '@/components/decision-draft';

<ExplanationPanel
  draftId="draft-123"
  stepId="step-456"
  userMode="expert"
  open={isOpen}
  onClose={() => setIsOpen(false)}
/>
```

### ImpactPreview
影响预览组件，显示决策修改的影响范围。

**Props:**
- `draftId: string` - 决策草案ID
- `stepId: string` - 步骤ID
- `newValue: any` - 新值
- `open: boolean` - 是否打开
- `onClose?: () => void` - 关闭回调
- `onApply?: () => void` - 应用回调
- `onCancel?: () => void` - 取消回调

**使用示例:**
```tsx
import { ImpactPreview } from '@/components/decision-draft';

<ImpactPreview
  draftId="draft-123"
  stepId="step-456"
  newValue={{ confidence: 0.9 }}
  open={isOpen}
  onClose={() => setIsOpen(false)}
  onApply={() => {
    // 应用修改
    console.log('Applying changes...');
  }}
  onCancel={() => {
    // 取消修改
    console.log('Canceling changes...');
  }}
/>
```

## API 使用

### 用户端 API

```tsx
import { decisionDraftApi } from '@/api/decision-draft';

// 获取决策草案
const draft = await decisionDraftApi.getDecisionDraft('draft-123');

// 获取决策解释
const explanation = await decisionDraftApi.getExplanation('draft-123', 'expert');

// 修改决策步骤
const updatedStep = await decisionDraftApi.updateStep('draft-123', 'step-456', {
  confidence: 0.9,
});

// 预览影响
const impact = await decisionDraftApi.previewImpact('draft-123', {
  step_id: 'step-456',
  new_value: { confidence: 0.9 },
});
```

### 管理端 API

```tsx
import { decisionDraftAdminApi } from '@/api/decision-draft-admin';

// 生成决策草案
const draft = await decisionDraftAdminApi.generateDraft({
  plan_id: 'plan-123',
  user_mode: 'expert',
});

// 获取调试信息
const debugInfo = await decisionDraftAdminApi.getDebugInfo('draft-123');

// 批量编辑
const steps = await decisionDraftAdminApi.batchUpdateSteps('draft-123', {
  updates: [
    { step_id: 'step-1', updates: { confidence: 0.9 } },
    { step_id: 'step-2', updates: { confidence: 0.8 } },
  ],
});
```

## 用户模式

### ToC Lite模式
- 默认折叠证据节点
- 只展示5-7个关键判断
- 使用自然语言摘要
- 简化版解释面板

### Expert模式
- 全量节点展示
- 权重、置信度、证据来源全部可见
- 支持批量编辑
- 完整解释面板

### Studio模式
- 完整技术层信息展示
- LLM调用详情
- Skill调用详情
- 性能指标
- 调试工具

## 类型定义

所有类型定义都在 `@/types/decision-draft` 中：

```tsx
import type {
  DecisionDraft,
  DecisionStep,
  DecisionExplanation,
  ImpactPreviewResult,
  UserMode,
} from '@/types/decision-draft';
```

## 注意事项

1. **React Flow集成**: 当前实现使用基础的SVG和HTML/CSS。如果需要更高级的画布功能（如自动布局、力导向图等），建议集成 React Flow 库。

2. **性能优化**: 对于大量节点（>100个），建议：
   - 使用虚拟滚动
   - 实现节点懒加载
   - 优化渲染性能

3. **权限控制**: Studio模式需要相应的权限，确保API调用时包含正确的认证信息。

4. **错误处理**: 所有API调用都应该包含错误处理逻辑，使用 try-catch 或错误边界。

## 后续改进

- [ ] 集成 React Flow 实现更强大的画布功能
- [ ] 添加决策回放功能
- [ ] 添加版本对比功能
- [ ] 优化大量节点的渲染性能
- [ ] 添加节点搜索和过滤功能
- [ ] 支持自定义节点样式
