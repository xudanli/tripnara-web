# 证据与关注队列 API v2.0 集成报告

**集成日期**：2026-01-29  
**版本**：v2.0.0

---

## ✅ 已完成的集成

### 1. 类型定义更新 ✅

#### EvidenceItem 类型增强

**文件**：`src/types/trip.ts`、`src/types/readiness.ts`

**新增字段**（P0修复 - v1.2.0）：
- ✅ `freshness` - 证据时效性信息
- ✅ `confidence` - 证据置信度信息（注意：与现有的 confidence 字段不同）
- ✅ `qualityScore` - 证据质量评分信息

**新增字段**（之前修复）：
- ✅ `title` - 证据标题
- ✅ `description` - 证据描述
- ✅ `link` - 证据来源链接
- ✅ `poiId` - 关联的 POI ID
- ✅ `day` - 关联的日期

---

### 2. API 客户端更新 ✅

#### tripsApi 更新

**文件**：`src/api/trips.ts`

**已更新的方法**：

1. **`getEvidence`** - 获取证据列表
   - ✅ 新增 `priority` 查询参数（all/high/medium_and_high）
   - ✅ 新增 `groupBy` 查询参数（none/importance/type/day）
   - ✅ 新增 `sortBy` 查询参数（time/importance/relevance/freshness/quality）

2. **`getEvidenceCompleteness`** 🆕
   - ✅ 检查证据完整性
   - ✅ 返回完整性评分、缺失证据列表、补充建议

3. **`getEvidenceSuggestions`** 🆕
   - ✅ 获取证据获取建议
   - ✅ 返回建议列表、一键批量获取建议

**已存在的方法**：
- ✅ `updateEvidence` - 更新单个证据状态
- ✅ `batchUpdateEvidence` - 批量更新证据状态

---

#### planningWorkbenchApi 更新

**文件**：`src/api/planning-workbench.ts`

**已更新的方法**：

1. **`fetchEvidence`** - 批量获取证据
   - ✅ 新增 `async` 选项（异步模式）
   - ✅ 支持返回任务ID（异步模式）或完整结果（同步模式）

**新增方法**：

2. **`getTaskProgress`** 🆕
   - ✅ 查询异步任务进度
   - ✅ 返回任务状态、进度信息、预计剩余时间

3. **`cancelTask`** 🆕
   - ✅ 取消异步任务

---

### 3. 组件更新 ✅

#### EvidenceListItem 组件

**文件**：`src/components/readiness/EvidenceListItem.tsx`

**已更新的显示**：
- ✅ 显示证据标题和描述（之前已添加）
- ✅ 显示时效性状态（freshnessStatus）
- ✅ 显示质量评分（qualityScore）
- ✅ 显示置信度（confidence.score，如果有）

**显示逻辑**：
```tsx
{/* 时效性状态 */}
{evidence.freshness && (
  <div className="flex items-center gap-1">
    <span className={cn(
      'w-2 h-2 rounded-full',
      evidence.freshness.freshnessStatus === 'FRESH' && 'bg-green-500',
      evidence.freshness.freshnessStatus === 'STALE' && 'bg-amber-500',
      evidence.freshness.freshnessStatus === 'EXPIRED' && 'bg-red-500'
    )} />
    <span>数据新鲜/已过期/已失效</span>
  </div>
)}

{/* 质量评分 */}
{evidence.qualityScore && (
  <span>质量: {Math.round(evidence.qualityScore.overallScore * 100)}%</span>
)}
```

---

### 4. 适配器更新 ✅

**文件**：`src/utils/evidence-adapter.ts`

**已更新的转换**：
- ✅ 保留 `freshness` 字段
- ✅ 保留 `confidence` 对象（如果存在）
- ✅ 保留 `qualityScore` 字段

---

## 📋 新增接口清单

### tripsApi

| 接口 | 方法 | 状态 | 说明 |
|------|------|------|------|
| `getEvidence` | GET | ✅ 已更新 | 新增 priority、groupBy、sortBy 参数 |
| `getEvidenceCompleteness` | GET | ✅ 已添加 | 检查证据完整性 |
| `getEvidenceSuggestions` | GET | ✅ 已添加 | 获取证据获取建议 |
| `updateEvidence` | PATCH | ✅ 已存在 | 更新单个证据状态 |
| `batchUpdateEvidence` | PUT | ✅ 已存在 | 批量更新证据状态 |

