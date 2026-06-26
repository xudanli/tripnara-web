# 决策画像跨行程沿用 — 后端实现清单（P0）

> **PRD**：[decision-profiling-profile-reuse-prd.md](../prd/decision-profiling-profile-reuse-prd.md) §13  
> **前端契约**：`src/types/trip-decision-profiling.ts`、`decisionProfilingApi.reuseProfile()`  
> **预估**：3 工作日（migration + 服务层 + 联调）

---

## 1. 目标（P0）

用户在 **新行程** 可 **一键沿用** 上次正式完成的 Travel Style + Money DNA Quiz，无需重答 5+5 题。

- 沿用 = 用户显式 `POST`，非静默复制
- v1 **两段一起沿用**（`sections` 固定 `["travel_style","money_dna"]`）
- **分摊共识 / 摩擦矩阵** 仍按 **本趟 trip + 本趟队友** 计算，不继承历史团队结论
- **不回写** 用户级档案（v1）；仅 PATCH 备注更新本 trip 卡片

---

## 2. 数据库

### 2.1 新表 `user_decision_profiling_profile`

| 列 | 类型 | 说明 |
|----|------|------|
| `user_id` | PK | |
| `travel_style_answers` | JSONB | `[{ questionId, optionId }]` |
| `travel_style_card` | JSONB | 与 API `TravelStyleCard` 同构（无 tripId） |
| `money_dna_answers` | JSONB | 同上 |
| `money_dna_card` | JSONB | 与 API `MoneyDnaCard` 同构 |
| `last_completed_trip_id` | UUID | 展示「上次：冰岛环岛」 |
| `last_completed_at` | TIMESTAMPTZ | |
| `quiz_version` | VARCHAR | 如 `ts-md-v1` |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

### 2.2 扩展 `trip_decision_profiling_status`

| 列 | 类型 | 说明 |
|----|------|------|
| `travel_style_source` | ENUM/VARCHAR | `null \| quiz \| reused \| inferred` |
| `money_dna_source` | ENUM/VARCHAR | 同上 |
| `reused_from_trip_id` | UUID NULL | |
| `reused_at` | TIMESTAMPTZ NULL | |

### 2.3 一次性 Backfill（可选，建议 P0 同批）

```sql
-- 每个 user 取最近一次 quizCompleted 的 trip 快照写入 profile
-- 仅 source = quiz | quiz_edited，排除 inferred
```

### 2.4 扩展 trip 级卡片 `source`

`travel_style` / `money_dna` 存储增加：

`quiz | quiz_edited | reused | reused_edited | inferred`

---

## 3. 题库版本

### 3.1 `GET .../quiz` 响应增加

```json
{ "quizVersion": "ts-md-v1", "travelStyleQuestions": [...], ... }
```

常量由后端维护；题目结构变更时 bump 版本。

### 3.2 沿用资格

| 条件 | `reuse.eligible` |
|------|------------------|
| profile 存在且 `quiz_version` 匹配 | `true` |
| 无 profile | `false`, `blockedReason: no_profile` |
| 版本不匹配 | `false`, `blockedReason: quiz_version_mismatch` |
| profile `last_completed_at` > 24 个月 | `false`, `blockedReason: profile_stale` |
| 仅有 inferred、无 profile | `false`, `blockedReason: inferred_only` |
| 本 trip 已 `quizCompleted` | 可不返回 reuse 或 `eligible: false` |

---

## 4. API 变更

### 4.1 扩展 `GET /trips/:tripId/decision-profiling/onboarding`

在现有 `data` 上增加 **可选** 字段 `reuse`（旧客户端忽略即可）：

```json
{
  "tripId": "...",
  "userId": "...",
  "travelStyleCompleted": false,
  "moneyDnaCompleted": false,
  "quizCompleted": false,
  "teamCompletionRate": 0,
  "reuse": {
    "eligible": true,
    "quizVersion": "ts-md-v1",
    "profileQuizVersion": "ts-md-v1",
    "lastCompletedAt": "2026-05-10T08:00:00.000Z",
    "lastCompletedTripLabel": "冰岛环岛 · 5月",
    "preview": {
      "travelStyleLabel": "理性探索者",
      "moneyDnaSummary": "体验倾向偏高 · 消费节奏均衡",
      "confidence": { "travelStyle": 0.72, "moneyDna": 0.68 }
    },
    "blockedReason": null
  }
}
```

`blockedReason` 枚举：`null | no_profile | quiz_version_mismatch | profile_stale | inferred_only`

`lastCompletedTripLabel`：来自 trip 标题 + 日期缩写，勿暴露他人隐私。

### 4.2 新 `POST /trips/:tripId/decision-profiling/my/reuse-profile`

**用途**：用户显式一键沿用上次正式完成的 Travel Style + Money DNA（P0 两段一起）。

**请求体**：

```json
{
  "sections": ["travel_style", "money_dna"],
  "userNote": "可选备注"
}
```

**成功响应**：`{ onboarding, travelStyle, moneyDna }`，卡片 `source` 为 `reused` / `reused_edited`。

