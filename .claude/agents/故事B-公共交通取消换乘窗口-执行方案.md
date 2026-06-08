[项目] 用户故事 B（公共交通取消/换乘窗口不可能）前端跑通执行方案

本文档面向 **产品 / 交互&HCI / 视觉 / 前端工程 / 契约测试** 联合落地，目标是让前端可以稳定复现并验收：

- **PT_CANCELLED**（公共交通取消）
- **PT_TRANSFER_GAP_VIOLATION**（换乘窗口不足：planned < required）
- 以及对应的 **auto-heal**（给出可行替代，常见为 DRIVE）或 **被约束阻断** 的分支

---

## 0. 范围与依赖（Story B 最小闭环）

- **必接接口**：`POST /api/agent/route_and_run`
- **按产品形态选接**（当 auto-heal 触发“需要你确认”）：
  - `POST /api/agent/confirm_negotiation`（当 `result.status=NEED_CONFIRMATION` 且存在 `negotiation_payload`）
- **不阻塞 Story B**（可选增强）：
  - 时间轴/回滚相关接口

---

## 1. Story B 的请求怎么构造（两层信号：自然语言 + 引擎约束）

### 1.1 目标
尽量让后端 **“确实走 PT 研究”** 并产出 PT hard fact/证据与原因码。推荐 **两层信号同时表达**：

- **自然语言（强烈建议）**：message 明确写“只坐公共交通/不要开车/不要打车”
- **引擎约束（建议）**：`emergency_constraints.preferred_modes / forbidden_modes`

### 1.2 模板 1（推荐）：偏好公共交通，允许 auto-heal 出 DRIVE 备选（正向验收）

```json
{
  "request_id": "req_pt_heal_001",
  "user_id": "user_123",
  "trip_id": "trip_456",
  "message": "我优先公共交通出行；如果班次取消或换乘来不及，请自动给可行替代方案并说明原因。",
  "options": { "max_seconds": 60, "max_steps": 8 },
  "emergency_constraints": {
    "preferred_modes": ["TRANSIT"],
    "reason_code": "PT_STORY_B_HEAL_ALLOWED"
  }
}
```

### 1.3 模板 2：偏好公共交通 + 禁止 DRIVE（验证“heal 被约束阻断”的负向验收）

```json
{
  "request_id": "req_pt_no_drive_001",
  "user_id": "user_123",
  "trip_id": "trip_456",
  "message": "我只坐公共交通，绝对不要开车；如果公共交通不可行，请提示我需要确认。",
  "options": { "max_seconds": 60, "max_steps": 8 },
  "emergency_constraints": {
    "preferred_modes": ["TRANSIT"],
    "forbidden_modes": ["DRIVE"],
    "reason_code": "PT_STORY_B_HEAL_BLOCKED"
  }
}
```

**关键注意（会直接影响 auto-heal 能否给 DRIVE 备选）**

- 若请求带 `forbidden_modes=["DRIVE"]`，当出现 PT_CANCELLED/换乘不可能时，后端可能无法给 DRIVE 修复方案：
  - 更可能走 **FAILED（或 strict 下直接 5xx）**
  - 或走 **NEED_CONFIRMATION**（让用户确认放宽约束/换策略）

---

## 2. Story B 字段级验收点（前端必须读哪些字段）

统一入口：`POST /api/agent/route_and_run`（直出 DTO）

前端核心读取字段：

- `result.status`
- `result.payload.evidence_bundle`
- `result.payload.candidates` / `result.payload.alternatives`
- （如有）`result.payload.negotiation_payload`
- 证据卡：`result.payload.ui_display.evidence_cards_ui`（优先渲染）与 `result.payload.decision_metadata.evidence_cards`（审计）

---

## 3. 分支 A：PT 风险触发 → 必须“可校验失败 + 原因码可定位”

当出现 CANCELLED 或 planned < required（换乘窗口不足）时：

- **读取**：`result.payload.evidence_bundle`
- **断言**
  - A1：响应里存在 `evidence_bundle`
  - A2：`evidence_bundle.verification_status === "FAILED"`（或 strict 下直接 5xx）
  - A3：`failure_reason_codes` 至少包含一个：
    - `PT_CANCELLED`
    - `PT_TRANSFER_GAP_VIOLATION`

