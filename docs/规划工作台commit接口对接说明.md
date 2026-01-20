# 规划工作台 Commit 接口对接说明

> 完成时间: 2025-01-XX  
> 接口路径: `POST /planning-workbench/plans/:planId/commit`  
> Swagger UI: http://localhost:3000/api-docs#/

---

## 📋 接口实现概览

### 接口信息

- **方法**: `POST`
- **路径**: `/planning-workbench/plans/:planId/commit`
- **完整 URL**: `http://localhost:3000/api/planning-workbench/plans/:planId/commit`
- **超时时间**: 30秒
- **认证**: 需要 Bearer Token

---

## 🔧 实现详情

### 1. 类型定义

**文件**: `src/api/planning-workbench.ts`

```typescript
/**
 * 提交方案选项
 */
export interface CommitPlanOptions {
  partialCommit?: boolean;      // 是否部分提交
  commitDays?: number[];         // 要提交的天数（如果部分提交）
}

/**
 * 提交方案请求
 */
export interface CommitPlanRequest {
  tripId: string;
  options?: CommitPlanOptions;
}

/**
 * 提交方案响应
 */
export interface CommitPlanResponse {
  tripId: string;
  planId: string;
  committedAt: string;
  changes: {
    added: number;
    modified: number;
    removed: number;
  };
}
```

### 2. API 方法实现

**方法名**: `commitPlan`

```typescript
commitPlan: async (
  planId: string,
  data: CommitPlanRequest
): Promise<CommitPlanResponse>
```

**实现特点**:
- ✅ 完整的错误处理
- ✅ 详细的日志记录
- ✅ 统一的响应格式处理
- ✅ 超时处理

### 3. 前端调用

**文件**: `src/pages/plan-studio/PlanningWorkbenchTab.tsx`

```typescript
const commitResult = await planningWorkbenchApi.commitPlan(
  result.planState.plan_id,
  {
    tripId,
    // 可选：部分提交
    // options: {
    //   partialCommit: true,
    //   commitDays: [1, 2, 3],
    // },
  }
);
```

---

## 📝 请求格式

### 请求 URL

