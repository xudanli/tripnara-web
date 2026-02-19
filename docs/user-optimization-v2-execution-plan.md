# 用户端优化系统 V2 设计研发执行计划

**文档类型**: 设计研发执行计划  
**版本**: 1.0.0  
**编制**: 设计研发团队  
**依据**: 技术方案 + PRD  
**最后更新**: 2026-02-15

---

## 1. 执行总览

### 1.1 目标

基于用户端 API 文档、技术方案与 PRD，完成前端功能的补全、整合与体验优化。

### 1.2 现状与差距

| 领域 | 现状 | 待办 |
|------|------|------|
| API 层 | 客户端、类型、Hooks 已实现 | — |
| 数据转换 | — | 实现 `tripDetailToRoutePlanDraft`、`buildWorldModelContext` |
| 页面集成 | 行程页部分引用优化组件 | 补全集成、打通数据流 |
| 计划工作台 | 有 OptimizationDashboard | 确保完整接入、计划对比 |
| What-If | — | 接入比较与风险评估 |
| 执行页 | — | 实时状态、实地报告 |
| 团队 | TeamManagementPanel 已存在 | 与行程页、工作台打通 |
| 反馈/报告 | FeedbackForm、FieldReportForm 已存在 | 接入行程/执行页流程 |

### 1.3 里程碑

| 里程碑 | 时间 | 交付物 |
|--------|------|--------|
| M1: 数据层与核心优化 | 第 1–2 周 | 转换工具、行程页完整优化流程 |
| M2: 比较与反馈 | 第 3 周 | 计划对比、反馈表单接入 |
| M3: 团队与实时高级能力 | 第 4–5 周 | 团队流程打通、实时预测与实地报告 |

---

## 2. 分阶段执行计划

### 阶段 1：数据层与核心优化 (第 1–2 周)

#### 2.1.1 数据转换工具 [2d]

**责任人**: 前端开发  
**产出**: `src/utils/plan-converters.ts`、`src/utils/world-context-builder.ts`

**任务清单**:

- [ ] 实现 `tripDetailToRoutePlanDraft(trip, routeDirectionId?)`
  - 从 `TripDetail.itineraryItems` 聚合每日 segments
  - 生成 `metadata.totalDays`、`startDate`、`endDate`
- [ ] 实现 `buildWorldModelContext(trip, userProfile?, routeDirection?, overrides?)`
  - 聚合 physical / human / routeDirection
  - 定义合理的 DEFAULT 值
- [ ] 补充单元测试 (Vitest/Jest)
- [ ] 在 `optimization-v2` 相关代码中接入转换逻辑

**依赖**: `TripDetail`、`WorldModelContext` 等类型已存在

---

#### 2.1.2 行程页优化流程整合 [3d]

**责任人**: 前端开发  
**产出**: `trips/[id]` 页完整优化能力

**任务清单**:

- [ ] 在行程详情页获取 `plan`、`world` 时调用转换工具
- [ ] 将 `OptimizationDashboard` 或等价组件嵌入合适 Tab/区域
- [ ] 实现「采纳优化结果」：将 `optimizedPlan` 写回行程 (调用行程更新 API)
- [ ] 评估、优化、风险、协商卡片与真实数据打通
- [ ] Loading / Error 状态与重试逻辑
- [ ] 确保 `RealtimeStatusBanner` 在行程页正确展示，使用 `autoInit=true`

**验收**:

- 用户可对当前计划一键评估
- 一键优化后可见变更列表，并可采纳
- 协商结果与风险评估正常展示
- 实时状态 Banner 在有 tripId 时显示

---

#### 2.1.3 错误与边界处理 [1d]

**责任人**: 前端开发  
**产出**: 统一错误封装与用户提示

**任务清单**:

- [ ] 定义 `OptimizationApiError` 或等效错误类型
- [ ] 在 `apiClient` 拦截器中映射 4xx/5xx 到业务错误码
- [ ] 为常见错误提供 i18n 文案（如「评估失败，请稍后重试」）
- [ ] 限流/超时时给出明确提示

