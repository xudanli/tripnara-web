# TripNARA 产品故事

**作者：Danny（Principal PM）**  
**日期：2024年**

---

## 一、我们是谁

我是 **Danny**，资深旅行科技产品负责人，曾在 Google Maps、Meta、Microsoft 的出行与 AI 平台团队负责关键产品，现就职于 OpenAI 负责 ChatGPT 相关旅行规划能力的产品化。

我加入 TripNARA 的使命只有一个：**将"决策型旅行"（Decision-first Travel）从理念转化为可执行的产品**。

---

## 二、我们面临的问题

### 传统旅行 App 的困境

想象一下，你计划去冰岛环岛旅行。打开任何一个传统旅行 App，你会看到：

1. **推荐更多地点**：App 会给你一个长长的景点列表，按"热门"排序
2. **你来做选择**：从 50 个景点中，你自己决定去哪些
3. **你承担风险**：如果路线不可行、天气恶劣、体力不支，那是你的问题
4. **执行时才发现问题**：到了现场才发现路线不通、时间不够、风险太高

**问题本质**：传统 App 只做"推荐"，不做"判断"。它们把决策责任推给了用户，而用户往往缺乏足够的信息和专业知识来做正确的判断。

### 真实世界的复杂性

一条路线是否"应该存在"，取决于：

- **物理可行性**：地形、海拔、天气、可达性
- **时间可行性**：交通班次、开放时间、换乘 buffer
- **能力匹配**：体力、经验、装备
- **风险控制**：安全阈值、应急预案、退出点
- **预算约束**：真实价格、预订可用性

这些信息分散在：
- DEM 地形数据
- 交通时刻表 API
- POI 开放时间数据库
- 天气预警系统
- 用户能力模型

**传统 App 无法整合这些信息，更无法做出"是否应该存在"的判断。**

---

## 三、我们的解决方案：TripNARA

### 核心理念：决策优先（Decision-first）

**TripNARA 不是推荐更多地点，而是判断路线是否应该存在。**

我们的工作流程：

1. **Should-Exist Gate（路线存在性门控）**
   - 在生成行程之前，先判断：这条路线，现在，对你，在这些条件下，是否应该存在？
   - 由 **Abu**（GatekeeperAgent）负责：安全与现实守门
   - 输出：`GateResult`（ALLOW / BLOCK / ADJUST_REQUIRED / NEED_USER_CONFIRM）

2. **可执行行程生成**
   - 只有当 Gate = ALLOW 或 ADJUST_REQUIRED 时，才生成结构化行程
   - 包含：交通班次/票务、POI、开放时间、预订链接、紧急点位
   - 必须包含：时间窗 + 地点 + 可达性证据 + 开放时间/票务证据

3. **三人格决策系统**
   - **Abu**：安全与现实守门（"这条路，真的能走吗？"）
   - **Dr.Dre**：节奏与体感（"别太累，我会让每天刚刚好"）
   - **Neptune**：空间结构修复（"如果这里不行，我帮你找替代方案"）
   - 所有决策归因到三人格，用户看到的是"可解释的裁决"

4. **决策日志与可解释性**
   - 每个步骤的决策都记录在 `DecisionLogEntry` 中
   - 关联 `evidence_refs`（证据引用）
   - 用户可以看到：为什么这样判断？依据是什么？有什么替代方案？

### 技术架构

**统一入口**：`POST /agent/route_and_run` → `agentApi.routeAndRun()`（定义在 `src/api/agent.ts`）

**三种路由模式**：
- **SYSTEM1_API**：快速 API 调用（简单查询）
- **SYSTEM1_RAG**：RAG 检索增强（知识库查询）
- **SYSTEM2_REASONING**：深度推理（复杂规划）
- **SYSTEM2_WEBBROWSE**：网页浏览（实时信息）

**多智能体协作**：
- PlannerAgent、GatekeeperAgent、LocalInsightAgent、NarratorAgent、ComplianceAgent、CoreDecisionAgent
- 通过 `RouteAndRunRequest` 和 `RouteAndRunResponse` 传递状态
- 所有决策归因到三人格

---

## 四、用户旅程

