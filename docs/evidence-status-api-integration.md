# 证据状态更新 API 前端对接文档

## 📋 概述

本文档记录了两个证据状态更新 API 的前端对接实现：

1. **更新单个证据项状态** - `PATCH /trips/:id/evidence/:evidenceId`
2. **批量更新证据项状态** - `PUT /trips/:id/evidence/batch-update`

---

## ✅ 已实现的 API 方法

### 1. 更新单个证据项状态

**位置**：`src/api/trips.ts`

**方法签名**：
```typescript
tripsApi.updateEvidence(
  tripId: string,
  evidenceId: string,
  data: {
    status?: 'new' | 'acknowledged' | 'resolved' | 'dismissed';
    userNote?: string;
  }
): Promise<{
  evidenceId: string;
  status: string;
  updatedAt: string;
  userNote?: string;
}>
```

**使用示例**：
```typescript
import { tripsApi } from '@/api/trips';

// 标记证据为已确认
await tripsApi.updateEvidence('trip-id', 'ev-place-123-opening-hours', {
  status: 'acknowledged',
  userNote: '已确认营业时间，已准备备选方案'
});

// 只更新备注
await tripsApi.updateEvidence('trip-id', 'ev-place-123-opening-hours', {
  userNote: '已确认营业时间'
});
```

---

### 2. 批量更新证据项状态

**位置**：`src/api/trips.ts`

**方法签名**：
```typescript
tripsApi.batchUpdateEvidence(
  tripId: string,
  updates: Array<{
    evidenceId: string;
    status?: 'new' | 'acknowledged' | 'resolved' | 'dismissed';
    userNote?: string;
  }>
): Promise<{
  updated: number;
  failed: number;
  errors?: Array<{
    evidenceId: string;
    error: string;
  }>;
}>
```

**使用示例**：
```typescript
import { tripsApi } from '@/api/trips';

// 批量更新多个证据项
const result = await tripsApi.batchUpdateEvidence('trip-id', [
  {
    evidenceId: 'ev-place-123-opening-hours',
    status: 'acknowledged',
    userNote: '已确认'
  },
  {
    evidenceId: 'ev-place-456-weather',
    status: 'resolved',
    userNote: '已准备雨具'
  }
]);

console.log(`成功更新 ${result.updated} 个，失败 ${result.failed} 个`);
if (result.errors) {
  result.errors.forEach(err => {
    console.error(`证据 ${err.evidenceId} 更新失败: ${err.error}`);
  });
}
```

**批量限制**：
- 最多支持 **100个** 证据项批量更新
- 超过限制会抛出错误

---

## 📝 类型定义

### EvidenceStatus

**位置**：`src/types/readiness.ts`

```typescript
export type EvidenceStatus = 'new' | 'acknowledged' | 'resolved' | 'dismissed';
```

**状态说明**：
- `new` - 新证据（默认状态）
- `acknowledged` - 已确认（用户已查看）
- `resolved` - 已解决（用户已处理）
- `dismissed` - 已忽略（用户选择忽略）

---

### EvidenceItem（已更新）

**位置**：`src/types/readiness.ts`

```typescript
export interface EvidenceItem {
  id: string;
  category: 'road' | 'weather' | 'poi' | 'ticket' | 'lodging';
  source: string;
  timestamp: string;
  scope: string; // "Day 1" / "Segment 2" / "POI #3"
  confidence: EvidenceConfidence;
  status?: EvidenceStatus; // 🆕 证据状态
  userNote?: string; // 🆕 用户备注（最大500字符）
  updatedAt?: string; // 🆕 最后更新时间
}
```

---

## 🔄 状态转换规则

根据 API 文档，状态转换规则如下：

| 当前状态 | 允许转换到 | 说明 |
|---------|-----------|------|
| `new` | `acknowledged`, `resolved`, `dismissed` | 新证据可以标记为已读、已解决或忽略 |
| `acknowledged` | `resolved`, `dismissed` | 已读可以标记为已解决或忽略 |
| `resolved` | - | 已解决不能回退 |
| `dismissed` | `acknowledged` | 忽略的可以重新关注 |

