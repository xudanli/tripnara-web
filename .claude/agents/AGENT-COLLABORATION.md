# Agent 协作指南

本文档定义了 TripNARA 项目中 5 个 Agent 之间的协作机制、工作流程和接口契约。

## Agent 角色概览

1. **Brand Designer** - 视觉与品牌系统负责人
2. **前端 Design System 工程 Agent** - 设计系统代码化实现
3. **PlanStudioOrchestrator** - 后端服务层架构师
4. **Agent UI 集成工程 Agent** - Agent 系统 UI 实现
5. **协议与契约测试 Agent** - 测试与契约验证

## 协作关系图

```
┌─────────────────┐
│ Brand Designer  │ (设计规范定义)
└────────┬────────┘
         │ 设计规范
         ↓
┌─────────────────────────────┐
│ 前端 Design System 工程 Agent │ (组件实现)
└────────┬────────────────────┘
         │ 组件库
         ↓
┌─────────────────────────────┐
│  Agent UI 集成工程 Agent     │ (业务组件)
└────────┬────────────────────┘
         │ 使用组件 + 调用服务
         ↓
┌─────────────────────────────┐
│  PlanStudioOrchestrator     │ (服务层)
└────────┬────────────────────┘
         │ API 接口
         ↓
┌─────────────────────────────┐
│  协议与契约测试 Agent        │ (验证)
└─────────────────────────────┘
```

## 协作流程

### 流程 1: 新功能开发（设计 → 实现 → 测试）

#### 阶段 1: 设计规范定义
**负责人**: Brand Designer

**输入**:
- 产品需求
- 用户场景

**输出**:
- 设计规范文档（Token、组件规范、状态系统）
- 视觉原则和约束
- 设计资产（图标、动效参数）

**交付物格式**:
- Token 定义（Tailwind config 或 CSS 变量代码）
- 组件规范（Props、Variants、States）
- 图标规范（SVG 或 lucide-react 名称）
- 动效规范（Tailwind animate 类名或 CSS 代码）

**协作点**:
- 与 Design System Agent 确认技术可行性
- 与 Agent UI Agent 确认交互需求

---

#### 阶段 2: 组件实现
**负责人**: 前端 Design System 工程 Agent

**输入**:
- Brand Designer 的设计规范
- 现有组件库（`src/components/ui/`）

**输出**:
- 基础组件代码（`src/components/ui/`）
- 更新的 Token（`tailwind.config.js`、`src/styles/globals.css`）
- 组件文档和使用示例

**工作流程**:
1. 查看 Brand Designer 的设计规范
2. 检查现有组件，避免重复
3. 实现组件（遵循 shadcn/ui 模式）
4. 更新 Token 配置
5. 编写组件文档

**协作点**:
- 向 Brand Designer 反馈实现难点
- 向测试 Agent 提供组件测试用例
- 向 Agent UI Agent 提供使用示例

---

#### 阶段 3: 业务组件开发
**负责人**: Agent UI 集成工程 Agent

**输入**:
- Design System Agent 的基础组件
- PlanStudioOrchestrator 的服务接口
- 业务需求

**输出**:
- 业务组件（`src/components/agent/`、`src/components/trips/` 等）
- 状态管理逻辑
- 事件流处理

**工作流程**:
1. 查看 Design System Agent 的组件库
2. 查看 PlanStudioOrchestrator 的 API 定义
3. 实现业务组件（使用基础组件）
4. 实现状态管理和事件流
5. 集成 API 调用

**协作点**:
- 向 Design System Agent 请求新组件或组件扩展
- 向 PlanStudioOrchestrator 确认 API 接口
- 向测试 Agent 提供集成测试场景

---

#### 阶段 4: 服务层实现
**负责人**: PlanStudioOrchestrator

**输入**:
- Agent UI Agent 的接口需求
- 后端 API 定义

**输出**:
- 服务层代码（`src/services/orchestrator.ts`）
- TypeScript 类型定义
- API 调用封装

**工作流程**:
1. 查看 Agent UI Agent 的接口需求
2. 查看后端 API 文档
3. 定义 TypeScript 类型
4. 实现服务接口
5. 实现错误处理和重连策略

**协作点**:
- 向 Agent UI Agent 提供类型定义和使用示例
- 向测试 Agent 提供 Mock 数据需求

