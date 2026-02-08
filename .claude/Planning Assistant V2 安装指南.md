# Planning Assistant V2 安装和配置指南

## 📦 步骤 1: 安装依赖

项目使用了 `@tanstack/react-query` 进行状态管理，需要先安装：

```bash
npm install @tanstack/react-query
```

## ✅ 步骤 2: 验证配置

### 2.1 React Query Provider 配置

已在 `src/main.tsx` 中添加了 QueryClientProvider，配置如下：

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30秒内不重新获取
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});
```

### 2.2 路由配置

已在 `src/App.tsx` 中添加路由：

```tsx
<Route path="planning-assistant-v2" element={<PlanningAssistantV2Page />} />
```

访问路径: `/dashboard/planning-assistant-v2`

## 🚀 步骤 3: 启动项目

```bash
npm run dev
```

访问: `http://localhost:5173/dashboard/planning-assistant-v2`

## 📋 已完成的工作清单

### ✅ API 层
- [x] API 客户端配置 (`src/api/planning-assistant-v2/client.ts`)
- [x] 类型定义 (`src/api/planning-assistant-v2/types.ts`)
- [x] 会话管理接口 (`src/api/planning-assistant-v2/sessions.ts`)
- [x] 对话接口 (`src/api/planning-assistant-v2/chat.ts`)
- [x] 推荐接口 (`src/api/planning-assistant-v2/recommendations.ts`)
- [x] 方案接口 (`src/api/planning-assistant-v2/plans.ts`)
- [x] 行程接口 (`src/api/planning-assistant-v2/trips.ts`)

### ✅ Hooks 层
- [x] `usePlanningSessionV2` - 会话管理
- [x] `useChatV2` - 对话功能
- [x] `useAsyncTaskV2` - 异步任务轮询
- [x] `useRecommendationsV2` - 推荐查询
- [x] `usePlansV2` - 方案管理

### ✅ 组件层
- [x] `ChatPanel` - 对话面板
- [x] `MessageBubble` - 消息气泡
- [x] `LoadingStates` - 加载状态组件集合
- [x] `ErrorBoundary` - 错误边界
- [x] `RecommendationGrid` - 推荐网格
- [x] `PlanCard` - 方案卡片
- [x] `PlanComparison` - 方案对比
- [x] `WelcomeScreen` - 欢迎界面
- [x] `PlanningAssistant` - 主页面组件

### ✅ 页面和路由
- [x] 页面组件 (`src/pages/planning-assistant-v2/index.tsx`)
- [x] 路由配置 (`src/App.tsx`)
- [x] React Query Provider (`src/main.tsx`)

## 🔍 测试检查清单

### 功能测试
- [ ] 创建会话
- [ ] 发送消息
- [ ] 接收AI回复
- [ ] 获取推荐
- [ ] 生成方案（同步）
- [ ] 生成方案（异步）
- [ ] 对比方案
- [ ] 确认方案
- [ ] 错误处理

### UI/UX 测试
- [ ] 消息气泡显示正常
- [ ] 加载状态显示正常
- [ ] 错误提示显示正常
- [ ] 响应式布局正常
- [ ] 动画效果正常

### 性能测试
- [ ] 页面加载速度
- [ ] API 请求响应时间
- [ ] 内存使用情况
- [ ] 网络请求优化

## 🐛 常见问题

### Q1: 页面显示空白或报错

**可能原因**:
1. 未安装 `@tanstack/react-query`
2. QueryClientProvider 未正确配置

**解决方法**:
```bash
npm install @tanstack/react-query
```
然后检查 `src/main.tsx` 是否正确配置了 QueryClientProvider。

### Q2: API 请求失败

**检查项**:
1. 后端服务是否运行
2. API 基础路径是否正确
3. 认证 Token 是否存在
4. 网络连接是否正常

**调试方法**:
- 打开浏览器开发者工具
- 查看 Network 标签页
- 检查请求 URL 和响应状态码

### Q3: 类型错误

**解决方法**:
```bash
npm run type-check
```

确保所有类型定义正确。

## 📚 相关文档

- [Planning Assistant V2 API 完整接口文档](../docs/Planning%20Assistant%20V2%20API%20完整接口文档.md)
- [Planning Assistant V2 API 对接执行方案](./Planning%20Assistant%20V2%20API%20对接执行方案.md)
- [Planning Assistant V2 集成说明](./Planning%20Assistant%20V2%20集成说明.md)

## 🎯 下一步

1. 安装依赖: `npm install @tanstack/react-query`
2. 启动项目: `npm run dev`
3. 访问页面: `http://localhost:5173/dashboard/planning-assistant-v2`
4. 测试功能: 按照测试检查清单逐一测试
5. 优化体验: 根据实际使用情况调整 UI 和交互