### planningWorkbenchApi

| 接口 | 方法 | 状态 | 说明 |
|------|------|------|------|
| `fetchEvidence` | POST | ✅ 已更新 | 新增 async 选项 |
| `getTaskProgress` | GET | ✅ 已添加 | 查询任务进度 |
| `cancelTask` | POST | ✅ 已添加 | 取消任务 |

---

## 🎯 功能特性

### P0修复 - 证据增强字段（v1.2.0）

#### freshness（时效性信息）

**字段结构**：
```typescript
freshness?: {
  fetchedAt: string;           // 获取时间
  expiresAt?: string;          // 过期时间
  freshnessStatus: 'FRESH' | 'STALE' | 'EXPIRED';
  recommendedRefreshAt?: string;
}
```

**显示效果**：
- 🟢 FRESH - 绿色圆点 + "数据新鲜"
- 🟡 STALE - 琥珀色圆点 + "数据已过期"
- 🔴 EXPIRED - 红色圆点 + "数据已失效"

#### qualityScore（质量评分）

**字段结构**：
```typescript
qualityScore?: {
  overallScore: number;         // 综合评分（0-1）
  components: {
    sourceReliability: number;  // 数据源可靠性
    timeliness: number;         // 时效性
    completeness: number;       // 完整性
    multiSourceVerification: number; // 多源验证
  };
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;         // 质量说明
}
```

**显示效果**：
- 显示质量百分比（例如："质量: 85%"）
- 根据 level 使用不同颜色（HIGH=绿色，MEDIUM=琥珀色，LOW=红色）

---

### P1功能 - 证据查询增强

#### priority（优先级过滤）

**参数值**：
- `all` - 显示所有证据（默认）
- `high` - 只显示高优先级证据（重要性 >= 0.7）
- `medium_and_high` - 显示中等和高优先级证据（重要性 >= 0.4）

**使用示例**：
```typescript
const evidence = await tripsApi.getEvidence(tripId, {
  priority: 'high',
  limit: 20,
});
```

#### sortBy（排序方式）

**参数值**：
- `time` - 按时间排序（默认）
- `importance` - 按重要性排序
- `relevance` - 按相关性排序（当前天数优先）
- `freshness` - 按新鲜度排序
- `quality` - 按质量评分排序

**使用示例**：
```typescript
const evidence = await tripsApi.getEvidence(tripId, {
  sortBy: 'importance',
  limit: 20,
});
```

---

### P1功能 - 证据完整性检查

#### getEvidenceCompleteness

**功能**：
- 检查行程中所有POI的期望证据类型
- 识别缺失的证据
- 评估影响（HIGH/MEDIUM/LOW）
- 提供补充建议

**使用示例**：
```typescript
const completeness = await tripsApi.getEvidenceCompleteness(tripId);

console.log('完整性评分:', completeness.completenessScore);
console.log('缺失证据:', completeness.missingEvidence);
console.log('补充建议:', completeness.recommendations);
```

---

### P1功能 - 证据获取建议

#### getEvidenceSuggestions

**功能**：
- 自动检测缺失证据
- 生成获取建议（按优先级排序）
- 提供一键批量获取建议

**使用示例**：
```typescript
const suggestions = await tripsApi.getEvidenceSuggestions(tripId);

if (suggestions.hasMissingEvidence) {
  console.log('完整性评分:', suggestions.completenessScore);
  console.log('建议列表:', suggestions.suggestions);
  
  // 一键批量获取（高优先级）
  if (suggestions.bulkFetchSuggestion) {
    const { evidenceTypes, affectedPoiIds } = suggestions.bulkFetchSuggestion;
    // 调用 fetchEvidence
  }
}
```

---

### P1功能 - 异步任务进度

#### fetchEvidence（异步模式）

