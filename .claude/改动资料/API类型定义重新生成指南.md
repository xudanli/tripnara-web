# API 类型定义重新生成指南

**日期**: 2025-01-14  
**目的**: 当后端 API 类型发生变化时，如何重新生成或更新前端的类型定义

---

## 📋 当前状态

**状态**: ✅ 类型定义是手动维护的（后端暂未提供 OpenAPI 文档）

**快速检查类型错误**:
```bash
npm run type-check        # 只检查类型，不构建
npm run generate:types    # 显示类型生成说明
```

**主要类型定义文件**:
- `src/api/agent.ts` - Agent API 类型定义
- `src/api/trips.ts` - 行程相关 API 类型定义
- `src/types/trip.ts` - 行程相关类型定义
- `src/types/clarification.ts` - 澄清问题类型定义
- 其他 API 文件...

---

## 🔧 方法一：从后端 OpenAPI/Swagger 文档自动生成（推荐）

如果后端提供了 OpenAPI/Swagger 文档，可以使用工具自动生成类型定义。

### 1. 安装代码生成工具

```bash
# 使用 openapi-typescript-codegen（推荐，生成 TypeScript 类型）
npm install --save-dev openapi-typescript-codegen

# 或者使用 openapi-generator
npm install --save-dev @openapitools/openapi-generator-cli
```

### 2. 获取后端 OpenAPI 文档

**方式 A：从后端服务获取**
```bash
# 如果后端提供了 OpenAPI 端点
curl http://localhost:3000/api/openapi.json > openapi.json

# 或者 Swagger 格式
curl http://localhost:3000/api/swagger.json > swagger.json
```

**方式 B：从后端仓库获取**
```bash
# 如果后端仓库中有 OpenAPI 文件
# 从后端项目复制 openapi.yaml 或 openapi.json 到前端项目
```

### 3. 配置生成脚本

在 `package.json` 中添加生成脚本：

```json
{
  "scripts": {
    "generate:types": "openapi-typescript-codegen --input ./openapi.json --output ./src/api/generated",
    "generate:types:watch": "openapi-typescript-codegen --input ./openapi.json --output ./src/api/generated --watch"
  }
}
```

### 4. 运行生成命令

```bash
# 生成类型定义
npm run generate:types

# 或者使用 watch 模式（自动监听文件变化）
npm run generate:types:watch
```

### 5. 使用生成的类型

```typescript
// 导入生成的类型
import type { RouteAndRunResponse } from '@/api/generated';
import { AgentApi } from '@/api/generated';

// 使用生成的 API 客户端
const agentApi = new AgentApi();
const response = await agentApi.routeAndRun(request);
```

---

## 🔧 方法二：手动更新类型定义（当前方式）

如果后端没有提供 OpenAPI 文档，或者需要自定义类型，可以手动更新。

### 1. 确定需要更新的类型

**检查后端 API 变更**：
- 查看后端代码或文档
- 查看后端 PR/Commit 中的类型变更
- 与后端工程师确认 API 变更

### 2. 更新类型定义文件

**示例：更新 `src/api/agent.ts`**

```typescript
// 如果后端添加了新字段
export interface RouteAndRunResponse {
  request_id: string;
  route: RouteDecision;
  ui_state?: {
    phase?: OrchestrationStep;
    ui_status?: UIStatus;
    progress_percent?: number;
    message?: string;
    requires_user_action?: boolean;
    // 新增字段
    clarification_questions?: ClarificationQuestion[];  // ✅ 新增
    consent_required?: boolean;  // ✅ 新增
  };
  result: {
    status: ResultStatus;
    answer_text: string;
    payload?: {
      // 新增字段
      newField?: string;  // ✅ 新增
      // ...
    };
  };
  // ...
}
```

### 3. 更新相关的类型文件

如果类型在其他文件中定义，也需要同步更新：

```typescript
// src/types/clarification.ts
export interface ClarificationQuestion {
  id: string;
  question: string;
  type: ClarificationQuestionType;
  // 新增字段
  validation?: ClarificationQuestionValidation;  // ✅ 新增
  // ...
}
```

### 4. 验证类型定义

```bash
# 运行 TypeScript 类型检查
npm run build

# 或者只检查类型（不构建）
npx tsc --noEmit
```

---

## 🔧 方法三：使用类型兼容层（临时方案）

