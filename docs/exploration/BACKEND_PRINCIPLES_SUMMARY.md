# Exploration 旅行原则 —「系统智能总结」后端需求

**Audience:** 后端 / Exploration API  
**前端页面:** `ExplorePrinciplesPage`（步骤 ③ 旅行原则）  
**状态:** 后端已就绪；前端通过 `previewPrinciplesSummary()` 联调（debounce 400ms）。

---

## 1. 产品目标

用户在原则页勾选 1–3 项并排优先级后，**实时**看到基于当前 Scenario（旅行条件 + 原则排序）生成的自然语言总结，帮助确认选择是否符合预期。

- 总结应在用户**调整选择/排序**后更新（前端 debounce ~400ms 调用）
- 未选任何原则时展示占位文案，不调用 LLM
- 正式环境由后端生成；404/501 时前端降级为占位，不展示硬编码假「智能」文案

---

## 2. 推荐 API

```http
POST /api/exploration/scenarios/:scenarioId/principles/summary
Authorization: Bearer <JWT>
Content-Type: application/json
```

### 2.1 Request

与 `PUT .../principles` 提交体中的 `principles` 数组**同构**（预览，不落库）：

```json
{
  "principles": [
    { "principleId": "CORE_EXPERIENCE_FIRST", "rank": 1 },
    { "principleId": "LOW_DRIVING", "rank": 2 },
    { "principleId": "STAY_STABILITY", "rank": 3 }
  ]
}
```

| 字段 | 说明 |
|------|------|
| `principleId` | 与 `GET /exploration/principles/catalog` 及 `PUT .../principles` 一致 |
| `rank` | 1 = 最高优先级，升序 |

**合法 `principleId` 枚举（与前端 SSOT 对齐）：**

| principleId | 含义 |
|-------------|------|
| `LOW_DRIVING` | 少赶路 |
| `NO_NIGHT_DRIVING` | 不夜驾 |
| `CORE_EXPERIENCE_FIRST` | 核心体验优先 |
| `REMOTE_EXPLORATION` | 更想探索小众区域 |
| `BUDGET_FLEXIBLE` | 预算可以适度增加 |
| `STAY_STABILITY` | 住宿稳定优先 |

校验规则建议与 `PUT .../principles` 相同：

- `principles.length` ∈ [1, 3]（空数组时可直接返回 placeholder，或 400）
- `rank` 从 1 连续递增、无重复 `principleId`
- 未知 `principleId` → 400

### 2.2 Response

```json
{
  "success": true,
  "data": {
    "summary": "你更看重核心体验与驾驶强度可控，倾向减少换宿、在同一区域深度停留。后续路线会优先推荐南岸环线等节奏适中的方案。",
    "placeholder": null,
    "highlights": [
      "核心体验优先（最高优先级）",
      "每日驾驶时长倾向控制在舒适范围",
      "尽量减少换宿次数"
    ],
    "source": "LLM",
    "generatedAt": "2026-07-05T08:30:00.000Z"
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `summary` | `string \| null` | 是 | 1–3 句中文，面向 C 端用户；有原则时非空 |
| `placeholder` | `string` | 否 | `principles` 为空时返回；前端优先展示此字段 |
| `highlights` | `string[]` | 否 | 可选要点，供后续 UI 扩展 |
| `source` | `"LLM" \| "RULES"` | 否 | 生成方式，便于调试 |
| `generatedAt` | ISO8601 | 否 | 生成时间 |

**未选原则（`principles: []`）示例：**

```json
{
  "success": true,
  "data": {
    "summary": null,
    "placeholder": "请选择最多 3 项原则，我们将据此推荐路线。"
  }
}
```

### 2.3 后端生成输入（建议）

总结应结合 **Scenario 上下文**，至少包括：

- `destinationCodes` / 目的地
- `dateRange`（天数）
- `travelers` / `budget` / `mobilityContext.vehicleType`
- 当前 `principles[]` 及 **rank 顺序**

输出要求：

- 语气：第二人称、克制、可执行（非营销腔）
- 长度：`summary` 建议 40–120 字
- **必须**体现 rank 1 原则权重最高
- 不要编造具体路线名称，除非已有 candidates；可泛化「后续路线推荐会…」

### 2.4 错误码

| HTTP | code | 场景 |
|------|------|------|
| 400 | `INVALID_PRINCIPLES` | 枚举/数量/rank 不合法 |
| 404 | `SCENARIO_NOT_FOUND` | scenarioId 不存在 |
| 409 | `SCENARIO_LOCKED` | 已提交且不可预览（若业务需要） |
| 503 | `SUMMARY_UNAVAILABLE` | LLM 不可用；前端降级占位 |

---

## 3. 与现有 API 的关系

| API | 关系 |
|-----|------|
| `GET /exploration/principles/catalog` | 原则元数据 SSOT |
| `PUT /exploration/scenarios/:id/principles` | **持久化**用户选择；summary 接口仅预览 |
| `POST /exploration/scenarios/:id/candidates` | 原则提交后生成路线；summary 不替代此步 |

可选增强：`PUT .../principles` 响应中附带 `summary` 字段，供提交后跳转页复用（**非 P0**，前端当前仅在原则页预览）。

---

## 4. 前端联调行为

1. 用户变更选择/排序 → debounce 后 `POST .../principles/summary`
2. 请求进行中：展示「正在生成总结…」
3. 成功：展示 `data.summary`
4. `principles` 为空：展示 `placeholder` 或本地默认占位
5. 404/501/503：展示「总结暂不可用，仍可继续选择原则」，**不**使用旧版硬编码模板

---

## 5. P0 验收清单

- [ ] `POST .../principles/summary` 可访问，鉴权与 scenario 归属校验
- [ ] 1–3 项原则 + rank 生成连贯中文 `summary`
- [ ] rank 1 变化时总结明显变化
- [ ] 空 principles 返回 `placeholder`
- [ ] 非法 principleId / rank → 400
- [ ] LLM 失败时有明确 503 或 rules 降级 + `source: "RULES"`