---

#### 阶段 5: 测试与验证
**负责人**: 协议与契约测试 Agent

**输入**:
- 所有 Agent 的代码和接口
- 设计规范
- API 契约

**输出**:
- 单元测试
- 集成测试
- 契约测试
- Mock 数据

**工作流程**:
1. 查看所有相关代码
2. 编写类型契约测试
3. 编写 API 契约测试
4. 编写组件测试
5. 创建 Mock 数据

**协作点**:
- 向所有 Agent 反馈测试结果
- 提供测试工具和最佳实践

---

### 流程 2: 问题修复（测试 → 定位 → 修复）

1. **测试 Agent 发现问题**
   - 运行测试，发现失败
   - 分析问题类型（类型不匹配、API 契约不一致、组件行为错误）

2. **定位问题 Agent**
   - 类型问题 → PlanStudioOrchestrator 或 Agent UI Agent
   - API 契约问题 → PlanStudioOrchestrator
   - 组件问题 → Design System Agent 或 Agent UI Agent
   - 设计问题 → Brand Designer

3. **修复问题**
   - 相关 Agent 修复问题
   - 测试 Agent 验证修复

---

### 流程 3: 设计系统扩展（设计 → 实现 → 测试）

1. **Brand Designer** 定义新的设计 Token 或组件规范
2. **Design System Agent** 实现新组件或扩展现有组件
3. **Agent UI Agent** 使用新组件
4. **测试 Agent** 验证新组件

---

## 接口契约

### 1. 设计规范 → 组件实现

**Brand Designer 输出格式**:
```typescript
// Token 定义
export const designTokens = {
  colors: { ... },
  spacing: { ... },
  radius: { ... }
}

// 组件规范
interface ComponentSpec {
  name: string;
  variants: Variant[];
  states: State[];
  props: Prop[];
}
```

**Design System Agent 输入要求**:
- Token 必须是可执行的代码（Tailwind config 或 CSS 变量）
- 组件规范必须包含完整的 TypeScript 类型定义
- 必须提供使用示例

---

### 2. 组件库 → 业务组件

**Design System Agent 输出格式**:
```typescript
// 组件代码
export const Component = React.forwardRef<HTMLElement, ComponentProps>(...)

// 类型定义
export interface ComponentProps { ... }

// 使用示例
// <Component variant="default" size="md" />
```

**Agent UI Agent 使用要求**:
- 必须使用基础组件，不重复实现
- 必须遵循组件的类型定义
- 必须使用 Design System 的 Token

---

### 3. 服务层 → UI 层

**PlanStudioOrchestrator 输出格式**:
```typescript
// 服务接口
export interface OrchestratorService {
  start(tripId: string, action: UserAction, params: Record<string, any>): Promise<OrchestrationResult>;
  stream(tripId: string, onEvent: (event: Event) => void): Promise<void>;
  // ...
}

// 类型定义
export interface OrchestrationResult { ... }
export type UserAction = 'add_place' | 'remove_place' | ...;
```

**Agent UI Agent 使用要求**:
- 必须使用服务接口，不直接调用后端 API
- 必须使用类型定义，确保类型安全
- 必须处理错误和边界情况

---

### 4. 代码 → 测试

**所有 Agent 输出要求**:
- 必须提供类型定义
- 必须提供使用示例
- 必须说明边界情况和错误处理

**测试 Agent 输入要求**:
- 类型定义必须完整
- API 接口必须有文档
- 组件必须有使用示例

---

## 协作规则

### 1. 依赖关系

- **Brand Designer** → **Design System Agent**: 设计规范必须先于组件实现
- **Design System Agent** → **Agent UI Agent**: 基础组件必须先于业务组件
- **PlanStudioOrchestrator** → **Agent UI Agent**: 服务接口必须先于 UI 调用
- **所有 Agent** → **测试 Agent**: 代码必须先于测试

### 2. 冲突解决

**设计 vs 实现冲突**:
- Brand Designer 和 Design System Agent 协商
- 如果技术不可行，Brand Designer 调整设计
- 如果设计必须坚持，Design System Agent 寻找技术方案