**前端实现建议**：
- 在 UI 中根据当前状态显示可用的操作按钮
- 使用状态机验证状态转换的合法性
- 提供清晰的错误提示（如果状态转换不合法）

---

## 🎨 UI 集成建议

### 1. EvidenceListItem 组件增强

**位置**：`src/components/readiness/EvidenceListItem.tsx`

**建议添加的功能**：
- 显示当前状态（Badge）
- 状态切换下拉菜单或按钮组
- 用户备注输入框（可选）
- 状态更新时间显示

**示例代码结构**：
```typescript
interface EvidenceListItemProps {
  evidence: EvidenceItem;
  tripId: string;
  onStatusChange?: (evidenceId: string, status: EvidenceStatus, userNote?: string) => void;
  onRefresh?: (evidenceId: string) => void;
  onOpen?: (evidenceId: string) => void;
}
```

---

### 2. 批量操作组件

**建议创建**：`src/components/readiness/EvidenceBatchActions.tsx`

**功能**：
- 多选证据项
- 批量状态更新
- 批量添加备注
- 显示批量操作结果（成功/失败）

---

### 3. 状态选择器组件

**建议创建**：`src/components/readiness/EvidenceStatusSelector.tsx`

**功能**：
- 根据当前状态显示可用操作
- 状态转换验证
- 用户备注输入（可选）

---

## 🔐 权限检查

根据 API 文档：
- 只有 **OWNER** 和 **EDITOR** 可以修改证据
- **VIEWER** 只能查看，不能修改

**前端实现建议**：
- 在组件中检查用户权限
- 根据权限显示/隐藏编辑功能
- 在 API 调用前进行权限验证（可选，后端会再次验证）

---

## ⚠️ 错误处理

### 常见错误

1. **状态转换不合法**
   ```json
   {
     "success": false,
     "error": {
       "code": "VALIDATION_ERROR",
       "message": "不允许的状态转换：resolved → acknowledged"
     }
   }
   ```

2. **证据项不存在**
   ```json
   {
     "success": false,
     "error": {
       "code": "NOT_FOUND",
       "message": "证据项不存在"
     }
   }
   ```

3. **批量更新超过限制**
   ```json
   {
     "success": false,
     "error": {
       "code": "VALIDATION_ERROR",
       "message": "批量更新最多支持100个证据项"
     }
   }
   ```

**前端处理建议**：
- 使用 `try-catch` 捕获错误
- 显示用户友好的错误提示
- 对于批量操作，显示部分失败详情

---

## 📦 相关文件

### API 实现
- `src/api/trips.ts` - API 方法实现

### 类型定义
- `src/types/readiness.ts` - `EvidenceStatus`、`EvidenceItem` 类型

### UI 组件（待实现）
- `src/components/readiness/EvidenceListItem.tsx` - 证据项列表项组件
- `src/components/readiness/EvidenceBatchActions.tsx` - 批量操作组件（建议）
- `src/components/readiness/EvidenceStatusSelector.tsx` - 状态选择器组件（建议）

---

## 🎯 下一步工作

1. **更新 EvidenceListItem 组件**
   - 添加状态显示和切换功能
   - 添加用户备注输入功能

2. **实现批量操作 UI**
   - 多选功能
   - 批量状态更新
   - 批量操作结果展示

3. **添加状态转换验证**
   - 前端状态机验证
   - 用户友好的错误提示

4. **权限检查集成**
   - 根据用户角色显示/隐藏编辑功能

5. **测试**
   - 单元测试（API 方法）
   - 集成测试（UI 组件）
   - E2E 测试（完整流程）

---

## 📚 参考

- API 文档：见用户提供的接口文档
- 后端实现：待确认后端接口是否已实现
- 权限系统：参考现有的权限检查逻辑
