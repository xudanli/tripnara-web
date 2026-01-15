# 创建行程规划流程 PRD 文档目录

**产品经理：Danny**  
**日期：2025-01-14**  
**基于文档**：
- `创建行程规划流程设计思路.md`
- `创建行程规划流程-关键问题澄清-2025-01-14.md`
- `规划智能体流程思路.md`

---

## PRD 文档目录

### 0.1 项目背景与问题定义（Why Now）

### 0.2 目标与成功指标（North Star & Metrics）

### 0.3 用户与场景（Persona / JTBD / User Journey）

### 0.4 需求范围（In/Out）与约束（数据、合规、设备、地区）

### 0.5 竞品与对标（如涉及必须搜索核验）

### 0.6 总体方案概览（端到端闭环图：输入→门控→生成→执行→反馈）
- 使用 `POST /agent/route_and_run` 接口
- 使用 `src/services/orchestrator.ts` 服务层（如需要）

### 0.7 关键流程（用户流 + 系统流 + 异常流）
- 路由类型（SYSTEM1_API / SYSTEM1_RAG / SYSTEM2_REASONING / SYSTEM2_WEBBROWSE）
- 结果状态处理（OK / NEED_MORE_INFO / NEED_CONSENT / NEED_CONFIRMATION / FAILED / TIMEOUT / REDIRECT_REQUIRED）

### 0.8 核心能力：Should-Exist Gate（路线存在性决策）
- GatekeeperAgent（Abu）职责
- 决策日志格式（`DecisionLogEntry`）
- 三人格评审流程

### 0.9 核心能力：可执行行程（交通/票务/开放时间/预订链接）
- 数据结构：`TripDetail`、`TripDay`、`ItineraryItem`（参考 `src/types/trip.ts`）
- 证据收集与验证

### 0.10 核心能力：结构化澄清问题（Structured Clarification Questions）
- 问题类型：text/single_choice/multi_choice/date/number
- 数据结构：`ClarificationQuestion`、`ClarificationAnswer`
- 前端组件设计
- 向后兼容：`clarificationMessage` 格式

### 0.11 页面与交互设计（信息架构、组件、状态、文案）
- 创建行程页面（/dashboard/trips/new）
- 澄清问题交互界面
- 行程预览页面（Gate 评估结果展示）
- 三人格卡片（Abu/Dr.Dre/Neptune）
- 决策日志展示
- 参考现有组件：`src/components/planning-workbench/PersonaCard.tsx`

### 0.12 数据模型与字段字典（Entity/字段/来源/校验/状态机）
- `RouteAndRunRequest`、`RouteAndRunResponse`（参考 `src/api/agent.ts`）
- `TripDetail`、`TripDay`、`ItineraryItem`（参考 `src/types/trip.ts`）
- `ClarificationQuestion`、`ClarificationAnswer`（新增）
- `OrchestrationResult`（参考 `src/services/orchestrator.ts`）

### 0.13 多智能体与决策日志（Planner/Narrator/Compliance/Insight/CoreDecision）
- Sub-Agents 协作流程
- 三人格映射规则（`PersonaType`，参考 `src/types/suggestion.ts`）
- 决策日志格式（`DecisionLogEntry`，参考 `src/api/agent.ts`）

### 0.14 服务端与接口（API、权限、缓存、降级、容灾）
- `POST /agent/route_and_run` 接口（参考 `src/api/agent.ts`）
- 路由策略（SYSTEM1 vs SYSTEM2）
- 降级策略
- 审批流程（`NEED_CONFIRMATION` + `SuspensionInfo`）

### 0.15 埋点与数据分析（事件、漏斗、A/B、质量监控）
- Trace 信息：`RouteAndRunResponse.observability`（参考 `src/api/agent.ts`）
- 结构化日志字段

### 0.16 风控、合规与责任边界（提示、免责声明、人工兜底）
- ComplianceAgent 职责
- 风险提示规则
- 审批流程（`NEED_CONFIRMATION`）

### 0.17 灰度发布与运营配置（开关、策略、后台、实验）
- Feature Flags（如需要）
- 路由策略配置

### 0.18 测试方案与验收标准（用例、边界、性能、可用性）
- API 契约测试（参考 `src/api/agent.ts`）
- 类型安全测试（TypeScript）
- 结构化澄清问题的测试用例

### 0.19 风险清单与对策（技术/数据/体验/合规/成本）

### 0.20 里程碑与资源评估（排期、角色、依赖）

### 0.21 术语表与FAQ（Glossary）

---

**下一步**：请输入 `/开始` 按照以上 PRD 文档目录进行撰写，或指定章节号（如 `/开始 0.1`）