**API 契约冲突**:
- PlanStudioOrchestrator 和 Agent UI Agent 协商
- 如果后端 API 变更，PlanStudioOrchestrator 更新服务层
- 如果前端需求变更，PlanStudioOrchestrator 与后端协商

**类型不匹配**:
- 测试 Agent 发现问题
- 相关 Agent 修复类型定义
- 测试 Agent 验证修复

### 3. 沟通方式

**设计规范传递**:
- Brand Designer 使用代码格式输出（不是设计稿）
- Design System Agent 直接使用代码实现

**接口定义传递**:
- PlanStudioOrchestrator 使用 TypeScript 类型定义
- Agent UI Agent 直接使用类型定义

**问题反馈**:
- 使用代码注释或文档
- 使用类型错误提示
- 使用测试失败信息

---

## 最佳实践

### 1. 并行工作

**可以并行**:
- Brand Designer 定义设计规范 + PlanStudioOrchestrator 定义 API 接口
- Design System Agent 实现基础组件 + Agent UI Agent 设计业务组件结构
- 不同模块的开发（不相互依赖）

**必须串行**:
- 设计规范 → 组件实现
- 服务接口 → UI 调用
- 代码实现 → 测试编写

### 2. 版本控制

- 每个 Agent 修改文件时，必须确保不破坏现有功能
- 重大变更必须通知相关 Agent
- 使用 TypeScript 类型系统确保兼容性

### 3. 文档维护

- 每个 Agent 必须维护自己负责的文档
- 接口变更必须更新文档
- 使用示例必须保持最新

### 4. 测试优先

- 新功能开发时，测试 Agent 应该提前参与
- 接口定义时，应该同时定义测试用例
- 组件实现时，应该同时编写组件测试

---

## 具体协作场景

### 场景 1: 新增决策状态组件

1. **Brand Designer**: 定义 `GateStatusBanner` 组件的设计规范
   - 四态裁决的视觉表现（ALLOW / NEED_CONFIRM / SUGGEST_REPLACE / REJECT）
   - Token 定义（颜色、间距、图标）
   - 状态转换动效

2. **Design System Agent**: 实现 `GateStatusBanner` 基础组件
   - 创建 `src/components/ui/gate-status-banner.tsx`
   - 实现所有变体和状态
   - 更新 Token 配置

3. **Agent UI Agent**: 在业务组件中使用
   - 在 `AgentChat.tsx` 中使用 `GateStatusBanner`
   - 连接状态管理和事件流

4. **PlanStudioOrchestrator**: 提供状态数据
   - 在 `OrchestrationResult` 中包含 `gateStatus`
   - 定义 `GateStatus` 类型

5. **测试 Agent**: 验证组件
   - 测试组件渲染
   - 测试状态转换
   - 测试 API 契约

---

### 场景 2: 新增 API 接口

1. **PlanStudioOrchestrator**: 定义新接口
   - 定义 TypeScript 类型
   - 实现服务方法
   - 提供使用示例

2. **Agent UI Agent**: 使用新接口
   - 在业务组件中调用
   - 处理响应和错误

3. **测试 Agent**: 验证接口
   - 编写 API 契约测试
   - 创建 Mock 数据
   - 验证类型一致性

---

### 场景 3: 修复类型错误

1. **测试 Agent**: 发现类型错误
   - 运行类型检查
   - 定位错误位置

2. **相关 Agent**: 修复类型
   - 更新类型定义
   - 确保类型一致性

3. **测试 Agent**: 验证修复
   - 重新运行类型检查
   - 运行相关测试

---

## 工具支持

### 1. 代码搜索
所有 Agent 使用 `grep` 和 `codebase_search` 查找相关代码。

### 2. 文件读取
所有 Agent 使用 `read_file` 查看现有实现。

### 3. 类型检查
使用 TypeScript 编译器进行类型检查。

### 4. 测试运行
使用测试框架运行测试。

---

## 总结

这 5 个 Agent 通过清晰的职责划分和接口契约，形成了一个高效的协作体系：

- **Brand Designer** 定义设计规范
- **Design System Agent** 实现基础组件
- **PlanStudioOrchestrator** 提供服务接口
- **Agent UI Agent** 实现业务功能
- **测试 Agent** 确保质量

通过遵循本文档的协作流程和规则，可以确保项目的高质量交付和持续迭代。
