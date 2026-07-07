# Guide-to-Plan Pipeline — 攻略导入规划器

**用户侧名称**：从攻略开始规划  
**后台能力**：Guide-to-Plan Pipeline  
**版本**：MVP 1（前端骨架 + API 契约 + 客户端降级 mock）

---

## 1. 功能定位

用户输入小红书或其他平台的攻略（链接 / 截图 / 文字 / 灵感），系统经三层转换后生成**行程草案**（非直接可执行计划）：

```
攻略输入 → 内容解析 → 本体映射 → 约束检查 → 按成员重排 → 行程草案 → 用户确认 → Plan Studio
```

**核心原则**：不照抄攻略。输出的是「以攻略为灵感、为你重新计算后的行程」。

---

## 2. 输入方式（MVP 1）

| 方式 | 用户操作 | MVP 1 状态 |
|------|----------|------------|
| 粘贴文字 | 复制攻略正文 | ✅ 优先支持 |
| 上传截图 | 长截图 + 手动核对 OCR 文本 | ✅ 支持（OCR 待后端） |
| 粘贴链接 | 公开网页链接 | ✅ UI 支持，抓取失败时引导粘贴正文 |
| 手动灵感 | 短语描述想去哪 | ✅ 支持 |
| 视频 / 收藏夹 | — | ❌ 后续 |

---

## 3. 三层转换

### 第一层：理解攻略说了什么

提取 POI、餐厅、住宿、路线、作者观点、隐含假设。区分：

- 攻略作者经验 ≠ 官方事实 ≠ 本次可直接采用的规则

### 第二层：映射到旅行本体论

自然语言 → Decision 对象（断言、约束、候选方案、影响范围）。

### 第三层：按本次旅行重生成

同一篇攻略，不同成员 / 季节 / 交通方式 → 不同草案。

---

## 4. 三人格分工

| 人格 | 职责 |
|------|------|
| Neptune | 识别亮点、POI、体验主线、组织方案 |
| Abu | 道路、天气、预约、营业时间、硬约束 |
| Dr.Dre | 每日强度、驾驶/步行负荷、节奏 |

---

## 5. 数据模型

```
ImportedGuide
├── GuideSource
├── ExtractedPlaces[]
├── ExtractedClaims[]
├── ExtractedRoutes[]
├── ExtractedTips[]
├── riskHints[]
└── sourceConfidence (L1–L5)

GuideClaim — 作者主张，默认 L1、UNVERIFIED

PlanCandidate — status: DRAFT | PENDING_CONFIRM | ACCEPTED
├── retainedItems / modifiedItems / rejectedItems
└── adjustments[]（原攻略 vs TripNARA 调整）
```

类型定义：`src/types/guide-import.ts`

---

## 6. API 契约

**Base URL：** `/api/guide-to-plan`（`apiClient` 已带 `/api` 前缀）

| 阶段 | 方法 | 路径 |
|------|------|------|
| 创建/恢复会话 | POST / GET | `/guide-to-plan/sessions`（含 `resumeRoute`、`parseProgress`） |
| 导入预览 | GET | `/sessions/:id/import/preview` |
| 导入攻略 | POST | `/sessions/:id/import`、`/import/file`、`/import/screenshot` |
| 删除攻略 | DELETE | `/sessions/:id/guides/:guideId` |
| 异步解析 | POST | `/sessions/:id/parse/async` |
| 解析进度 | GET SSE / 轮询 | `/parse/stream`、`/parse/status` |
| 理解摘要 | GET | `/sessions/:id/understanding`（`pendingConfirmations`、`summary.suggestedTripDays`、`requiresTravelContext`） |
| 出行条件 | PATCH | `/sessions/:id/travel-context` |
| 生成草案 | POST | `/sessions/:id/generate` → `GuidePlanCandidateDetailView` |
| 草案列表 | GET | `/sessions/:id/plan-candidates` |
| 草案详情 | GET | `/sessions/:id/plan-candidates/:planCandidateId` |
| 接受落地 | POST | `/sessions/:id/accept`（`acceptanceMode`：`accept_all` / `keep_faithful` / `review_items`） |
| 逐项确认列表 | GET | `/sessions/:id/plan-candidates/:planCandidateId/review-items` |
| 逐项确认落地 | POST | `/sessions/:id/plan-candidates/:planCandidateId/confirm` |
| 放弃会话 | POST | `/sessions/:id/abandon` |

前端实现：

- 类型：`src/types/guide-to-plan-api.ts`
- API 客户端：`src/api/guide-to-plan.ts`（含 SSE `subscribeParseProgress`）
- 视图映射：`src/lib/guide-to-plan-mapper.ts`
- 页面：`src/pages/trips/from-guide.tsx`（`?sessionId=` 恢复会话；优先读 `resumeRoute` 定位步骤）

### 会话恢复

`GET /sessions/:id`（或列表项）返回：

- **`resumeRoute`**：优先用于定位 UI 步骤（如 `import`、`summary`、`draft`、`compare`、`review`）
- **`parseProgress`**：解析失败时 `status === 'failed'` 且 `error` 有说明；此时 `resumeRoute` 通常指向 `import`
- 无 `resumeRoute` 时回退 `status` 映射

### 出行条件 PATCH

`PATCH /sessions/:id/travel-context` 支持**分步提交**，每次只传当前变更字段（如仅 `startDate` / `transportMode`）。生成草案前仍会做一次全量同步。

### 后端状态守卫（联调注意）