**使用示例**：
```typescript
// 异步模式
const result = await planningWorkbenchApi.fetchEvidence(tripId, {
  async: true,
  evidenceTypes: ['weather', 'opening_hours'],
});

if ('taskId' in result) {
  // 获取任务ID，开始轮询进度
  const taskId = result.taskId;
  
  // 轮询任务进度
  const interval = setInterval(async () => {
    const progress = await planningWorkbenchApi.getTaskProgress(taskId);
    
    console.log('进度:', progress.progress.processed, '/', progress.progress.total);
    console.log('状态:', progress.status);
    
    if (progress.status === 'COMPLETED') {
      clearInterval(interval);
      console.log('任务完成:', progress.result);
    } else if (progress.status === 'FAILED') {
      clearInterval(interval);
      console.error('任务失败:', progress.error);
    }
  }, 2000); // 每2秒查询一次
  
  // 如果需要取消任务
  // await planningWorkbenchApi.cancelTask(taskId);
}
```

---

## 📝 待集成功能

### 1. 证据完整性检查 UI

**待完成**：
- [ ] 创建 `EvidenceCompletenessCard` 组件
- [ ] 在 ReadinessPage 中显示完整性检查结果
- [ ] 显示缺失证据列表和补充建议

---

### 2. 证据获取建议 UI

**待完成**：
- [ ] 创建 `EvidenceSuggestionsCard` 组件
- [ ] 在 ReadinessPage 中显示获取建议
- [ ] 实现一键批量获取功能
- [ ] 显示任务进度（如果使用异步模式）

---

### 3. 异步任务进度 UI

**待完成**：
- [ ] 创建 `TaskProgressDialog` 组件
- [ ] 显示任务进度条
- [ ] 显示当前处理的POI
- [ ] 显示预计剩余时间
- [ ] 支持取消任务

---

### 4. 证据过滤和排序 UI

**待完成**：
- [ ] 在 ReadinessPage 中添加过滤控件（priority、type、day）
- [ ] 添加排序选择器（sortBy）
- [ ] 添加分组选择器（groupBy，如果后端支持）

---

## 🎯 使用场景

### 场景 1：检查证据完整性

```typescript
// 在准备度检查后，自动检查证据完整性
const completeness = await tripsApi.getEvidenceCompleteness(tripId);

if (completeness.completenessScore < 0.7) {
  // 显示完整性警告
  // 显示缺失证据列表
  // 提供补充建议
}
```

### 场景 2：智能获取证据

```typescript
// 获取证据获取建议
const suggestions = await tripsApi.getEvidenceSuggestions(tripId);

if (suggestions.hasMissingEvidence && suggestions.bulkFetchSuggestion) {
  // 显示一键批量获取按钮
  // 用户点击后，使用异步模式获取证据
  const result = await planningWorkbenchApi.fetchEvidence(tripId, {
    async: true,
    evidenceTypes: suggestions.bulkFetchSuggestion.evidenceTypes,
  });
  
  if ('taskId' in result) {
    // 显示任务进度对话框
    // 轮询任务进度
  }
}
```

### 场景 3：按优先级过滤证据

```typescript
// 只显示高优先级证据
const highPriorityEvidence = await tripsApi.getEvidence(tripId, {
  priority: 'high',
  sortBy: 'importance',
  limit: 20,
});
```

---

## ✅ 完成清单

### 类型定义
- [x] 更新 `EvidenceItem` 类型，添加增强字段
- [x] 更新 `ReadinessEvidenceItem` 类型

### API 客户端
- [x] 更新 `tripsApi.getEvidence`，添加新参数
- [x] 添加 `tripsApi.getEvidenceCompleteness`
- [x] 添加 `tripsApi.getEvidenceSuggestions`
- [x] 更新 `planningWorkbenchApi.fetchEvidence`，支持异步模式
- [x] 添加 `planningWorkbenchApi.getTaskProgress`
- [x] 添加 `planningWorkbenchApi.cancelTask`

### 组件更新
- [x] 更新 `EvidenceListItem`，显示增强字段
- [x] 更新适配器，保留增强字段

### UI 集成（待完成）
- [ ] 证据完整性检查 UI
- [ ] 证据获取建议 UI
- [ ] 异步任务进度 UI
- [ ] 证据过滤和排序 UI

---

## 📚 相关文档

- [证据与关注队列 API 接口文档](./evidence-api-display-locations.md)
- [证据状态更新功能完整集成报告](./evidence-status-integration-complete.md)
- [证据显示问题修复报告](./evidence-display-fix.md)

---

**最后更新**：2026-01-29  
**版本**：v2.0.0  
**状态**：✅ API 对接完成，UI 集成待完成
