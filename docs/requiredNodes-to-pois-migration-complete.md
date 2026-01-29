# requiredNodes 到 pois 格式迁移完成报告

## 📋 迁移日期
2026-01-29

## ✅ 完成的迁移工作

### 1. 类型定义更新 (`src/types/places-routes.ts`)

#### ✅ DayPlanPoi 接口更新
- ✅ `id` 字段改为必填（`id: number`）
- ✅ 添加了详细的注释说明
- ✅ 明确标记这是唯一支持的POI数据格式

#### ✅ DayPlan 接口更新
- ✅ 标记 `requiredNodes` 为 `@deprecated`
- ✅ 更新注释，说明 `requiredNodes` 已废弃
- ✅ 明确说明后端已移除回退支持
- ✅ 强调 `pois` 是必填字段

#### ✅ CreateTripFromTemplateRequest 接口更新
- ✅ 更新注释，说明后端不再支持 `requiredNodes` 回退

### 2. UI组件更新 (`src/pages/route-directions/templates/[id].tsx`)

#### ✅ 模板详情页面
- ✅ 优先显示 `pois` 格式（新格式）
- ✅ 显示POI的完整信息：
  - POI名称（中文/英文）
  - 必游标记（★）
  - 停留时间（小时）
  - 按 `order` 字段排序
- ✅ 向后兼容：如果没有 `pois`，显示 `requiredNodes`（标记为"旧格式（已废弃）"）
- ✅ 使用不同的 Badge 样式区分必游和可选POI

### 3. 代码示例

#### 显示POI列表（新格式）

```tsx
{dayPlan.pois && dayPlan.pois.length > 0 ? (
  <div className="space-y-2 mt-2">
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">POI列表:</span>
      <Badge variant="secondary" className="text-xs">
        {dayPlan.pois.length} 个
      </Badge>
    </div>
    <div className="flex flex-wrap gap-2">
      {dayPlan.pois
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((poi, poiIdx) => (
          <Badge
            key={poi.id || poiIdx}
            variant={poi.required ? 'default' : 'outline'}
            className="text-xs"
          >
            {poi.nameCN || poi.nameEN || `POI ${poi.id}`}
            {poi.required && <span className="ml-1 text-[10px]">★</span>}
            {poi.durationMinutes && (
              <span className="ml-1 text-[10px] opacity-70">
                ({Math.round(poi.durationMinutes / 60)}h)
              </span>
            )}
          </Badge>
        ))}
    </div>
  </div>
) : (
  // 向后兼容：显示 requiredNodes（已废弃）
  dayPlan.requiredNodes && dayPlan.requiredNodes.length > 0 && (
    <div className="flex flex-wrap gap-2 mt-2">
      <span className="text-sm text-muted-foreground">必需节点:</span>
      <Badge variant="outline" className="text-xs bg-yellow-50 border-yellow-200">
        旧格式（已废弃）
      </Badge>
      {dayPlan.requiredNodes.map((node, nodeIdx) => (
        <Badge key={nodeIdx} variant="outline" className="text-xs">
          {node}
        </Badge>
      ))}
    </div>
  )
)}
```

## 📝 迁移状态

### ✅ 已完成
1. ✅ 类型定义更新
2. ✅ UI组件更新（模板详情页面）
3. ✅ 向后兼容处理

### ⚠️ 待处理（如果需要）
1. ⚠️ 创建/更新模板的表单（如果存在）
2. ⚠️ 其他显示模板的页面（如模板列表页面）

## 🔍 检查清单

### 类型定义
- ✅ `DayPlanPoi` 接口已更新，`id` 为必填
- ✅ `DayPlan` 接口中 `requiredNodes` 已标记为 `@deprecated`
- ✅ 注释已更新，说明迁移要求

### UI组件
- ✅ 模板详情页面优先显示 `pois`
- ✅ 显示POI的完整信息（名称、必游标记、停留时间）
- ✅ 向后兼容显示 `requiredNodes`（标记为已废弃）

### 代码质量
- ✅ 无 TypeScript 错误
- ✅ 无 Linter 错误
- ✅ 代码格式正确

## 🎯 使用建议

### 创建新模板时

```typescript
const newTemplate = {
  routeDirectionId: 1,
  durationDays: 5,
  dayPlans: [
    {
      day: 1,
      theme: "彩色火山",
      pois: [
        {
          id: 381117,
          uuid: "uuid-1",
          nameCN: "Landmannalaugar",
          nameEN: "Landmannalaugar",
          required: true,
          order: 1,
          durationMinutes: 120,
        },
      ],
    },
  ],
};
```

### 更新现有模板时

```typescript
// ✅ 正确：使用 pois
const updatedDayPlans = template.dayPlans.map(plan => ({
  ...plan,
  pois: [
    ...(plan.pois || []),
    {
      id: 381125,
      nameCN: "新POI",
      required: false,
      order: (plan.pois?.length || 0) + 1,
    },
  ],
}));

// ❌ 错误：不要使用 requiredNodes
const badDayPlans = template.dayPlans.map(plan => ({
  ...plan,
  requiredNodes: [...(plan.requiredNodes || []), "381125"], // 已废弃
}));
```

## ⚠️ 注意事项

1. **后端已移除回退支持**
   - 如果模板中没有 `pois`，后端会记录警告
   - 建议尽快迁移现有数据

2. **必填字段**
   - `pois[].id`: 必填（数字）
   - `pois[].nameCN`: 必填（字符串）

3. **推荐字段**
   - `pois[].uuid`: 推荐（用于更可靠的匹配）
   - `pois[].order`: 推荐（用于排序）
   - `pois[].required`: 推荐（用于区分必游和可选）

## 🔗 相关文档

- **迁移指南**: `docs/requiredNodes-to-pois-migration-guide.md` (用户提供)
- **API文档**: `docs/route-template-api-latest.md`
- **类型定义**: `src/types/places-routes.ts`

## ✅ 总结

前端代码已成功迁移到 `pois` 格式：
- ✅ 类型定义已更新
- ✅ UI组件已更新
- ✅ 向后兼容已实现
- ✅ 代码质量检查通过

**下一步**: 如果存在创建/更新模板的表单，需要更新表单逻辑以使用 `pois` 格式。