### 阶段 1：初识（Discovery）

**用户状态**：想旅行但感到不确定，不想走流水线，想"认真一点"

**痛点**：
- 传统 App 给太多选择，不知道哪个靠谱
- 担心路线不可行，但缺乏专业知识判断
- 想要"认真规划"，而不是"随便选选"

**进入 TripNARA**：用户发现这不是一个"推荐更多地点"的 App，而是一个"判断路线是否应该存在"的系统。

### 阶段 2：认知（Understanding）

**用户发现**：哦，这不是旅游 App，这是——**路线责任系统**。

**信任建立**：
- 看到三人格（Abu/Dr.Dre/Neptune）的决策过程
- 看到证据抽屉（Evidence Drawer）中的真实数据
- 看到决策日志（Decision Log）中的推理过程

**心理变化**：从"我要自己做决定"到"我可以信任这个系统"。

### 阶段 3：能力建模（Profile Building）

**系统要求**：完成 3 个问题，生成 `HumanCapabilityModel`

**问题示例**：
- 你的体力水平？（IRON_LEGS / ACTIVE_SENIOR / CITY_POTATO / LIMITED）
- 你的旅行经验？
- 你的风险偏好？

**输出**：`PacingConfig`、`BudgetConfig`、`MobilityTag`

### 阶段 4：路线策略制定（RouteDirection Selection）

**系统给出**：
- 最优方向（基于 DEM 地形、可达性、时刻表）
- 解释（为什么这个方向？）
- 风险提示（Abu 的警告）
- 替代方案（Neptune 的 Plan B）

**用户感受**：理性 + 人性。不是冷冰冰的算法，而是有温度的建议。

### 阶段 5：协同构建（Route Building）

**关键差异**：用户参与，不是消费。TripNARA 像伙伴，不像"导游"。

**交互方式**：
- 用户可以通过 `POST /agent/route_and_run` 与系统对话
- 系统会识别 `NEED_MORE_INFO` 状态，要求澄清
- 系统会提供 `clarificationInfo`（缺失服务、影响、解决方案）
- 用户可以看到 `DecisionLogEntry`，理解每个决策

**Plan Studio 工作台**：
- 可视化行程结构
- 三人格卡片展示决策
- 证据抽屉展示数据来源
- 支持调整、优化、修复

### 阶段 6：风险预案与准备（Execution Preparation）

**系统提供**：
- 风险兜底（极端天气、安全、救援）
- 预算监控（实时跟踪、预警）
- 节奏平衡（Dr.Dre 的体感控制）
- 替补方案（Neptune 的 Plan B）

**心理安全感**：用户知道，即使出现问题，系统也有预案。

### 阶段 7：路线执行（Travel Execution）

**持续守护**：
- Abu：实时监控安全风险（天气、地形、能力匹配）
- Dr.Dre：监控节奏和体力（配速、缓冲、最晚折返时间）
- Neptune：提供修复建议（延误、体能下降、替代方案）

**执行页（On-trail Live）**：
- 实时地图（离线优先）
- 状态条（距离/爬升进度、预计到达时间、日落倒计时）
- 风险卡（Abu）、节奏卡（Dr.Dre）、修复卡（Neptune）
- 事件记录（到达/离开/休息/跳过/替换/风险）

### 阶段 8：成果回顾（Review）

**系统提供**：
- 执行摘要（实际距离、耗时、爬升、完成日期）
- 海拔剖面上的事件钉子（延误、体能崩、风大、涉水、折返点）
- 洞察（高光、摩擦点、节奏、安全、决策）
- 锚点规则（"风速 > 12m/s 的暴露山脊不走"）

**价值留存**：旅程被理解，经验被沉淀，下次规划更准确。

---

## 五、核心价值主张

### 1. 决策优先，而非推荐优先

**传统 App**：推荐更多地点 → 用户选择 → 用户承担风险

**TripNARA**：判断路线是否应该存在 → 生成可执行行程 → 系统承担责任

### 2. 可解释性，而非黑盒

**传统 App**：算法推荐，但不知道为什么

