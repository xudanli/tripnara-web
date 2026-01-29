# 证据状态更新功能集成指南

## 📋 概述

本文档说明如何将证据状态更新功能集成到现有组件中。

---

## ✅ 已完成的组件

### 1. EvidenceListItem 组件 ✅

**文件**：`src/components/readiness/EvidenceListItem.tsx`

**功能**：
- ✅ 状态显示和切换
- ✅ 用户备注输入
- ✅ API 集成
- ✅ 权限检查

**Props**：
```typescript
interface EvidenceListItemProps {
  evidence: EvidenceItem;
  tripId: string; // 必需
  userRole?: CollaboratorRole | null; // 🆕 用户角色（用于权限检查）
  onRefresh?: (evidenceId: string) => void;
  onOpen?: (evidenceId: string) => void;
  onStatusChange?: (evidenceId: string, status: EvidenceStatus, userNote?: string) => void; // 🆕
}
```

**使用示例**：
```tsx
import EvidenceListItem from '@/components/readiness/EvidenceListItem';
import { useTripPermissions } from '@/hooks';

function EvidenceList({ evidenceList, tripId }: Props) {
  const { role } = useTripPermissions({ tripId });

  return (
    <div className="space-y-2">
      {evidenceList.map(evidence => (
        <EvidenceListItem
          key={evidence.id}
          evidence={evidence}
          tripId={tripId}
          userRole={role}
          onStatusChange={(id, status, note) => {
            console.log('状态已更新:', id, status, note);
            // 刷新列表
          }}
        />
      ))}
    </div>
  );
}
```

---

### 2. EvidenceBatchActions 组件 ✅

**文件**：`src/components/readiness/EvidenceBatchActions.tsx`

**功能**：
- ✅ 多选功能
- ✅ 批量状态更新
- ✅ 权限检查

**Props**：
```typescript
interface EvidenceBatchActionsProps {
  evidenceList: EvidenceItem[];
  tripId: string;
  userRole?: CollaboratorRole | null; // 🆕 用户角色（用于权限检查）
  onUpdate?: () => void;
}
```

**使用示例**：
```tsx
import EvidenceBatchActions from '@/components/readiness/EvidenceBatchActions';
import { useTripPermissions } from '@/hooks';

function EvidenceList({ evidenceList, tripId }: Props) {
  const { role } = useTripPermissions({ tripId });

  return (
    <div className="space-y-3">
      <EvidenceBatchActions
        evidenceList={evidenceList}
        tripId={tripId}
        userRole={role}
        onUpdate={() => {
          // 刷新列表
        }}
      />
      {/* 证据列表 */}
    </div>
  );
}
```

---

## 🔧 工具函数

### 1. 权限检查工具 ✅

**文件**：`src/utils/trip-permissions.ts`

**函数**：
- `canEditEvidence(userRole)` - 检查是否可以编辑证据
- `canViewEvidence(userRole)` - 检查是否可以查看证据
- `getRoleLabel(role)` - 获取角色显示名称

**使用示例**：
```typescript
import { canEditEvidence } from '@/utils/trip-permissions';

const canEdit = canEditEvidence('OWNER'); // true
const canEdit2 = canEditEvidence('VIEWER'); // false
```

---

### 2. useTripPermissions Hook ✅

**文件**：`src/hooks/useTripPermissions.ts`

**功能**：
- 获取当前用户对行程的权限
- 返回角色、canEdit、canView 等

**使用示例**：
```typescript
import { useTripPermissions } from '@/hooks';

function MyComponent({ tripId }: Props) {
  const { role, canEdit, canView, loading } = useTripPermissions({
    tripId,
    defaultRole: 'OWNER', // 可选
  });

  return (
    <div>
      {canEdit && <EditButton />}
      {canView && <ViewButton />}
    </div>
  );
}
```

**注意**：
- 当前实现为简化版本，默认返回 `OWNER`
- 实际应用中应该从 `TripDetail` 或 API 获取权限信息
- TODO: 集成真实的权限获取逻辑

---

## 🔄 集成步骤

### 步骤 1: 在 ReadinessDrawer 中集成

**文件**：`src/components/readiness/ReadinessDrawer.tsx`

**需要修改**：
1. 导入 `useTripPermissions` hook
2. 获取用户角色
3. 如果使用 `EvidenceListItem`，传递 `userRole` prop
4. 添加 `onStatusChange` 回调处理

