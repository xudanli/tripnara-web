[项目] 用户故事 C（大风风险 / 禁止不安全驾驶 / Rail Resilience）前端跑通执行方案

本文档用于前端“跑通 + 可验收 + 可回归” Story C。Story C 的关键点是：**drive/rail 安全 hard fact**、**forbidden_modes 硬约束**、**原因码 failure_reason_codes**，全部落在 `route_and_run` 的 `result.payload.evidence_bundle` 与 `candidates/alternatives` 输出里。

---

## 0. 范围与依赖

- **必接接口**：`POST /api/agent/route_and_run`
- **按产品形态选接**（当替代方案触发“需要你确认/协商”）：
  - `POST /api/agent/confirm_negotiation`（当 `result.status=NEED_CONFIRMATION` 且存在 `negotiation_payload`）
- **前端已具备验收 UI**（无需抓包也能看）：
  - 证据卡：`src/components/agent/IronShieldEvidenceCards.tsx`
  - 候选/替代方案：`src/components/agent/CandidatesPanel.tsx`

---

## 1. Story C 请求构造要点

### 1.1 两层信号（建议）
- **自然语言**：message 里明确“自驾/火车/大风限制/安全替代”
- **引擎约束**：`emergency_constraints` 里传入
  - `max_wind_speed_tolerance_mps`（风容忍阈值）
  - `forbidden_modes`（硬禁用 DRIVE / MOTORCYCLE）
  - `preferred_modes`（偏好 RAIL）

---

## 2. Story C 字段级验收 Checklist（断言）

核心读取：

- `result.payload.evidence_bundle`
- `result.payload.candidates / result.payload.alternatives`
- 证据展示：`result.payload.ui_display.evidence_cards_ui`（优先渲染）

### A. drive 段存在，但缺少 drive_safety_v1 hard fact
- A1：存在 `result.payload.evidence_bundle`
- A2（**C1 strict**）：`evidence_bundle.verification_status === "FAILED"`
- A2（**非 strict**）：`verification_status` 为 `PARTIALLY_VERIFIED/UNVERIFIED`（或仍可能 FAILED，视后端生成进度）

解释：服务端装配 bundle 时，若 itinerary 里存在 DRIVE 且缺 `drive_safety_v1` hard fact，strict 会强制失败。

### B. drive_safety_v1 判定 violated（大风等）
- B1：`verification_status === "FAILED"`
- B2：`failure_reason_codes` 包含 **`DRIVE_SAFETY_VIOLATED`**
- B3：证据卡中能看到 **weather/drive** 相关解释（`ui_display.evidence_cards_ui` 或 `decision_metadata.evidence_cards`）

### C. 请求里禁用 DRIVE/MOTORCYCLE（硬约束）
当请求带 `emergency_constraints.forbidden_modes` 包含 `DRIVE` 或 `MOTORCYCLE`：

- C1（若最终输出 itinerary 仍含 DRIVE）：  
  - `verification_status === "FAILED"`  
  - `failure_reason_codes` 包含 **`DRIVE_FORBIDDEN`**
- C2（候选剪枝，**C1 strict 重点**）：  
  - `candidates/alternatives` 中 **不应下发** itinerary 含 DRIVE 的候选（不是前端隐藏，而是服务端不下发）

### D. rail 段存在：必须有 rail_safety_v1 hard fact；违反要失败
- D1（rail 段存在但缺 hard fact，**C1 strict**）：`verification_status === "FAILED"`（非 strict 可 PARTIAL/UNVERIFIED）
- D2（rail safety violated）：  
  - `verification_status === "FAILED"`  
  - `failure_reason_codes` 包含 **`RAIL_SAFETY_VIOLATED`**

---

## 3. 对照请求模板（可直接用于前端调试/回归）

### 模板 1：允许 DRIVE，但用极低风容忍逼出 DRIVE_SAFETY_VIOLATED

```json
{
  "request_id": "req_wind_lock_drive_violate_001",
  "user_id": "user_123",
  "trip_id": "trip_456",
  "message": "今天我想自驾，但如果风太大就不要开车，给我安全替代方案。",
  "options": { "max_seconds": 60, "max_steps": 8 },
  "emergency_constraints": {
    "max_wind_speed_tolerance_mps": 0.1,
    "reason_code": "WIND_LOCK_TEST_FORCE_VIOLATION"
  }
}
```

预期：
- 若生成 DRIVE 且有 drive_safety_v1 推导：**FAILED + DRIVE_SAFETY_VIOLATED**
- 若未生成到 DRIVE 段：该 case 可能不触发（需要更强的“必须自驾”表达或行程本身含 drive 段）

### 模板 2：显式禁用 DRIVE（验证 DRIVE_FORBIDDEN + 候选剪枝）

```json
{
  "request_id": "req_forbid_drive_001",
  "user_id": "user_123",
  "trip_id": "trip_456",
  "message": "大风天请避免自驾，给我不需要开车的替代方案。",
  "options": { "max_seconds": 60, "max_steps": 8 },
  "emergency_constraints": {
    "forbidden_modes": ["DRIVE", "MOTORCYCLE"],
    "reason_code": "WIND_LOCK_FORBID_DRIVE"
  }
}
```

预期：
- 输出与候选中 **不应出现 DRIVE**（strict 下尤其应剪枝）
- 若仍出现 DRIVE：应 **FAILED + DRIVE_FORBIDDEN**（视为链路 bug 或服务端约束未生效）

### 模板 3（增强）：偏好 RAIL，验证 rail hard fact / rail violation 分支

```json
{
  "request_id": "req_prefer_rail_001",
  "user_id": "user_123",
  "trip_id": "trip_456",
  "message": "尽量坐火车出行；如果火车也受天气影响不可行，请给替代并说明原因。",
  "options": { "max_seconds": 60, "max_steps": 8 },
  "emergency_constraints": {
    "preferred_modes": ["RAIL"],
    "reason_code": "RAIL_RESILIENCE_TEST"
  }
}
```

预期（当输出出现 rail 段时）：
- 缺 rail_safety_v1 hard fact：strict 下应 FAILED（非 strict 可 PARTIAL/UNVERIFIED）
- rail safety violated：应 **FAILED + RAIL_SAFETY_VIOLATED**

---

## 4. NEED_CONFIRMATION（协商）可选闭环

当 `route_and_run` 返回：

- `result.status === "NEED_CONFIRMATION"`
- `result.payload.negotiation_payload` 存在

前端：

1) 展示 `negotiation_payload.alternatives[]`
2) 调用 `POST /api/agent/confirm_negotiation`
3) 必须回传 `expected_negotiation_hash`（乐观锁）
4) confirm 后刷新 evidence_bundle / candidates / cards

常见错误：
- **409**：协商过期/不匹配 → 提示重新发起协商（重发 route_and_run）

---

## 5. C1 strict 模式（C1_STRICT_EVIDENCE_BUNDLE=1/true）前端处理

- 服务端可能对 “最终会 FAILED 的输出” **直接抛 5xx**，避免把不可校验结果当成功返回。
- 前端验收：
  - **5xx 视为严格校验拦截成功**
  - UI 提示“证据链未通过，不可验收输出”，并建议：重试/放宽约束/改方案
  - 日志携带 `request_id`

