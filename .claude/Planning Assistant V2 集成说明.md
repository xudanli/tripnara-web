# Planning Assistant V2 集成说明

## 📦 依赖安装

项目使用了 `@tanstack/react-query` 进行状态管理，需要先安装依赖：

```bash
npm install @tanstack/react-query
```

## 🔧 React Query 配置

需要在 `src/main.tsx` 或 `src/App.tsx` 中添加 QueryClientProvider：

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30秒
      refetchOnWindowFocus: false,
    },
  },
});

// 在 App 组件外层包裹 QueryClientProvider
<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

## 🚀 路由配置

已添加路由：`/dashboard/planning-assistant-v2`

访问方式：
- 开发环境: `http://localhost:5173/dashboard/planning-assistant-v2`
- 生产环境: `https://tripnara.com/dashboard/planning-assistant-v2`

## 📁 文件结构

### API 层
```
src/api/planning-assistant-v2/
├── types.ts              # 类型定义
├── client.ts             # API客户端
├── sessions.ts           # 会话管理
├── chat.ts               # 对话接口
├── recommendations.ts    # 推荐接口
├── plans.ts              # 方案接口
├── trips.ts              # 行程接口
└── index.ts              # 统一导出
```

### Hooks 层
```
src/hooks/
├── usePlanningSessionV2.ts    # 会话管理
├── useChatV2.ts               # 对话
├── useAsyncTaskV2.ts          # 异步任务
├── useRecommendationsV2.ts    # 推荐
└── usePlansV2.ts              # 方案管理
```

### 组件层
```
src/components/planning-assistant-v2/
├── ChatPanel.tsx              # 对话面板
├── MessageBubble.tsx          # 消息气泡
├── LoadingStates.tsx          # 加载状态
├── ErrorBoundary.tsx          # 错误边界
├── RecommendationGrid.tsx     # 推荐网格
├── PlanCard.tsx               # 方案卡片
├── PlanComparison.tsx         # 方案对比
├── WelcomeScreen.tsx          # 欢迎界面
├── PlanningAssistant.tsx      # 主页面
└── index.ts                   # 统一导出
```

### 页面层
```
src/pages/planning-assistant-v2/
└── index.tsx                  # 页面入口
```

## 🔌 API 端点

所有 API 请求的基础路径：
- 开发环境: `http://localhost:3000/api/agent/planning-assistant/v2`
- 生产环境: `https://api.tripnara.com/api/agent/planning-assistant/v2`

## 📝 使用示例

### 在页面中使用主组件

```tsx
import { PlanningAssistant } from '@/components/planning-assistant-v2';
import { useAuth } from '@/hooks/useAuth';

function MyPage() {
  const { user } = useAuth();
  
  return (
    <div className="h-screen">
      <PlanningAssistant userId={user?.id} />
    </div>
  );
}
```

### 单独使用各个组件

```tsx
import { 
  ChatPanel, 
  RecommendationGrid, 
  PlanCard,
  WelcomeScreen 
} from '@/components/planning-assistant-v2';
```

### 使用 Hooks

```tsx
import { usePlanningSessionV2 } from '@/hooks/usePlanningSessionV2';
import { useChatV2 } from '@/hooks/useChatV2';

function MyComponent() {
  const { sessionId, createSession } = usePlanningSessionV2(userId);
  const { messages, sendMessage } = useChatV2(sessionId, userId);
  
  // ...
}
```

## ⚠️ 注意事项

1. **React Query 依赖**: 必须安装 `@tanstack/react-query` 并配置 QueryClientProvider
2. **认证**: 大部分接口需要 JWT Token，会自动从 sessionStorage 读取
3. **错误处理**: 已实现统一的错误处理和拦截器
4. **速率限制**: API 有速率限制，已在前端实现限流处理

## 🐛 故障排查

### 问题1: React Query 相关错误

**错误**: `useQuery must be used within a QueryClientProvider`

**解决**: 在 `src/main.tsx` 中添加 QueryClientProvider（见上方配置）

### 问题2: API 请求失败

**检查**:
1. 确认后端服务是否运行
2. 检查 API 基础路径配置
3. 查看浏览器控制台的网络请求

### 问题3: 认证失败

**检查**:
1. 确认用户已登录（sessionStorage 中有 accessToken）
2. 检查 Token 是否过期
3. 查看控制台的认证相关日志

## 📚 相关文档

- [Planning Assistant V2 API 完整接口文档](./docs/Planning%20Assistant%20V2%20API%20完整接口文档.md)
- [Planning Assistant V2 API 对接执行方案](./Planning%20Assistant%20V2%20API%20对接执行方案.md)