**错误码**：`REUSE_NOT_ELIGIBLE` | `SECTION_ALREADY_COMPLETED` | `FORBIDDEN` | `NOT_FOUND`

完整契约见 [trip-decision-profiling-api.md §七附](./trip-decision-profiling-api.md#七附跨行程沿用个人档案p0)。

**鉴权**：行程成员。

**业务逻辑（单事务）**：

1. 校验 `reuse.eligible`；否则 400 `REUSE_NOT_ELIGIBLE`
2. 校验本 trip 未完成对应 section；否则 400 `SECTION_ALREADY_COMPLETED`
3. 从 `user_decision_profiling_profile` 复制 answers + card 到本 trip 表
4. 更新 `trip_decision_profiling_status`：`travelStyleCompleted=true`, `moneyDnaCompleted=true`, `quizCompleted=true`, source/reused 字段
5. **不** 更新 `user_decision_profiling_profile`（v1）
6. 提交后异步触发 friction-radar 重算（与 POST money-dna 相同 job）
7. 幂等：已 completed 时返回 400 或 200 当前态（团队约定一种）

**错误码**：

| HTTP | error.code |
|------|------------|
| 400 | `REUSE_NOT_ELIGIBLE` |
| 400 | `SECTION_ALREADY_COMPLETED` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |

### 4.3 修改现有 POST quiz 路径

**`POST .../my/travel-style`** 与 **`POST .../my/money-dna`** 完成后：

1. 写入 trip 快照（已有）
2. 更新 status（已有）
3. **新增**：upsert `user_decision_profiling_profile`（answers + cards + `last_completed_trip_id` + `quiz_version`）
4. 两段都完成时刷新 profile 的 `last_completed_at`

**`GET .../my/travel-style`**：

- 若仅 inferred 预览：返回 `source: inferred`，**且** 不设置 `travelStyleCompleted`
- 若 profile 存在但本 trip 未完成：P0 **可不** 自动返回 inferred（由 onboarding.reuse.preview 承担）；避免与沿用叙事冲突（见 PRD Q5）

### 4.4 P1：`POST .../my/quiz-prefill`

**用途**：「重新调查」预填，**不**标记完成。前端已对接。

**请求体**：`{}`  
**响应**：`{ prefill: { travelStyleAnswers, moneyDnaAnswers, userNote? }, source: "user_profile" }`

### 4.5 Agent payload（P1）

- `onboarding.reuse` 与 GET onboarding 同构
- `clientNavigation.action`: `reuse_profile` | `open_quiz`

---

## 5. 与下游模块

| 模块 | 要求 |
|------|------|
| **friction-radar** | `quizCompleted`（含 reused）计入 `completedCount` / `completionRate` |
| **split-consensus** | 本人 `quizCompleted` 后可 simulate/select/confirm；推荐仍基于 **本趟** team money-dna |
| **team/travel-style** | reused 与 quiz 一样进入团队墙 |
| **Travel Wallet** | 不因 reuse 自动锁定；仍须本趟 split-consensus 全员 confirm |
| **L4 GET /users/me/money-dna** | **不作为** reuse 数据源；接口独立 |

---

## 6. 并发与边界

| 场景 | 处理 |
|------|------|
| reuse 与 quiz POST 同时 | **quiz POST 优先**（最新 completedAt wins） |
| 重复 reuse | 400 `SECTION_ALREADY_COMPLETED` 或幂等 200 |
| 用户删了 source trip | profile 仍有效；`lastCompletedTripLabel` 用缓存标题或「上次行程」 |
| 新成员无 profile | `no_profile`，前端只展示完整调查 |

---

## 7. 测试用例（后端）

1. trip-A 完成 quiz → profile upsert → trip-B onboarding `reuse.eligible=true`
2. trip-B `POST reuse-profile` → status completed + cards `source=reused`
3. trip-B 队友未完成 → friction `completionRate` 正确
4. `quiz_version` bump → `eligible=false`, `quiz_version_mismatch`
5. inferred only 用户 → `inferred_only`，reuse 400
6. profile 25 个月前 → `profile_stale`
7. 已完成 trip 再 reuse → `SECTION_ALREADY_COMPLETED`
8. 非成员 → 403

---

## 8. 交付检查清单

- [x] Migration：`user_decision_profiling_profile` + status 扩展（已部署）
- [ ] Backfill 脚本（可选）
- [x] Quiz 完成 → profile upsert — `TravelStyleQuizService` / `MoneyDnaQuizService` → `upsertFromTravelStyleQuiz` / `upsertFromMoneyDnaQuiz`
- [x] `GET onboarding` 返回 `reuse` — `DecisionProfilingProfileService.buildOnboardingStatus()` → `evaluateReuseEligibility()`
- [x] `GET quiz` 返回 `quizVersion` — `DecisionProfilingService.getQuizBundle()` → `ts-md-v1`
- [x] `POST reuse-profile` — `trip-decision-profiling.controller.ts` + `DecisionProfilingProfileService.reuseProfile()`
- [x] `source` 枚举扩展 + inferred 不 flip completed
- [ ] Swagger 更新 `trip-decision-profiling` tag
- [x] 前端联调 — `VITE_FEATURE_DECISION_PROFILING_REUSE` 默认开启（`.env.development`）

### 后端实现映射（已上线）

| 需求 | 实现位置 |
|------|----------|
| GET onboarding + `reuse` | `DecisionProfilingProfileService.buildOnboardingStatus()` → `evaluateReuseEligibility()` |
| POST `my/reuse-profile` | `trip-decision-profiling.controller.ts` L72，`DecisionProfilingProfileService.reuseProfile()` |
| Quiz 完成 upsert profile | `TravelStyleQuizService.submitQuiz()` / `MoneyDnaQuizService.submitQuiz()` |
| GET quiz + `quizVersion` | `DecisionProfilingService.getQuizBundle()` → `ts-md-v1` |

```bash
curl -s http://localhost:3000/api/trips/<tripId>/decision-profiling/onboarding | jq '.data.reuse'
curl -s http://localhost:3000/api/trips/<tripId>/decision-profiling/quiz | jq '.data.quizVersion'
```

---

## 9. 修订记录

| 日期 | 说明 |
|------|------|
| 2026-06-20 | P0 后端清单，对齐 PRD v0.2 §13 |
| 2026-06-20 | 后端 P0 已上线；记录 Service 映射；前端 flag 默认开 |
| 2026-06-20 | §10：预算 Tab 锁定双行展示 — 后端契约与可选增强 |

---

## 10. 预算 Tab 锁定双行展示（Wallet ↔ Split Consensus）

前端在 **分摊共识全员锁定** 后，预算 Tab「付款与记账」改为只读卡片（团队共识名 + 记账规则名 + 明细行），不再展示分摊方式下拉。

**结论：沿用 P0 不必改**；若锁定后预算 UI 缺明细或仍可改规则，按本节核对。

### 10.1 前端已消费的接口（P0 应有）

| 接口 | 锁定后必须返回 |
|------|----------------|
| `GET .../split-consensus` | `lockedAt`、`lockedMode`；`options[]` 中对应 mode 带 `hybridBreakdown`（hybrid 时） |
| `GET .../budget/profile?include=wallet` | `wallet.paymentRule`：`mode`、`splitBase`、`members[]`、`categoryRules`（hybrid 映射后） |

前端拼装逻辑见 `src/lib/split-consensus-wallet-bridge.ts`：`buildLockedSplitRuleDisplay()` 优先读 `hybridBreakdown`，否则读 `paymentRule.categoryRules`。

### 10.2 锁定 → Wallet 映射（confirm 最后一笔时写入 `trip_wallet_rules`）

| `lockedMode` | `trip_wallet_rules.mode` | 备注 |
|--------------|--------------------------|------|
| `split_aa` | `split_aa` | `splitBase` = 成员数 |
| `hybrid` | `by_category` | `categoryRules` 与 `options[].hybridBreakdown` 对齐 |
| `rotating_treat` / `proportional` | `custom` | 无 1:1 钱包 mode |

**`hybrid` → `categoryRules` 示例**（域 key 与共识 `hybridBreakdown` 对齐）：

```json
{
  "mode": "by_category",
  "splitBase": 4,
  "categoryRules": {
    "transportation": { "type": "proportional" },
    "accommodation": { "type": "split_aa" },
    "dining": { "type": "rotating_treat" },
    "activities": { "type": "split_aa" }
  }
}
```

若某类为 `one_pays`，须带 `userId`（与 PRD L3 `by_category` 一致）。

### 10.3 锁定后拒改规则（必须）

锁定后 `PUT /trips/:tripId/budget/wallet/rule` 返回 **400**，`error.code`：`SPLIT_CONSENSUS_LOCKED`。

前端已隐藏分摊下拉；API 须防直连改规则。

### 10.4 其他核对项

1. **`GET split-consensus` 锁定态**：`select` / `simulate` 已 400；`options` 仍含完整 `hybridBreakdown`（不只推荐态）。
2. **成员数**：`splitBase` 与 `wallet.members.length` 一致。

### 10.5 可选增强（P1，前端可不接）

在 `GET .../budget` 的 `wallet.paymentRule` 上增加 `sync` 元数据，减少前端双接口拼装：

```typescript
paymentRule.sync?: {
  source: 'split_consensus' | 'manual';
  consensusLockedMode?: SplitMechanismMode;
  consensusLockedAt?: string;
  summaryZh?: string; // hybrid 一行摘要，可选
};
```

`source: manual` 表示用户曾在未锁定钱包上手动改规则（v1 若不允许则始终 `split_consensus`）。

### 10.6 后端自测（锁定双行）

1. 4 人 trip → split-consensus 选 `hybrid` → 全员 confirm → `lockedAt` 非空
2. `GET .../budget/profile?include=wallet` → `mode=by_category` 且 `categoryRules` 与 `hybridBreakdown` 一致
3. 预算 Tab：共识「混合模式」+ 记账「按类分工」+ 明细行 + 「已映射」徽章
4. `PUT .../budget/wallet/rule` 改 mode → 400 `SPLIT_CONSENSUS_LOCKED`
5. `split_aa` 锁定 → 双行一致，无「已映射」徽章