---

### 阶段 2：计划对比与反馈 (第 3 周)

#### 2.2.1 计划比较视图 [2d]

**责任人**: 前端开发  
**产出**: `PlanComparisonView` 与 What-If / 工作台集成

**任务清单**:

- [ ] 在 What-If 页或计划工作台提供「比较两个计划」入口
- [ ] 选择 planA、planB（可从草稿、历史、当前计划中选择）
- [ ] 调用 `optimizationApi.compare`，展示 `PlanComparisonView`
- [ ] 展示 preferredPlan、utilityDifference、各维度对比
- [ ] 若 `PlanComparisonView` 组件未完全接入，补齐 props 与样式

**验收**:

- 用户可选择两个计划并查看对比结果
- 维度对比清晰，优胜方突出显示

---

#### 2.2.2 反馈表单接入 [2d]

**责任人**: 前端开发  
**产出**: 行程结束/执行中反馈入口

**任务清单**:

- [ ] 在行程页或执行页添加入口（如「行程反馈」「报告疲劳」）
- [ ] 使用 `FeedbackForm` 组件，支持多种 `FeedbackType`
- [ ] 根据类型切换表单字段（满意度、疲劳、修改类型、完成率等）
- [ ] 提交后调用 `optimizationApi.submitFeedback`，展示成功提示
- [ ] 行程完成/提前终止时引导用户填写反馈

**验收**:

- 用户可提交满意度、疲劳、修改、完成等反馈
- 提交成功有明确反馈

---

#### 2.2.3 自定义权重 [1d]

**责任人**: 前端开发  
**产出**: 评估时支持自定义权重

**任务清单**:

- [ ] 在评估卡片或设置中增加「权重调整」入口
- [ ] 提供 8 维权重 slider，总和校验为 1
- [ ] 评估请求携带 `weights` 参数
- [ ] 展示 `weightsUsed` 与得分变化

---

### 阶段 3：团队与实时高级能力 (第 4–5 周)

#### 2.3.1 团队流程打通 [3d]

**责任人**: 前端开发  
**产出**: 团队创建 → 关联行程 → 团队协商

**任务清单**:

- [ ] 团队列表/创建入口（可从设置或行程页进入）
- [ ] 行程关联团队：行程支持选择 `teamId`，保存到行程数据
- [ ] 若行程有关联团队，展示 `TeamManagementPanel` 或协商入口
- [ ] 团队协商：传入 plan、world，展示 `memberEvaluations`、`conflicts`、`teamConstraintsSatisfied`
- [ ] 团队权重与约束展示：`getWeights`、`getConstraints` 结果集成到 UI

**验收**:

- 用户可创建团队并关联到行程
- 团队协商可正常发起并展示结果
- 权重与约束（含最弱链）正确展示

---

#### 2.3.2 实时预测与订阅 [2d]

**责任人**: 前端开发  
**产出**: 预测视图、SSE 订阅

**任务清单**:

- [ ] 在行程页或执行页增加「未来 N 小时预测」入口
- [ ] 调用 `getState/:tripId/predict?hoursAhead=24`，展示 `PredictedStateResponse`
- [ ] 展示 feasibility、riskFactors、weather 均值/方差
- [ ] 执行中场景：调用 `subscribe`，建立 SSE 连接，接收事件更新
- [ ] 离开页面时取消订阅，释放 `EventSource`

**验收**:

- 用户可查看未来状态预测
- 订阅后能收到实时事件更新

---

#### 2.3.3 实地报告 [2d]

**责任人**: 前端开发  
**产出**: 执行页实地报告完整流程

**任务清单**:

- [ ] 在执行页添加「实地报告」入口（如浮窗或快捷按钮）
- [ ] 使用 `FieldReportForm`，支持 WEATHER / ROAD_STATUS / HAZARD / HUMAN_STATE
- [ ] 根据类型展示对应字段（condition、roadCondition、hazardType、feeling、symptoms 等）
- [ ] 提交后调用 `realtimeApi.submitReport`，展示 `thanksMessage`
- [ ] 可选：报告后触发状态刷新

