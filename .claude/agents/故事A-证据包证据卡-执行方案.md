[项目] 故事 A（证据包 + 证据卡 + 禁用模式剪枝）执行方案

本文档面向 **产品 / 交互&HCI / 视觉 / 前端工程 / 契约测试** 的协作落地，目标是在不引入额外依赖的前提下，用最小改动跑通 **用户故事 A**，并具备可验收、可观测、可回滚的交付形态。

---

## 0. 背景与目标（Why Now）

- **背景**：`POST /api/agent/route_and_run` 已在服务端引入 **C1 证据体系**，输出：
  - **可校验**：`result.payload.evidence_bundle`（verification + failure_reason_codes）
  - **可解释**：`result.payload.ui_display.evidence_cards_ui`（前端可直渲染）
  - **可审计**：`result.payload.decision_metadata.evidence_cards`（逻辑/审计层）
- **目标**：前端在“规划/重算”场景中，能够 **渲染证据卡**、展示 **证据包状态**、并对 `emergency_constraints.forbidden_modes` 的 **剪枝结果做验收与兜底**。
- **非目标（本期不强依赖）**：
  - 协商闭环（`confirm_negotiation`）仅 **预留入口**，不阻塞故事 A
  - 时间轴/回滚（`itinerary_revision_timeline` / `rollback*`）不阻塞故事 A

---

## 1. 用户故事 A（端到端）

- **用户**：在规划工作台/行程详情页使用“规划/重算”
- **输入**：自然语言指令 + 强约束（例如禁用 DRIVE）
- **输出（必须同时满足）**：
  - **证据包存在**，且 `verification_status` 可用于三态展示
  - **证据卡存在**（至少一份：UI cards 或审计 cards）
  - **候选剪枝**：禁用 mode 的方案不应出现在候选/替代方案中
  - **严格模式失败**（5xx）时，前端要提示“不可验收输出”，并携带 `request_id` 便于排障

---

## 2. 必接接口与字段（前端契约）

### 2.1 必接：规划/重算统一入口

- **接口**：`POST /api/agent/route_and_run`
- **说明**：该接口为 **直出 DTO**（非 `successResponse` 包装）
- **请求必填（缺失必须 400）**
  - **`request_id: string`**（前端生成）
  - **`user_id: string`**（必填非空；匿名传 `"anonymous"`）
  - **`message: string`**
- **故事 A 关键可选**
  - `trip_id?: string | null`
  - `options?: { max_seconds?, max_steps?, execution_mode? }`
  - **`emergency_constraints?: { forbidden_modes?: string[]; preferred_modes?: string[]; max_wind_speed_tolerance_mps?: number; reason_code?: string; ... }`**

### 2.2 故事 A 必读字段（Response）

- **证据包（可校验）**
  - **位置**：`result.payload.evidence_bundle`
  - **必读字段**：
    - **`verification_status`**：`VERIFIED | PARTIALLY_VERIFIED | UNVERIFIED | FAILED | ...`
    - **`failure_reason_codes?: string[]`**
- **证据卡（可解释）**
  - **展示层（优先渲染）**：`result.payload.ui_display.evidence_cards_ui`
  - **逻辑/审计层**：`result.payload.decision_metadata.evidence_cards`
- **候选剪枝（验收）**
  - **位置**：`result.payload.candidates` / `result.payload.alternatives`
  - **验收**：当请求传 `emergency_constraints.forbidden_modes=["DRIVE"]` 时，候选中不应出现包含 DRIVE 的方案

---

## 3. UI 信息架构（HCI 原则落地）

以 **渐进式披露（Progressive Disclosure）** 为硬规则：

- **默认层（第一眼）**：只展示
  - **证据包状态 badge**（绿/黄/红三态 + 失败原因码入口）
  - **证据卡数量**
- **展开层（第二眼）**：展示证据卡列表（最多 20 条，避免信息过载，符合 Miller/Hick）
- **审计层（第三眼）**：证据 refs、failure reason codes、details JSON（仅在用户主动展开时出现）

交互与可用性约束：

