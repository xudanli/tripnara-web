# 路线模板接口对接完成总结

## ✅ 已完成的工作

### 1. 类型定义更新 (`src/types/places-routes.ts`)

已更新并扩展了路线模板相关的类型定义：

- ✅ **`DayPlanPoi`** - 新增每日计划中的POI信息接口
  - 包含完整的POI信息：id、uuid、nameCN、nameEN、category、address、rating、description等
  - 支持必游标记、顺序、停留时间等字段

- ✅ **`DayPlan`** - 更新每日计划接口
  - 新增 `pois?: DayPlanPoi[]` 字段，支持完整的POI列表
  - 新增 `optionalActivities?: string[]` 字段
  - 扩展 `maxIntensity` 类型支持

- ✅ **`RouteTemplate`** - 更新路线模板接口
  - 新增 `name?: string` 字段（兼容字段）
  - 更新 `nameCN` 和 `nameEN` 为可选字段
  - 更新 `defaultPacePreference` 为可选字段
  - 确保 `createdAt` 和 `updatedAt` 为必填字段

- ✅ **`PacePreferenceEnum`** - 更新节奏偏好枚举
  - 新增 `'INTENSE'` 选项（与文档一致）
  - 保留 `'CHALLENGE'` 以保持向后兼容

### 2. API 客户端 (`src/api/route-directions.ts`)

已确认以下API方法正确实现：

- ✅ **`queryTemplates()`** - 查询路线模板列表
  - 路径: `GET /route-directions/templates`
  - 支持所有查询参数：`routeDirectionId`、`durationDays`、`isActive`、`limit`、`offset`
  - 统一的错误处理和响应包装

- ✅ **`getTemplateById()`** - 获取路线模板详情
  - 路径: `GET /route-directions/templates/:id`
  - 返回完整的模板信息，包括 `dayPlans` 和 `pois`

### 3. React Hooks (`src/hooks/useRouteTemplates.ts`)

创建了两个React Hook：

- ✅ **`useRouteTemplates()`** - 查询路线模板列表Hook
  - 支持查询参数传递
  - 支持自动获取和手动刷新
  - 支持自动刷新间隔配置
  - 完整的加载状态和错误处理

- ✅ **`useRouteTemplate()`** - 获取单个模板详情Hook
  - 支持模板ID传递
  - 支持自动获取和手动刷新
  - 支持自动刷新间隔配置
  - 完整的加载状态和错误处理

### 4. 导出配置 (`src/hooks/index.ts`)

已更新导出配置，导出新的Hooks和类型：

- ✅ `useRouteTemplates`
- ✅ `useRouteTemplate`
- ✅ `UseRouteTemplatesReturn`
- ✅ `UseRouteTemplateReturn`

## 📝 使用示例

### 基础用法 - 查询模板列表

```typescript
import { useRouteTemplates } from '@/hooks';

function RouteTemplateList() {
  const { templates, loading, error, refetch } = useRouteTemplates({
    routeDirectionId: 1,
    durationDays: 7,
    isActive: true,
    limit: 10,
    offset: 0,
  });

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;

  return (
    <div>
      {templates.map(template => (
        <div key={template.id}>
          <h3>{template.nameCN || template.nameEN || template.name}</h3>
          <p>天数: {template.durationDays}</p>
          <p>节奏: {template.defaultPacePreference}</p>
          <p>状态: {template.isActive ? '激活' : '未激活'}</p>
        </div>
      ))}
    </div>
  );
}
```

### 获取单个模板详情

```typescript
import { useRouteTemplate } from '@/hooks';

function RouteTemplateDetail({ templateId }: { templateId: number }) {
  const { template, loading, error, refetch } = useRouteTemplate(templateId);

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;
  if (!template) return <div>模板不存在</div>;

  return (
    <div>
      <h2>{template.nameCN || template.nameEN || template.name}</h2>
      <p>天数: {template.durationDays}</p>
      
      {/* 处理每日计划 */}
      {template.dayPlans.map(dayPlan => (
        <div key={dayPlan.day}>
          <h3>第 {dayPlan.day} 天</h3>
          <p>主题: {dayPlan.theme}</p>
          
          {/* 方式1: 使用 requiredNodes（简单） */}
          {dayPlan.requiredNodes && (
            <div>
              <p>必游POI IDs: {dayPlan.requiredNodes.join(', ')}</p>
            </div>
          )}
          
          {/* 方式2: 使用 pois（完整信息，推荐） */}
          {dayPlan.pois && dayPlan.pois.length > 0 && (
            <div>
              <h4>POI列表:</h4>
              {dayPlan.pois.map(poi => (
                <div key={poi.id || poi.uuid}>
                  <p>{poi.nameCN || poi.nameEN}</p>
                  <p>类别: {poi.category}</p>
                  <p>评分: {poi.rating}</p>
                  <p>停留时间: {poi.durationMinutes} 分钟</p>
                  <p>必游: {poi.required ? '是' : '否'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

### 直接使用 API 方法

```typescript
import { routeDirectionsApi } from '@/api/route-directions';

// 查询模板列表
const templates = await routeDirectionsApi.queryTemplates({
  routeDirectionId: 1,
  durationDays: 7,
  isActive: true,
  limit: 10,
  offset: 0,
});