**验收**:

- 用户可提交天气、路况、危险、体能等报告
- 提交成功有感谢提示

---

### 阶段 4：设计优化与收尾 (第 6 周)

#### 2.4.1 设计走查与优化 [2d]

**责任人**: 设计 + 前端  
**产出**: 视觉与交互优化

**任务清单**:

- [ ] 走查评估/协商/风险/团队/实时各组件的视觉一致性
- [ ] 统一色彩语义（成功/警告/危险）、图标、间距
- [ ] 移动端适配（关键页面可读、可操作）
- [ ] 无障碍：焦点顺序、ARIA、键盘操作

---

#### 2.4.2 文档与交付 [1d]

**责任人**: 全员  
**产出**: 更新文档、交付清单

**任务清单**:

- [ ] 更新技术方案中的「现有实现清单」
- [ ] 补充 README 或集成说明（如何接入优化、团队、实时）
- [ ] 产出功能演示录屏或截图
- [ ] 代码 Review、合并、标记版本

---

## 3. 设计规范与组件约定

### 3.1 视觉规范

| 用途 | 颜色/样式 |
|------|-----------|
| 高效用/低风险 | 绿色系 |
| 中等 | 黄色/琥珀色 |
| 低效用/高风险 | 红色系 |
| 中性/信息 | 灰色/蓝色 |

### 3.2 组件复用

优先使用已有组件：

- `PlanEvaluationCard`、`NegotiationResultCard`、`RiskAssessmentCard`
- `RealtimeStatusBanner`、`TeamManagementPanel`、`OptimizationDashboard`
- `PlanComparisonView`、`FeedbackForm`、`FieldReportForm`

新增组件需符合现有设计系统（如 shadcn/ui、Tailwind）。

### 3.3 国际化

所有新增文案需加入 `src/locales/en/translation.json` 与 `src/locales/zh/translation.json`，使用 `useTranslation`。

---

## 4. 风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| 后端 API 尚未就绪 | 阻塞联调 | 使用 MSW 模拟接口先行开发 |
| 行程数据结构与 API 不完全匹配 | 转换复杂 | 在转换层做适配，保持页面逻辑简单 |
| 实时 SSE 连接不稳定 | 体验下降 | 提供轮询降级，并优化重连策略 |
| 团队创建流程复杂 | 完成率低 | 提供模板（如家庭 4 人），简化首次创建 |

---

## 5. 交付清单 (Checklist)

### 代码

- [ ] `src/utils/plan-converters.ts`
- [ ] `src/utils/world-context-builder.ts`
- [ ] `trips/[id]` 优化流程整合
- [ ] What-If / 计划工作台 计划比较
- [ ] 执行页 实时状态 + 实地报告
- [ ] 团队流程打通
- [ ] 反馈表单接入
- [ ] 错误处理与 i18n

### 文档

- [ ] 技术方案 (`docs/api/user-optimization-v2-technical-spec.md`)
- [ ] PRD (`docs/user-optimization-v2-prd.md`)
- [ ] 本执行计划 (`docs/user-optimization-v2-execution-plan.md`)
- [ ] 集成说明（可选）

### 测试

- [ ] 转换工具单元测试
- [ ] 关键流程手工测试
- [ ] 移动端与无障碍抽查

---

## 6. 附录：任务与工时估算

| 阶段 | 任务 | 工时 |
|------|------|------|
| 1 | 数据转换工具 | 2d |
| 1 | 行程页优化整合 | 3d |
| 1 | 错误与边界处理 | 1d |
| 2 | 计划比较视图 | 2d |
| 2 | 反馈表单接入 | 2d |
| 2 | 自定义权重 | 1d |
| 3 | 团队流程打通 | 3d |
| 3 | 实时预测与订阅 | 2d |
| 3 | 实地报告 | 2d |
| 4 | 设计走查与优化 | 2d |
| 4 | 文档与交付 | 1d |
| **合计** | | **约 21 人日** |
