# TripNARA Advisor Workspace 顾问工作台 PRD

**文档类型**：产品需求文档  
**版本**：V1.0  
**阶段**：Gate 1 验证型产品 → Gate 2 受控 MVP  
**受众**：产品、设计、前端、后端、AI/数据、测试、运营  
**关联实现**：
- 前端：`src/features/gate1/` · `src/lib/gate1-workbench.ts`
- API：`docs/api/gate1-frontend-integration.md`
- 并行产品：Participant Portal · `docs/api/participant-portal-frontend-integration.md`

**最后更新**：2026-06-25

---

## 1. 产品定位

Advisor Workspace 面向 **Professional Leader、Agency Advisor** 的复杂旅行项目**决策工作台**。顾问保留最终决策权；系统负责汇总约束、暴露冲突、比较策略、证明可执行性并记录结果。

**不等同于**：旅行社 ERP、CRM、供应商采购、预订支付、公开旅行项目市场。

### 核心原则

| 原则 | 说明 |
|------|------|
| Decision-first | 围绕问题、约束、候选、选择、结果组织 |
| Advisor-in-control | AI/运营建议，顾问批准/修改/拒绝 |
| Privacy-safe | 业务输出仅展示脱敏约束 |
| Evidence-based | 冲突与建议可追溯证据 |
| Human-assisted transparent | 人工协助必须显式标注 |
| Progressive automation | 只自动化 Gate 1 证明有价值的步骤 |

### Gate 1 北极星

TripNARA **实际改变一个重要决策**，且顾问**愿意继续提供下一单**的真实复杂订单数。

---

## 2. 用户与角色

| 角色 | 责任 |
|------|------|
| Advisor / Professional Leader | 冲突处理、方案选择、决策记录 |
| Agency Admin | 组织、团队、项目总览、权限审计 |
| Operations | 邀请、Readiness 跟进 |
| Privacy Analyst | 私密约束脱敏 |
| TripNARA Analyst | Gate 1 人工协助交付 |

---

## 3. 信息架构（P0）

### 一级导航

| 导航 | 路由（前端） | 状态 |
|------|-------------|------|
| 工作台首页 | `/dashboard/gate1` | ✅ V0.1 |
| 客户项目 | `/dashboard/gate1/projects` | ✅ |
| 数据与实验 | `/dashboard/gate1/metrics` | ✅ |
| 运营人工协助 | `/dashboard/ops/gate1` | ✅ |
| 风险与准备（跨项目） | — | P1 |
| 团队 / 机构设置 | Agency 空间等 | P1 |

### 项目详情二级导航

| Tab | 前端 tab 参数 | 状态 |
|-----|--------------|------|
| 概览 | `overview`（默认） | ✅ V0.1 |
| Baseline | `baseline` | ✅ |
| 成员与约束 | `members` | ✅ |
| 冲突中心 | `conflicts` | ✅ V0.1 独立 Tab |
| 候选方案 | `candidates` | ✅ V0.1 独立 Tab |
| Readiness | `readiness` | ✅ |
| Plan B | `plan-b` | ✅ |
| 决策记录 | `decision` | ✅ |
| 执行结果 | `outcome` | ✅ |

---

## 4. Gate 1 P0 范围

- 机构/专业用户进入顾问工作台
- 项目列表、创建、Cohort 与 Baseline
- 成员邀请、填写进度、脱敏约束摘要
- 人工协助输出（冲突、候选）+ 来源标识
- 顾问决策记录（material change）
- Readiness、Plan B、Outcome
- Gate 1 实验看板

---

## 5. 前端实现映射

| PRD 能力 | 组件 / 模块 |
|----------|------------|
| 工作台首页 | `Gate1WorkbenchPage` · `gate1-workbench.ts` |
| 项目概览 | `Gate1ProjectOverviewPanel` |
| 冲突中心 | `Gate1ConflictsPanel` |
| 候选方案 | `Gate1CandidatesPanel` |
| 人工协助标识 | `Gate1HumanAssistedBadge` |
| 决策表单 | `Gate1DecisionForm` + `validateGate1DecisionForm` |

### 待办推断逻辑（列表级）

`inferGate1NextAction()` 按 `experimentStatus` 推荐单一最重要动作，供首页待办与项目概览使用。细粒度 blocker / 完成率依赖项目详情 API 与 advisor outputs。

---

## 6. P1 / 明确不做

**P1**：机构组合看板、Readiness blocker 任务分配、Plan B 触发通知、方案版本 diff 回放、Decision Pattern。

**不做**：完整 CRM、供应商采购/支付、自动以顾问名义发商业消息、全自动危机决策、公开项目市场、强制固定数量冲突/Plan B。

---

## 7. 验收用例（P0 摘录）

| 编号 | 场景 | 前端验收点 |
|------|------|-----------|
| AC-01 | 创建 Planning 项目 + Baseline | 创建后进入概览 Tab |
| AC-02 | 成员完成状态 | 成员 Tab 与 Portal 一致 |
| AC-05 | 人工冲突报告 | 冲突 Tab 显示人工协助标识 |
| AC-06 | 比较两个方案 | 候选 Tab 展示 trade-off |
| AC-08 | 提交决策记录 | 决策 Tab material change 校验 |
| AC-10 | Gate 指标 | 看板 Cohort 分母隔离 |

---

## 8. Gate 1 → Gate 2 Hard Gate（摘录）

- Planning 完成 ≥8 单；Readiness/Execution ≥3 单
- 邀请接受率、偏好填写率 ≥50%
- 重要决策改变率 ≥50%
- 参与机构下一单/继续 ≥50%
- 真实付费承诺 ≥1 家；重大隐私事故 0

---

完整 23 章正文见产品团队 V1.0 评审稿（2026-06）。