**示例代码**：
```tsx
import { useTripPermissions } from '@/hooks';
import EvidenceListItem from '@/components/readiness/EvidenceListItem';

export default function ReadinessDrawer({ tripId, ... }: Props) {
  const { role } = useTripPermissions({ tripId });

  const handleEvidenceStatusChange = (evidenceId: string, status: EvidenceStatus, userNote?: string) => {
    // 刷新证据列表或更新本地状态
    loadData();
  };

  return (
    <div>
      {/* 如果使用 EvidenceListItem */}
      {evidenceList.map(evidence => (
        <EvidenceListItem
          key={evidence.id}
          evidence={evidence}
          tripId={tripId}
          userRole={role}
          onStatusChange={handleEvidenceStatusChange}
        />
      ))}
    </div>
  );
}
```

---

### 步骤 2: 在 ReadinessPage 中集成

**文件**：`src/pages/readiness/index.tsx`

**需要修改**：
1. 导入 `useTripPermissions` hook
2. 获取用户角色
3. 如果显示证据列表，传递 `userRole` prop
4. 可选：添加批量操作组件

**示例代码**：
```tsx
import { useTripPermissions } from '@/hooks';
import EvidenceBatchActions from '@/components/readiness/EvidenceBatchActions';
import EvidenceListItem from '@/components/readiness/EvidenceListItem';

export default function ReadinessPage() {
  const { tripId } = useParams();
  const { role } = useTripPermissions({ tripId });

  return (
    <div>
      {/* 批量操作 */}
      <EvidenceBatchActions
        evidenceList={evidenceList}
        tripId={tripId}
        userRole={role}
        onUpdate={loadEvidence}
      />

      {/* 证据列表 */}
      {evidenceList.map(evidence => (
        <EvidenceListItem
          key={evidence.id}
          evidence={evidence}
          tripId={tripId}
          userRole={role}
        />
      ))}
    </div>
  );
}
```

---

## ⚠️ 注意事项

### 1. 权限检查

**当前实现**：
- 组件内部进行权限检查
- 如果没有编辑权限，隐藏编辑功能
- 默认角色为 `OWNER`（向后兼容）

**TODO**：
- 从 `TripDetail` 获取真实权限信息
- 或调用 API 获取权限
- 或从用户上下文获取

---

### 2. 状态同步

**建议**：
- 状态更新后刷新列表
- 或使用状态管理（如 Redux/Zustand）
- 或使用 React Query 缓存管理

**示例**：
```tsx
const handleStatusChange = async (evidenceId: string, status: EvidenceStatus) => {
  // 更新状态
  await tripsApi.updateEvidence(tripId, evidenceId, { status });
  
  // 刷新列表
  await loadEvidence();
  
  // 或更新本地状态
  setEvidenceList(prev => prev.map(e => 
    e.id === evidenceId ? { ...e, status } : e
  ));
};
```

---

### 3. 错误处理

**当前实现**：
- 使用 `toast` 显示错误提示
- 控制台记录详细错误

**建议**：
- 添加重试机制
- 添加离线支持
- 添加错误边界

---

## 📦 相关文件

### 组件
- `src/components/readiness/EvidenceListItem.tsx` - 证据项组件
- `src/components/readiness/EvidenceBatchActions.tsx` - 批量操作组件

### 工具函数
- `src/utils/trip-permissions.ts` - 权限检查工具
- `src/hooks/useTripPermissions.ts` - 权限 Hook

### API
- `src/api/trips.ts` - API 方法

### 类型
- `src/types/readiness.ts` - 类型定义

### 文档
- `docs/evidence-status-api-integration.md` - API 对接文档
- `docs/evidence-status-ui-implementation.md` - UI 实现文档
- `docs/evidence-status-integration-guide.md` - 集成指南（本文档）

---

## 🎯 下一步工作

1. **集成到 ReadinessDrawer** ⚠️
   - 添加权限检查
   - 传递 `userRole` prop
   - 添加状态更新回调

2. **集成到 ReadinessPage** ⚠️
   - 添加权限检查
   - 添加批量操作组件
   - 更新证据列表显示

3. **真实权限获取** ⚠️
   - 从 `TripDetail` 获取权限
   - 或调用 API 获取权限
   - 更新 `useTripPermissions` hook

4. **测试** ⚠️
   - 单元测试
   - 集成测试
   - E2E 测试

---

## 📚 参考

- API 文档：见用户提供的接口文档
- UI 实现：`docs/evidence-status-ui-implementation.md`
- API 对接：`docs/evidence-status-api-integration.md`