如果后端类型暂时无法同步，可以使用类型兼容层作为临时方案。

### 1. 创建类型兼容文件

创建 `src/types/api-compat.d.ts`：

```typescript
/**
 * API 类型兼容层
 * 用途：临时解决后端类型变更导致的类型不匹配问题
 * 注意：这是临时方案，应该尽快更新实际的类型定义
 */

declare module "@/api/agent" {
  // 扩展 RouteAndRunResponse 类型
  export interface RouteAndRunResponse {
    ui_state?: {
      // 如果后端新增了字段但前端类型定义还没更新
      clarification_questions?: unknown[];
      consent_required?: boolean;
      [k: string]: unknown;  // 允许其他未知字段
    };
  }

  // 如果缺少某些导出，在这里补充
  export type NewType = {
    // ...
  };
}
```

### 2. 在 tsconfig.json 中包含兼容文件

```json
{
  "compilerOptions": {
    // ...
  },
  "include": [
    "src",
    "src/types/api-compat.d.ts"  // 包含兼容文件
  ]
}
```

---

## 📝 最佳实践

### 1. 类型定义维护流程

1. **后端变更时**：
   - 后端工程师更新 OpenAPI 文档（如果有）
   - 前端工程师运行 `npm run generate:types` 重新生成
   - 检查生成的类型是否有问题
   - 提交类型定义更新

2. **手动维护时**：
   - 与后端工程师确认 API 变更
   - 更新对应的类型定义文件
   - 运行类型检查确保没有错误
   - 更新相关使用该类型的代码

### 2. 类型定义检查清单

- [ ] 所有新增字段都已添加到类型定义
- [ ] 所有删除的字段都已从类型定义中移除
- [ ] 字段类型是否正确（string, number, boolean, object, array）
- [ ] 可选字段使用 `?` 标记
- [ ] 运行 `npm run build` 没有类型错误
- [ ] 相关使用该类型的代码已更新

### 3. 类型定义文件组织

```
src/
├── api/
│   ├── agent.ts          # Agent API 类型定义
│   ├── trips.ts          # 行程 API 类型定义
│   ├── generated/        # 自动生成的类型（如果使用代码生成）
│   └── ...
├── types/
│   ├── trip.ts           # 行程相关类型
│   ├── clarification.ts  # 澄清问题类型
│   ├── api-compat.d.ts   # 类型兼容层（临时）
│   └── ...
```

---

## 🚨 常见问题

### Q1: 如何知道后端类型有变化？

**A**: 
- 查看后端 PR/Commit 中的 API 变更
- 查看后端 OpenAPI 文档的变更历史
- 与后端工程师沟通
- 运行时遇到类型错误时发现

### Q2: 生成的类型定义与手动定义冲突怎么办？

**A**: 
- 优先使用生成的类型定义（更准确）
- 如果生成的类型有问题，可以：
  1. 修复后端 OpenAPI 文档
  2. 使用类型兼容层临时解决
  3. 手动调整生成的类型（不推荐，下次生成会覆盖）

### Q3: 如何确保类型定义与后端一致？

**A**: 
- 使用自动生成工具（方法一）
- 定期与后端工程师同步
- 在 CI/CD 中添加类型检查
- 使用类型兼容层作为临时方案

### Q4: 类型定义更新后，代码报错怎么办？

**A**: 
1. 检查类型定义是否正确
2. 更新使用该类型的代码
3. 如果类型定义有问题，使用类型兼容层临时解决
4. 与后端工程师确认正确的类型定义

---

## 📋 快速参考

### 更新 Agent API 类型

```bash
# 1. 获取最新的 OpenAPI 文档
curl http://localhost:3000/api/openapi.json > openapi.json

# 2. 重新生成类型
npm run generate:types

# 3. 检查类型错误
npm run build
```

### 手动更新类型定义

1. 编辑 `src/api/agent.ts`
2. 更新 `RouteAndRunResponse` 接口
3. 运行 `npm run build` 检查错误
4. 修复类型错误
5. 提交更改

---

## 🔗 相关资源

- [OpenAPI TypeScript Codegen](https://github.com/ferdikoomen/openapi-typescript-codegen)
- [OpenAPI Generator](https://openapi-generator.tech/)
- [TypeScript Handbook - Type Declarations](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)

---

**最后更新**: 2025-01-14  
**维护者**: 前端团队
