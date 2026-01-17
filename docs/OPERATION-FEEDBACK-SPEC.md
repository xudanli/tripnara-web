# 操作反馈规范

本文档定义了 TripNARA 前端应用中操作反馈的统一规范，确保用户在执行各类操作时获得一致、清晰的状态提示。

## 📋 Toast 类型与使用场景

### 类型定义

| 类型 | 方法 | 颜色 | 使用场景 |
|------|------|------|---------|
| 成功 | `toast.success()` | 绿色 | 操作完全成功 |
| 错误 | `toast.error()` | 红色 | 操作失败，需要用户注意 |
| 警告 | `toast.warning()` | 橙色 | 操作部分成功，有潜在问题 |
| 信息 | `toast.info()` | 蓝色 | 提示信息，无需用户操作 |

### 使用规范

```typescript
// ✅ 成功
toast.success('行程项已删除');
toast.success('已成功添加「东京塔」到行程');

// ✅ 错误
toast.error('删除失败，请稍后重试');
toast.error(err.message || '操作失败');

// ✅ 警告（部分成功）
toast.warning('行程项已添加，但系统自动检查失败', {
  description: '建议手动检查行程是否需要调整',
});

// ✅ 信息
toast.info('需要您的审批才能继续执行操作');
toast.info(`系统已自动检查，发现 ${count} 条提醒`);
```

## 🔄 操作流程反馈模式

### 模式 1：简单操作（无后续检查）

```typescript
try {
  await api.doSomething();
  toast.success('操作成功');
} catch (err) {
  toast.error(err.message || '操作失败');
}
```

### 模式 2：用户主动触发 AI 检查

**设计原则**：确定性操作（CRUD）应该与智能检查（AI）分离。

| 操作类型 | 是否调用 AI | 说明 |
|---------|------------|------|
| 添加行程项 | ❌ | 用户明确操作，直接执行 |
| 删除行程项 | ❌ | 用户明确操作，直接执行 |
| 编辑/移动/替换 | ❌ | 用户明确操作，直接执行 |
| **一键优化** | ✅ | 用户请求 AI 帮助 |
| **检查行程** | ✅ | 用户主动触发检查 |
| **AI 对话** | ✅ | 用户与 AI 交互 |

```typescript
// ✅ 正确：CRUD 操作不调用 AI
try {
  await api.createItem(data);
  toast.success('操作成功');
  await loadData();
} catch (err) {
  toast.error(err.message || '操作失败');
}

// ✅ 正确：只在用户主动触发时调用 AI
const handleOptimize = async () => {
  const result = await orchestrator.optimizeRoute(...);
  // 处理 AI 返回结果
};
```

### 模式 3：需要审批的操作

```typescript
// 审批完成回调
const handleApprovalComplete = async (approved: boolean) => {
  if (approved) {
    toast.success('审批已批准，系统正在继续执行...');
    await loadData();
  } else {
    toast.info('审批已拒绝，系统将调整策略');
  }
  setApprovalDialogOpen(false);
  setPendingApprovalId(null);
};
```

## 📊 各操作反馈清单

### 行程项操作

| 操作 | 成功提示 | 失败提示 | 警告提示 |
|------|---------|---------|---------|
| 添加行程项 | `已成功添加「{placeName}」到行程` | `添加失败，请重试` | `行程项已添加，但系统自动检查失败` |
| 删除行程项 | `已成功删除「{placeName}」` | `删除失败` | `行程项已删除，但系统自动检查失败` |
| 移动行程项 | `移动成功` | `移动失败` | `移动成功，但系统自动检查失败` |
| 替换行程项 | `替换成功` | `替换失败` | `替换成功，但系统自动检查失败` |
| 编辑行程项 | `保存成功` | `保存失败` | - |

### 行程配置操作

| 操作 | 成功提示 | 失败提示 | 警告提示 |
|------|---------|---------|---------|
| 保存约束 | `保存成功！您可以继续到"时间轴"标签页添加行程` | `保存失败` | `保存成功，但系统自动检查失败` |
| 优化路线 | `优化成功` | `优化失败` | `优化成功，但系统自动检查失败` |

### 系统操作

| 操作 | 成功提示 | 失败提示 | 信息提示 |
|------|---------|---------|---------|
| 审批通过 | `审批已批准，系统正在继续执行...` | - | - |
| 审批拒绝 | - | - | `审批已拒绝，系统将调整策略` |
| 需要审批 | - | - | `需要您的审批才能继续执行操作` |

## 🎨 视觉设计规范

### Toast 位置

- **位置**：屏幕右下角
- **堆叠**：最新的在最上方
- **最大数量**：同时显示最多 3 条

### 显示时长

| 类型 | 默认时长 | 特殊情况 |
|------|---------|---------|
| 成功 | 3 秒 | - |
| 错误 | 5 秒 | 重要错误可延长 |
| 警告 | 4 秒 | 带 description 时 5 秒 |
| 信息 | 3 秒 | 需要用户阅读时延长至 8 秒 |

### 带描述的 Toast

```typescript
toast.warning('行程项已添加，但系统自动检查失败', {
  description: '建议手动检查行程是否需要调整',
  duration: 5000,
});
```

## ⚠️ 常见错误

### ❌ 错误示例

```typescript
// 1. 静默失败
} catch (err) {
  console.error(err); // 用户看不到
}

// 2. 审批中断主流程
if (result.needsApproval) {
  return; // 主操作已成功但没有反馈
}

// 3. 重复提示
toast.success('操作成功');
toast.success('操作成功'); // 重复
```

### ✅ 正确示例

```typescript
// 1. 始终给用户反馈
} catch (err) {
  console.error(err);
  toast.error(err.message || '操作失败');
}

// 2. 主操作成功后再处理审批
toast.success('操作成功');
await loadData();
if (result.needsApproval) {
  toast.info('系统检测到需要进一步调整，请查看审批');
}

// 3. 避免重复提示
// 使用状态变量控制
```

## 📝 国际化

所有用户可见的提示文案应使用国际化：

```typescript
// ✅ 使用 i18n
toast.success(t('planStudio.scheduleTab.deleteSuccess', { placeName }));

// ❌ 硬编码中文
toast.success('删除成功');
```

国际化 key 命名规范：
- `{module}.{tab/component}.{action}{Result}`
- 例如：`planStudio.scheduleTab.deleteSuccess`

---

**最后更新**：2026-01-17
**维护者**：TripNARA 前端团队