- **点击目标** ≥ 44×44px（Fitts）
- 选项数量控制（Hick）：默认不超过 20 张卡 + 每张卡 bullets 不超过 6
- 错误提示必须可恢复：5xx → 建议重试/缩小范围，并提供 request_id

---

## 4. 视觉规范（与 TripNARA “克制可信”一致）

- 状态色使用 **描边 + badge + icon**，避免大面积情绪化色块
- 证据是美学：信息层级优先于装饰
- 证据卡组件应可复用，避免“为一次性功能做一次性 UI”

推荐状态映射：

- **PASS/VERIFIED（绿）**：稳定通过
- **WARN/PARTIAL/UNVERIFIED/STALE（黄）**：可用但需注意
- **BLOCK/FAILED（红）**：不可验收输出（严格模式下通常直接 5xx）

---

## 5. 前端实现分工（工程落地清单）

### 5.1 已落地（代码）

- **类型补齐**：`src/api/agent.ts`
  - `evidence_bundle`、`decision_metadata.evidence_cards`、`ui_display.evidence_cards_ui`
- **证据卡组件**：`src/components/agent/IronShieldEvidenceCards.tsx`
- **接入 AgentChat**：`src/components/agent/AgentChat.tsx`
- **协商 409 提示增强**：`src/components/agent/NegotiationDialog.tsx`

### 5.2 本期需要补齐（若要“故事 A 候选剪枝验收”完整闭环）

1) **候选列表 UI（可选）**
   - 若前端展示 `candidates/alternatives`：
     - **前端兜底过滤**：剔除包含 `forbidden_modes` 的方案（双保险）
     - 若过滤后为空：展示“无可用候选（受强约束影响）”

2) **严格模式 5xx 专用提示（必选）**
   - 统一文案：**“本次结果证据不足/校验失败，请重试或缩小范围”**
   - UI 中展示：**request_id**

---

## 6. 埋点与观测（最小可用）

事件建议（命名可按现有规范调整）：

- **`agent_route_and_run_submit`**
  - props：`request_id`、`trip_id`、`forbidden_modes`、`max_seconds`、`max_steps`
- **`agent_evidence_bundle_received`**
  - props：`request_id`、`verification_status`、`failure_reason_codes_count`
- **`agent_evidence_cards_rendered`**
  - props：`request_id`、`cards_ui_count`、`cards_audit_count`
- **`agent_strict_bundle_failed`**
  - props：`request_id`、`http_status`、`error_message`
- **`agent_candidates_pruned`**（若有候选列表）
  - props：`request_id`、`forbidden_modes`、`before_count`、`after_count`

---

## 7. 测试与验收标准（可直接勾选）

### 7.1 请求校验
- [ ] `user_id` 缺失/空字符串 → **400**
- [ ] `request_id` 缺失 → **400**
- [ ] `message` 缺失 → **400**

### 7.2 成功返回（OK）
- [ ] 响应中存在 **`result.payload.evidence_bundle`**
- [ ] 响应中存在 **`result.payload.ui_display.evidence_cards_ui` 或 `result.payload.decision_metadata.evidence_cards`**
- [ ] 证据包状态 badge 正确（绿/黄/红）

### 7.3 forbidden_modes 剪枝（验收用例）
- [ ] 请求携带 `emergency_constraints.forbidden_modes=["DRIVE"]`
- [ ] 若 UI 展示候选：候选中不出现包含 DRIVE 的方案
- [ ] 若候选为空：有清晰文案提示“受强约束影响”

### 7.4 严格模式失败（5xx）
- [ ] 5xx 时前端提示“不可验收输出”
- [ ] UI/日志可定位到 `request_id`

---

## 8. 风险与对策

- **风险**：后端枚举值与前端三态映射不一致（例如 `PARTIAL/STALE`）
  - **对策**：前端对未知值回退到 `neutral/warn`，但仍展示原始 status 字符串
- **风险**：证据 cards 过多导致认知过载
  - **对策**：默认折叠 + 限制展示条数 + bullets 截断
- **风险**：严格模式 5xx 被误当作“系统故障”
  - **对策**：错误文案明确“证据不足/校验失败”，并引导重试/缩小范围

