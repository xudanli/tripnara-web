# Auto 综合优化 - 接口说明

> 创建日期：2026-02-10  
> 相关组件：`src/components/trips/AutoOptimizeDialog.tsx`

---

## 📋 一、涉及的接口

### **主要接口：Auto综合优化**

**接口路径**: `POST /api/planning-workbench/auto-optimize`

**前端调用位置**: `src/api/planning-workbench.ts` → `autoOptimize` 方法

**请求参数**:
```typescript
{
  tripId: string;        // 行程ID（必填）
  preview?: boolean;     // 是否为预览模式（可选，默认 false）
  limit?: number;        // 限制应用的建议数量（可选）
}
```

**返回数据结构**:
```typescript
{
  success: boolean;      // 是否成功
  appliedCount: number; // 已应用的建议数量
  suggestions: Array<{
    id: string;
    title: string;
    severity: 'blocker' | 'warn' | 'info';
    applied: boolean;    // 是否成功应用
    error?: string;      // 如果应用失败，错误信息
  }>;
  impact?: {
    metrics?: {
      fatigue?: number;  // 疲劳度变化
      buffer?: number;   // 缓冲时间变化
      cost?: number;     // 成本变化
    };
    risks?: Array<{
      id: string;
      severity: string;
      title: string;
    }>;
  };
}
```

---

## 🔄 二、对话框中的操作流程

### **1. 预览结果按钮**

**触发时机**: 用户点击"预览结果"按钮

**调用接口**: 
```typescript
planningWorkbenchApi.autoOptimize({
  tripId: string,
  preview: true,        // ✅ 预览模式
  limit: suggestions.length
})
```

**接口路径**: `POST /api/planning-workbench/auto-optimize`

**请求体**:
```json
{
  "tripId": "9a4dbd2e-e76a-4fd3-bab0-09332fb2581b",
  "preview": true,
  "limit": 4
}
```

**功能**: 
- 模拟应用优化建议，但不实际修改行程
- 返回优化后的预期效果（指标变化、风险变化等）
- 用于在确认前让用户了解优化效果

---

### **2. 确认优化按钮** ⭐

**触发时机**: 用户点击"确认优化"按钮

**调用接口**:
```typescript
planningWorkbenchApi.autoOptimize({
  tripId: string,
  preview: false,       // ✅ 实际执行模式
  limit: suggestions.length
})
```

**接口路径**: `POST /api/planning-workbench/auto-optimize`

**请求体**:
```json
{
  "tripId": "9a4dbd2e-e76a-4fd3-bab0-09332fb2581b",
  "preview": false,
  "limit": 4
}
```

**功能**:
- **实际应用**所有高优先级建议（severity === 'blocker'）
- 修改行程数据（调整时间、替换行程项等）
- 返回应用结果和影响分析

**超时设置**: 60秒（优化可能需要较长时间）

---

## 📊 三、接口调用流程

```
用户点击"Auto 综合"按钮
    ↓
显示 AutoOptimizeDialog（显示建议列表）
    ↓
用户点击"预览结果"
    ↓
调用 POST /api/planning-workbench/auto-optimize (preview: true)
    ↓
显示预览结果（指标变化、变更摘要）
    ↓
用户点击"确认优化"
    ↓
调用 POST /api/planning-workbench/auto-optimize (preview: false) ⭐
    ↓
显示加载遮罩（优化中...）
    ↓
优化完成，显示结果弹窗
    ↓
刷新页面数据
```

---

## 🎯 四、关键接口总结

| 操作 | 接口路径 | 请求方法 | preview 参数 | 功能 |
|------|---------|---------|-------------|------|
| **预览结果** | `/api/planning-workbench/auto-optimize` | POST | `true` | 模拟优化，返回预期效果 |
| **确认优化** ⭐ | `/api/planning-workbench/auto-optimize` | POST | `false` | 实际应用优化建议 |

**注意**: 两个操作调用的是**同一个接口**，只是 `preview` 参数不同。

---

## ✅ 五、接口状态

### **当前状态**
- ✅ 前端已实现调用逻辑
- ✅ 接口路径已定义：`POST /api/planning-workbench/auto-optimize`
- ✅ 请求参数和返回数据结构已定义
- ⚠️ **需要确认后端是否已实现此接口**

### **后端需要实现的功能**
1. 接收 `preview` 参数，区分预览和执行模式
2. 预览模式：模拟优化，返回预期效果，不修改数据
3. 执行模式：实际应用优化建议，修改行程数据
4. 返回应用结果和影响分析

---

## 📝 六、相关文件

- **组件**: `src/components/trips/AutoOptimizeDialog.tsx`
- **API调用**: `src/api/planning-workbench.ts` → `autoOptimize` 方法
- **类型定义**: `src/types/suggestion.ts` → `Suggestion` 类型

---

**总结**: "确认优化"按钮调用的是 `POST /api/planning-workbench/auto-optimize` 接口，`preview: false` 参数表示实际执行优化。
