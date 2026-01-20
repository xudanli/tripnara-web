# 规划工作台 Commit 接口测试指南

> 更新时间: 2025-01-XX  
> 接口: `POST /planning-workbench/plans/:planId/commit`

---

## 🧪 测试方法

### 方法 1: 使用测试脚本（推荐）

#### 1. 准备测试环境

```bash
# 确保后端服务运行
# 检查后端服务
curl http://localhost:3000/api/health

# 或访问 Swagger UI
open http://localhost:3000/api-docs#/
```

#### 2. 获取 Access Token

**方式 A: 从浏览器获取**
1. 打开浏览器开发者工具（F12）
2. 进入 Application/Storage → Session Storage
3. 找到 `accessToken` 的值
4. 复制 token

**方式 B: 通过登录接口获取**
```bash
# 使用邮箱登录获取 token
curl -X POST http://localhost:3000/api/auth/email/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com", "code": "123456"}'
```

#### 3. 运行测试脚本

```bash
# 设置环境变量
export ACCESS_TOKEN="your-access-token-here"
export TEST_PLAN_ID="plan-123"  # 可选，使用实际的 planId
export TEST_TRIP_ID="trip-123"  # 可选，使用实际的 tripId

# 运行测试
npx ts-node test-planning-workbench-commit.ts

# 或使用 node
node --loader ts-node/esm test-planning-workbench-commit.ts
```

---

### 方法 2: 使用 Swagger UI

#### 1. 访问 Swagger UI

```
http://localhost:3000/api-docs#/
```

#### 2. 查找接口

在 Swagger UI 中找到：
- **路径**: `/planning-workbench/plans/{planId}/commit`
- **方法**: `POST`

#### 3. 测试接口

1. 点击接口展开详情
2. 点击 "Try it out" 按钮
3. 填写参数：
   - `planId`: 一个有效的规划方案 ID（例如：`plan-123`）
   - 请求体:
     ```json
     {
       "tripId": "trip-123",
       "options": {
         "partialCommit": false
       }
     }
     ```
4. 点击 "Execute" 执行
5. 查看响应结果

---

### 方法 3: 使用 curl 命令

```bash
# 设置变量
PLAN_ID="plan-123"
TRIP_ID="trip-123"
ACCESS_TOKEN="your-access-token"

# 发送请求
curl -X POST "http://localhost:3000/api/planning-workbench/plans/${PLAN_ID}/commit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{
    \"tripId\": \"${TRIP_ID}\",
    \"options\": {
      \"partialCommit\": false
    }
  }"
```

---

### 方法 4: 前端页面测试

#### 1. 启动前端开发服务器

```bash
npm run dev
# 或
yarn dev
```

#### 2. 访问规划工作台页面

```
http://localhost:5173/dashboard/plan-studio?tripId=your-trip-id&tab=workbench
```

#### 3. 测试流程

1. **生成方案**
   - 点击"生成方案"按钮
   - 等待方案生成完成
   - 查看三人格评估结果

2. **提交方案**
   - 点击"提交方案"按钮
   - 在确认对话框中查看方案信息
   - 点击"确认提交"
   - 查看提交结果（Toast 消息）

3. **验证结果**
   - 检查浏览器控制台的网络请求
   - 查看响应数据
   - 验证行程数据是否已更新

---

## 🔍 验证点

### 1. 请求验证

- ✅ 请求 URL 正确
- ✅ 请求方法为 POST
- ✅ 请求头包含 `Authorization: Bearer {token}`
- ✅ 请求体格式正确
- ✅ `planId` 在路径参数中
- ✅ `tripId` 在请求体中

### 2. 响应验证

- ✅ 状态码为 200
- ✅ 响应包含 `success: true`
- ✅ 响应数据在 `data` 字段中
- ✅ 包含以下字段：
  - `tripId`
  - `planId`
  - `committedAt`
  - `changes.added`
  - `changes.modified`
  - `changes.removed`

### 3. 功能验证

- ✅ 方案成功提交到行程
- ✅ 行程数据已更新
- ✅ 前端显示提交结果
- ✅ 错误处理正常工作

---

## 🐛 常见问题

### 问题 1: 401 Unauthorized

**原因**: Token 无效或已过期

**解决方法**:
1. 重新登录获取新的 token
2. 检查 token 是否正确设置
3. 检查 token 格式：`Bearer {token}`

### 问题 2: 404 Not Found

**原因**: 接口路径不正确或后端未实现

**解决方法**:
1. 检查 Swagger UI 中的实际路径
2. 确认后端服务已启动
3. 检查路径参数是否正确

### 问题 3: 400 Bad Request

**原因**: 请求参数不正确

**解决方法**:
1. 检查请求体格式
2. 确认 `tripId` 和 `planId` 是否有效
3. 查看错误响应中的详细信息

### 问题 4: 500 Internal Server Error

**原因**: 后端服务器错误

**解决方法**:
1. 查看后端日志
2. 检查数据库连接
3. 确认数据完整性

---

## 📊 测试检查清单

### 代码实现检查

- [x] 接口类型定义完整
- [x] API 方法实现正确
- [x] 错误处理完善
- [x] 日志记录详细
- [x] 前端调用集成

### 功能测试检查

- [ ] 正常提交测试通过
- [ ] 部分提交测试通过（如果支持）
- [ ] 错误情况处理正确
- [ ] 前端 UI 交互正常
- [ ] 数据更新验证通过

### 接口规范检查

- [ ] 请求格式符合 Swagger 定义
- [ ] 响应格式符合 Swagger 定义
- [ ] 错误响应格式正确
- [ ] 认证机制正常工作

---

## 📝 测试报告模板

```markdown
## 测试报告

**测试时间**: 2025-01-XX
**测试人员**: XXX
**后端版本**: XXX
**前端版本**: XXX

### 测试环境
- 后端 URL: http://localhost:3000
- 前端 URL: http://localhost:5173
- Swagger UI: http://localhost:3000/api-docs#/

### 测试结果

#### 1. 正常提交测试
- ✅/❌ 状态: 
- 请求参数: 
- 响应数据: 
- 备注: 

#### 2. 部分提交测试（如果支持）
- ✅/❌ 状态: 
- 请求参数: 
- 响应数据: 
- 备注: 

#### 3. 错误情况测试
- ✅/❌ 状态: 
- 测试场景: 
- 错误响应: 
- 备注: 

#### 4. 前端 UI 测试
- ✅/❌ 状态: 
- 测试步骤: 
- 结果: 
- 备注: 

### 发现的问题
1. 
2. 

### 建议
1. 
2. 
```

---

## 🚀 快速测试命令

```bash
# 一键测试（需要先设置 ACCESS_TOKEN）
export ACCESS_TOKEN="your-token" && \
export TEST_PLAN_ID="plan-123" && \
export TEST_TRIP_ID="trip-123" && \
npx ts-node test-planning-workbench-commit.ts
```

---

**文档维护**: 请根据实际测试结果更新此文档。