说明：原因码由后端从 decision log / evidence 推导并写入 bundle；前端不做“自算失败”。

---

## 4. 分支 B：auto-heal 生效 → 必须产出“可行替代”且证据包通过

当系统完成 auto-heal（例如从 PT 失败 → 输出 DRIVE 替代）后：

- **最终输出必须通过**
  - B1：`result.payload.evidence_bundle.verification_status !== "FAILED"`
- **必须存在替代候选**
  - B2：`result.payload.candidates` 或 `result.payload.alternatives` 至少有 1 个候选
- **候选也必须可校验（C1 strict 下尤其重要）**
  - B3：`candidates[*].evidence_bundle` 存在且 `verification_status !== "FAILED"`
- **如果禁用了 DRIVE**
  - B4：请求带 `forbidden_modes=["DRIVE"]` 时，候选/最终 itinerary 不应出现 DRIVE（否则视为 bug 或约束未生效）

---

## 5. 分支 C：需要用户确认（协商）

当返回满足：

- `result.status === "NEED_CONFIRMATION"`
- 且 `result.payload.negotiation_payload` 存在

前端流程：

1) 用 `negotiation_payload.alternatives[]` 展示可选项（升级打车/改时间/换路线等）
2) 用户选择后调用 `POST /api/agent/confirm_negotiation`
3) **必须回传** `expected_negotiation_hash`（乐观锁）
4) confirm 后刷新证据包/候选/渲染状态

断言：

- C1：不回传 hash 应失败（或 409）
- C2：confirm 后结果应回到可展示状态（通常 status=OK 且 evidence_bundle 不为 FAILED）

---

## 6. C1 严格模式（C1_STRICT_EVIDENCE_BUNDLE=1/true）前端处理

- 若最终 `evidence_bundle` 会是 FAILED，服务端可能直接抛错（5xx），而不是返回带 FAILED 的 OK 响应。

前端验收建议：

- **5xx 视为“严格校验拦截成功”**
- UI 提示：本次证据链未通过，不可展示为可用结果
- 引导：重试/缩小范围/调整约束（例如不要禁用 DRIVE 以便 auto-heal）
- 日志必须携带：`request_id`

---

## 7. UI 映射建议（最小实现，支持快速验收）

### 7.1 证据包三态（必做）
- VERIFIED → 绿
- PARTIAL/UNVERIFIED/STALE → 黄
- FAILED → 红 + 展示 failure_reason_codes（至少前 12 个）

### 7.2 证据卡渲染（必做）
- 优先使用：`ui_display.evidence_cards_ui`
- 需要审计/埋点时补读：`decision_metadata.evidence_cards`

### 7.3 候选/替代方案面板（建议做，便于验收 auto-heal）
- 展示 candidates/alternatives count
- 展示候选的 `evidence_bundle.verification_status`（若存在）
- 保持默认折叠（渐进披露，避免信息过载）

---

## 8. 埋点（最小可用）

- `agent_pt_story_b_submit`：request_id、trip_id、preferred_modes、forbidden_modes
- `agent_evidence_bundle_received`：request_id、verification_status、failure_reason_codes
- `agent_pt_failure_detected`：request_id、reason_code(PT_CANCELLED/PT_TRANSFER_GAP_VIOLATION)
- `agent_auto_heal_candidate_present`：request_id、candidates_count、alternatives_count
- `agent_need_confirmation_shown`：request_id、alternatives_count
- `agent_confirm_negotiation_submit`：request_id、session_id、alternative_id
- `agent_strict_bundle_failed`：request_id、http_status

---

## 9. 验收 Checklist（可直接勾选）

### A. PT 风险触发
- [ ] evidence_bundle 存在
- [ ] verification_status 为 FAILED（或 strict 下 5xx）
- [ ] failure_reason_codes 命中 PT_CANCELLED / PT_TRANSFER_GAP_VIOLATION

### B. auto-heal 生效
- [ ] 最终 evidence_bundle 不为 FAILED
- [ ] candidates/alternatives 至少一个
- [ ] 候选 evidence_bundle（如有）不为 FAILED

### C. 禁用 DRIVE（heal 阻断）
- [ ] forbidden_modes=["DRIVE"] 时不出现 DRIVE 候选
- [ ] PT 风险触发时，FAILED/NEED_CONFIRMATION/或 strict 5xx 分支符合预期