// 获取模板详情
const template = await routeDirectionsApi.getTemplateById(36);

// 处理POI数据
template.dayPlans.forEach(dayPlan => {
  // 优先使用 pois（完整信息）
  if (dayPlan.pois) {
    dayPlan.pois.forEach(poi => {
      console.log(`POI: ${poi.nameCN}`, {
        id: poi.id,
        required: poi.required,
        duration: poi.durationMinutes,
      });
    });
  }
  // 回退到 requiredNodes（简单）
  else if (dayPlan.requiredNodes) {
    console.log('POI IDs:', dayPlan.requiredNodes);
  }
});
```

### 禁用自动获取

```typescript
// 禁用自动获取，手动控制
const { templates, loading, error, refetch } = useRouteTemplates(
  { routeDirectionId: 1 },
  { enabled: false }
);

// 在需要时手动触发
const handleLoad = () => {
  refetch();
};
```

### 自动刷新

```typescript
// 每30秒自动刷新一次
const { templates, loading, error } = useRouteTemplates(
  { routeDirectionId: 1 },
  { refreshInterval: 30000 }
);
```

## 🔍 常见使用场景

### 场景1: 获取某个路线方向的所有模板

```typescript
const { templates } = useRouteTemplates({
  routeDirectionId: 1,
  isActive: true,
});
```

### 场景2: 获取7天行程的模板

```typescript
const { templates } = useRouteTemplates({
  durationDays: 7,
  isActive: true,
});
```

### 场景3: 分页获取模板列表

```typescript
const [page, setPage] = useState(1);
const pageSize = 10;

const { templates, loading } = useRouteTemplates({
  isActive: true,
  limit: pageSize,
  offset: (page - 1) * pageSize,
});
```

### 场景4: 获取模板详情并处理POI

```typescript
const { template } = useRouteTemplate(36);

// 处理 dayPlans 中的 POI
template?.dayPlans.forEach((dayPlan) => {
  // 方式1: 使用 requiredNodes（简单）
  if (dayPlan.requiredNodes) {
    console.log('POI IDs:', dayPlan.requiredNodes);
  }
  
  // 方式2: 使用 pois（完整信息，推荐）
  if (dayPlan.pois) {
    dayPlan.pois.forEach(poi => {
      console.log(`POI: ${poi.nameCN}`, {
        id: poi.id,
        required: poi.required,
        duration: poi.durationMinutes,
      });
    });
  }
});
```

## ⚠️ 注意事项

1. **数据格式**: 
   - `dayPlans` 统一返回对象数组格式: `[{day, theme, requiredNodes}, ...]`
   - 旧格式（嵌套数组 `[[], [], []]`）已由后端自动转换为新格式
   - **前端无需做格式转换**，直接使用返回的数据即可
   - 如果之前有格式转换逻辑，可以移除

2. **theme 字段**:
   - `theme` 字段可以正常保存和返回
   - 旧数据转换时 `theme` 可能为空，需要前端做条件渲染
   - 示例: `{dayPlan.theme && <span>{dayPlan.theme}</span>}`

3. **POI数据**: `dayPlans` 中可能同时包含 `requiredNodes` 和 `pois`，建议优先使用 `pois`（完整信息）

4. **节奏偏好**: `defaultPacePreference` 的值是 `RELAXED`、`BALANCED`、`INTENSE`（注意大小写）

5. **时间格式**: `createdAt` 和 `updatedAt` 是 ISO 8601 格式字符串

6. **错误处理**: Hook 会自动处理错误，通过 `error` 字段返回错误信息

7. **加载状态**: 使用 `loading` 字段判断是否正在加载

8. **手动刷新**: 使用 `refetch()` 方法手动刷新数据

## 🔄 数据格式变化说明

### 已改进（向后兼容）

**主要变化**:
- ✅ 统一返回对象数组格式: `[{day, theme, requiredNodes}, ...]`
- ✅ 之前可能返回嵌套数组 `[[], [], []]`，现在统一返回对象数组
- ✅ 支持主题字段 `theme`，可以正常保存和返回
- ✅ 旧数据转换时 `theme` 可能为空，需要手动补充

**自动兼容**:
- ✅ 旧格式数据会自动转换为新格式
- ✅ 前端无需修改代码（推荐）
- ✅ 后端已自动转换格式，前端可直接使用返回的数据

**前端适配建议**:
- ✅ **无需修改代码**（推荐）：后端已自动转换格式，前端可直接使用返回的数据
- ✅ **如果之前有格式转换逻辑，可以移除**
- ⚠️ **可选优化**：补充旧数据的 `theme` 字段
- ⚠️ **使用新的标准格式**创建/更新模板

## 📚 相关接口

- **查询路线模板列表**: `GET /api/route-directions/templates` ✅
- **获取路线模板详情**: `GET /api/route-directions/templates/:id` ✅
- **更新路线模板**: `PUT /api/route-directions/templates/:id` ✅
- **使用模板创建行程**: `POST /api/route-directions/templates/:id/create-trip` ✅

## ✅ 完成状态

- ✅ 类型定义已更新
- ✅ API 方法已实现
- ✅ React Hooks 已创建
- ✅ 导出配置已更新
- ✅ 文档已更新

所有接口对接已完成，可以直接使用！