```
POST /api/planning-workbench/plans/{planId}/commit
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| planId | string | 是 | 规划方案 ID |

### 请求体

```json
{
  "tripId": "trip-123",
  "options": {
    "partialCommit": false,
    "commitDays": [1, 2, 3]
  }
}
```

**字段说明**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| tripId | string | 是 | 行程 ID |
| options | object | 否 | 提交选项 |
| options.partialCommit | boolean | 否 | 是否部分提交（默认 false） |
| options.commitDays | number[] | 否 | 要提交的天数数组（仅在 partialCommit=true 时有效） |

---

## 📤 响应格式

### 成功响应

```json
{
  "success": true,
  "data": {
    "tripId": "trip-123",
    "planId": "plan-456",
    "committedAt": "2025-01-XXT10:30:00Z",
    "changes": {
      "added": 5,
      "modified": 3,
      "removed": 1
    }
  }
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

---

## 🧪 测试步骤

### 1. 启动后端服务

确保后端服务正在运行：

```bash
# 检查后端服务是否运行
curl http://localhost:3000/api/health
```

### 2. 访问 Swagger UI

打开浏览器访问：

```
http://localhost:3000/api-docs#/
```

### 3. 查找接口定义

在 Swagger UI 中查找：
- **路径**: `/planning-workbench/plans/{planId}/commit`
- **方法**: `POST`

### 4. 验证接口定义

对比 Swagger UI 中的接口定义与当前实现：

#### 需要验证的点：

1. **路径参数**
   - ✅ `planId` 是否在路径中
   - ✅ 参数名称是否一致

2. **请求体结构**
   - ✅ `tripId` 字段是否存在
   - ✅ `options` 字段结构是否一致
   - ✅ 字段类型是否匹配

3. **响应结构**
   - ✅ 响应是否包含 `success` 字段
   - ✅ 数据是否包装在 `data` 中
   - ✅ `changes` 对象结构是否一致

### 5. 使用 Swagger UI 测试

1. 在 Swagger UI 中找到接口
2. 点击 "Try it out"
3. 填写参数：
   - `planId`: 一个有效的规划方案 ID
   - 请求体: 包含 `tripId` 和可选的 `options`
4. 点击 "Execute"
5. 查看响应结果

### 6. 前端测试

1. 启动前端开发服务器
2. 导航到规划工作台页面
3. 生成一个规划方案
4. 点击"提交方案"按钮
5. 在确认对话框中点击"确认提交"
6. 验证：
   - ✅ 接口调用成功
   - ✅ 显示提交结果（新增/修改/删除的项数）
   - ✅ 行程数据已更新

---

## 🔍 接口差异处理

如果 Swagger UI 中的接口定义与当前实现不一致，请按以下步骤调整：

### 情况 1: 请求体结构不同

**如果 Swagger 中的请求体结构不同**，例如：

```typescript
// Swagger 中的定义
{
  "tripId": "trip-123",
  "partialCommit": false,  // 直接在根级别
  "commitDays": [1, 2, 3]   // 直接在根级别
}
```

**调整方法**:

修改 `CommitPlanRequest` 接口：

```typescript
export interface CommitPlanRequest {
  tripId: string;
  partialCommit?: boolean;      // 移到根级别
  commitDays?: number[];         // 移到根级别
}
```

### 情况 2: 响应结构不同

**如果 Swagger 中的响应结构不同**，例如：

```typescript
// Swagger 中的定义
{
  "tripId": "trip-123",
  "planId": "plan-456",
  "committedAt": "2025-01-XXT10:30:00Z",
  "added": 5,      // 直接在根级别
  "modified": 3,  // 直接在根级别
  "removed": 1    // 直接在根级别
}
```

**调整方法**:

修改 `CommitPlanResponse` 接口：

```typescript
export interface CommitPlanResponse {
  tripId: string;
  planId: string;
  committedAt: string;
  added: number;      // 移到根级别
  modified: number;  // 移到根级别
  removed: number;   // 移到根级别
}
```

并更新前端代码：

```typescript
toast.success(
  `方案已提交到行程！新增 ${commitResult.added} 项，修改 ${commitResult.modified} 项，删除 ${commitResult.removed} 项`
);
```

### 情况 3: 路径不同

**如果 Swagger 中的路径不同**，例如：

```
POST /planning-workbench/plans/:planId/commit-to-trip
```

**调整方法**:

修改 API 调用：

```typescript
const response = await apiClient.post<ApiResponseWrapper<CommitPlanResponse>>(
  `/planning-workbench/plans/${planId}/commit-to-trip`,  // 修改路径
  data,
  {
    timeout: 30000,
  }
);
```

---

## 📊 当前实现状态

### ✅ 已完成

- [x] 接口类型定义
- [x] API 方法实现
- [x] 前端调用集成
- [x] 错误处理
- [x] 日志记录
- [x] 用户反馈（Toast 消息）

### ⚠️ 待验证

- [ ] Swagger UI 中的接口定义
- [ ] 请求体结构一致性
- [ ] 响应结构一致性
- [ ] 实际接口调用测试

---

## 🚀 下一步行动

1. **启动后端服务**
   ```bash
   # 在后端项目目录中
   npm start
   # 或
   yarn start
   ```

2. **访问 Swagger UI**
   ```
   http://localhost:3000/api-docs#/
   ```

3. **对比接口定义**
   - 查看 Swagger UI 中的接口定义
   - 对比与当前实现的差异
   - 如有差异，按照上面的"接口差异处理"部分进行调整

4. **测试接口**
   - 使用 Swagger UI 测试接口
   - 在前端页面中测试完整流程

5. **更新文档**
   - 如果发现差异并进行了调整，请更新此文档
   - 记录实际的接口定义

---

## 📞 问题排查

### 问题 1: 无法访问 Swagger UI

**可能原因**:
- 后端服务未启动
- 端口号不正确
- Swagger UI 路径不同

**解决方法**:
```bash
# 检查后端服务是否运行
curl http://localhost:3000/api/health

# 尝试不同的 Swagger 路径
# http://localhost:3000/api-docs
# http://localhost:3000/api/docs
# http://localhost:3000/swagger
# http://localhost:3000/api/swagger
```

### 问题 2: 接口调用失败

**检查点**:
1. 后端服务是否运行
2. 认证 Token 是否有效
3. 请求参数是否正确
4. 网络连接是否正常

**调试方法**:
- 查看浏览器控制台的网络请求
- 查看后端日志
- 使用 Swagger UI 测试接口

---

## 📚 相关文档

- [API 接口对接情况](./API-接口对接情况.md)
- [规划工作台接口需求分析](./规划工作台接口需求分析.md)
- [规划工作台集成完成报告](./规划工作台集成完成报告.md)

---

**文档维护**: 请根据 Swagger UI 中的实际接口定义更新此文档。