**TripNARA**：
- 决策日志（`DecisionLogEntry`）记录每个步骤
- 证据引用（`evidence_refs`）指向数据来源
- 三人格归因（Abu/Dr.Dre/Neptune）解释决策逻辑

### 3. 可执行性，而非理想化

**传统 App**：理想化的行程，执行时才发现问题

**TripNARA**：
- 交通班次/票务验证
- POI 开放时间验证
- 可达性验证（DEM 地形、换乘 buffer）
- 疲劳阈值验证（体力模型）

### 4. 责任边界，而非免责声明

**传统 App**：免责声明，出了问题不负责

**TripNARA**：
- 明确的风险提示（Abu 的硬门控）
- 审批流程（`NEED_CONFIRMATION` + `SuspensionInfo`）
- 人工兜底（极端情况）
- 但：系统承担责任，而非推卸责任

---

## 六、品牌宣言

**TripNARA 不是卖旅行，是认真对待"路应该怎么走"。**

我们相信：
- **旅行不是逃离现实**，而是以更体面、更成熟的方式面对世界
- **路线成立，我们才推荐**——这是我们对世界的承诺

---

## 七、技术实现

### 前端架构

- **技术栈**：Vite + React 18 + TypeScript
- **状态管理**：React Hooks（无 Redux/Pinia）
- **组件库**：Radix UI + shadcn/ui
- **样式**：Tailwind CSS

### 关键文件

- **Agent API**：`src/api/agent.ts`（`routeAndRun` 方法）
- **Orchestrator 服务**：`src/services/orchestrator.ts`（`PlanStudioOrchestrator` 类）
- **类型定义**：
  - `src/types/trip.ts`（行程相关类型）
  - `src/types/suggestion.ts`（建议/洞察类型）
  - `src/api/agent.ts`（Agent 相关类型）

### 核心接口

**统一入口**：`POST /agent/route_and_run`

**请求**：`RouteAndRunRequest`
```typescript
{
  request_id: string;
  user_id: string;
  trip_id?: string | null;
  message: string;
  conversation_context?: ConversationContext;
  options?: AgentOptions;
}
```

**响应**：`RouteAndRunResponse`
```typescript
{
  request_id: string;
  route: RouteDecision;
  result: {
    status: ResultStatus;  // OK | NEED_MORE_INFO | NEED_CONSENT | NEED_CONFIRMATION | FAILED | TIMEOUT
    answer_text: string;
    payload?: {
      suspensionInfo?: SuspensionInfo;  // 审批挂起信息
      clarificationInfo?: ClarificationInfo;  // 澄清信息
    };
  };
  explain: {
    decision_log: DecisionLogItem[];
  };
  observability: ObservabilityMetrics;
}
```

---

## 八、未来愿景

### 短期（3-6个月）

- **完善三人格决策系统**：提升 Abu/Dr.Dre/Neptune 的决策准确性
- **扩展数据源**：整合更多 DEM 地形、交通时刻表、POI 开放时间数据
- **优化用户体验**：简化 Plan Studio 工作台，提升决策日志可读性

### 中期（6-12个月）

- **多语言支持**：扩展到更多国家和地区
- **专业用户支持**：为旅行顾问、徒步领队、户外向导提供专业工具
- **API 开放**：允许第三方集成 TripNARA 的决策能力

### 长期（1-3年）

- **成为行业标准**：定义"决策型旅行"的标准和最佳实践
- **生态建设**：与保险公司、救援机构、交通公司建立合作关系
- **AI 能力提升**：利用大模型提升决策的准确性和可解释性

---

## 九、结语

**TripNARA 的使命**：让每一次旅行都建立在"路线应该存在"的判断之上，而非"推荐更多地点"的堆砌之上。

**我们的承诺**：
- **决策优先**：先判断，再推荐
- **可执行优先**：只推荐真正能执行的路线
- **安全与可达性门控优先**：Abu 守护安全底线
- **解释与责任优先**：每个决策都有依据，每个判断都有归因

**这不是一个 App，这是一个系统。**  
**这不是推荐，这是判断。**  
**这不是消费，这是协作。**

---

**Danny**  
**Principal PM, TripNARA**  
**2024年**