| 守卫 | 前端应对 |
|------|----------|
| 解析/生成中不可导入、删除 | 导入页禁用输入与移除；提示「解析或生成进行中」 |
| 生成中不可 `parse/async` | 禁用「开始解析」；空会话不调 parse |
| 仅 `draft_ready` 可 accept/confirm | 按钮前置校验 `sessionCanAcceptDraft` |
| `POST /generate` 需解析完成且有灵感候选 | `checkSessionCanGenerate` 前置校验 |
| 正文超长（80,000 字） | 粘贴文字客户端预检 + 后端 400 |

`GET /understanding` 新增：`parseRequired`（有攻略未解析）、`parsedGuideCount`（已解析篇数）。

`GET /sessions` 返回分页对象 `{ items, total, limit, offset }`（客户端 `listSessions` 已兼容）。

解析失败后会话回滚为 `collecting` + `resumeRoute: import`，前端刷新会话并引导重新导入/解析。

常见 400：`解析进行中，请稍后再导入`、`请先导入至少一篇攻略`、`请先生成草案`、`请先完成攻略解析后再生成草案`、`解析结果为空，请补充攻略内容或重新解析`

---

### 接受模式

| 模式 | 行为 |
|------|------|
| `accept_all`（默认） | 直接创建正式 Trip |
| `keep_faithful` | 非 faithful 变体时按 FAITHFUL 策略重生成后落地 |
| `review_items` | 返回 `reviewRequired: true` 与 `items[]`，经 `confirm` 落地 |

`review_items` 流程：`POST /accept` →（可选）`GET .../review-items` → `POST .../confirm`（`acceptedItemKeys`）

### 放弃会话

`POST /sessions/:sessionId/abandon` 将会话标记为 `abandoned`；已 `accepted` 的会话不可放弃。前端「放弃导入」调用此接口；「稍后继续」保留 `?sessionId=` 以便恢复。

后端不可用时自动降级至旧 `/guides/*` mock：`src/api/guides.ts`

---

### 遗留 `/guides/*`（仅降级）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/guides/parse` | 单篇攻略解析 → `ImportedGuide` |
| POST | `/guides/merge` | 多篇合并 → `GuideBundleSummary` |
| POST | `/guides/generate-draft` | 生成 `PlanCandidate`（草案） |

### POST `/guides/parse`

**Request (JSON)**

```json
{
  "source": {
    "id": "guide_xxx",
    "type": "text",
    "rawText": "南岸三日自驾…",
    "addedAt": "2026-07-01T00:00:00.000Z"
  },
  "locale": "zh-CN"
}
```

**Request (multipart)** — `screenshot` / `file` 类型

- `sourceType`, `locale`, `rawText?`, `url?`, `image` (file)

**Response**

```json
{
  "success": true,
  "data": {
    "guide": { "...": "ImportedGuide" }
  }
}
```

### POST `/guides/merge`

```json
{
  "guideIds": ["guide_a", "guide_b"],
  "guides": [ "...ImportedGuide" ]
}
```

### POST `/guides/generate-draft`

```json
{
  "summary": { "...GuideBundleSummary" },
  "tripContext": {
    "startDate": "2026-02-01",
    "endDate": "2026-02-08",
    "travelerProfile": "family_with_elderly",
    "transportMode": "self_drive",
    "mustKeepExperiences": ["冰河湖", "黑沙滩"]
  },
  "guideIds": ["guide_a"]
}
```

---

## 7. 前端路由与页面

| 路径 | 组件 | 说明 |
|------|------|------|
| `/dashboard/trips/new` | `CreateTripEntryPicker` | 创建行程入口 |
| `/dashboard/trips/new/from-guide` | `FromGuidePage` | 攻略导入主流程 |

### 流程步骤

1. **添加攻略** — 多篇输入、列表管理  
2. **确认理解** — `GuideUnderstandingSummary` + 关键澄清 4 项  
3. **行程草案** — 原攻略 vs 调整对比 + 接受模式（全部 / 逐项 / 忠实原攻略）→ Plan Studio  

创建行程降级路径：调用 `POST /trips/from-natural-language/v3`，prompt 由 `buildNlPromptFromGuide` 拼装。

---

## 8. 状态区分（产品关键）

| 状态 | 含义 |
|------|------|
| 攻略生成的行程草案 | 尚未完整验证 |
| TripNARA 可执行计划 | 经约束验证 + 用户确认 |

不要让「从攻略生成」=「已经可靠」。

---

## 9. MVP 分期

### MVP 1（当前）

- [x] 粘贴文字 / 截图 / 链接 / 灵感 UI  
- [x] 多篇攻略列表  
- [x] 攻略理解摘要页  
- [x] 关键澄清表单  
- [x] 草案对比预览（mock 调整表）  
- [x] API 契约 + 客户端 mock  
- [ ] 后端 `/guides/*` 真实解析  
- [ ] POI 数据库匹配  

### MVP 2

- 营业时间、驾驶时间、季节规则  
- 三人格真实审议输出  
- L3–L5 可信度升级  

### MVP 3

- 多攻略冲突检测  
- 多版本输出（忠于攻略 / 舒适 / 低风险 / 摄影）  

---

## 10. 文件索引

```
src/types/guide-import.ts          # UI 模型
src/types/guide-to-plan-api.ts     # 后端 API 类型
src/api/guide-to-plan.ts           # 正式 API + SSE
src/api/guides.ts                  # 降级 mock API
src/lib/guide-to-plan-mapper.ts
src/lib/guide-import-mock.ts
src/pages/trips/from-guide.tsx
src/components/guide-import/
  CreateTripEntryPicker.tsx
  GuideImportInputPanel.tsx
  GuideSourceList.tsx
  GuideUnderstandingSummary.tsx
  GuideTripContextForm.tsx
  GuideDraftPreview.tsx
  GuideReviewItemsView.tsx
```
