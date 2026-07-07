# Guide-to-Plan 前端对接手册（联调版）

> 与后端 BFF 对齐的联调说明。实现见 `src/types/guide-to-plan-api.ts`、`src/api/guide-to-plan.ts`、`src/lib/guide-to-plan-mapper.ts`、`src/pages/trips/from-guide.tsx`。

**Base URL：** `/api/guide-to-plan`  
**鉴权：** `Authorization: Bearer <JWT>`  
**成功：** `{ success: true, data: ... }`  
**错误：** `{ statusCode: 400, message: "..." }`

---

## 一、页面流（以 `resumeRoute` 为准）

恢复会话 **优先读** `GET /sessions/:id` 的 `resumeRoute`，不要只看 `status`：

| resumeRoute | 页面 | 典型条件 |
|-------------|------|----------|
| `import` | 导入页 | 无攻略 / 解析失败回 `collecting` |
| `parse_progress` | 解析进度 | `parsing` 或 parse job running |
| `understanding` | 理解摘要 | 已解析，出行条件未齐 |
| `travel_context` | 出行条件 | 有必填 `pendingConfirmations` |
| `draft` | 草案对比 | `draft_ready` 或有草案 |
| `trip` | 正式行程 | 已 `accepted` / 有 `tripId` |

```
import → parse_progress → understanding → travel_context → draft → trip
```

---

## 二、Breaking Changes

| 改动 | 旧 | 新 |
|------|----|----|
| `GET /sessions` | `data` 数组 | `data.items` + `total/limit/offset` |
| 解析失败 | 可能停 `awaiting_context` | 回 `collecting`，`parseProgress.status=failed` |
| `POST /generate` | 条件较松 | 多道守卫 |
| `POST /accept` | 任意 mutable | **仅 `draft_ready`** |
| 导入/删除 | 任意时刻 | 解析中/生成中 → 400 |

---

## 三、前端已实现对照

| 能力 | 位置 |
|------|------|
| 分页 `listSessions({ limit, offset, includeAbandoned })` | `guide-to-plan.ts` |
| `resumeRoute` 恢复 + `trip` 跳 Plan Studio | `from-guide.tsx` + `resolveSessionFlowStep` |
| 守卫 `sessionCanImport` / `sessionCanParse` / `checkSessionCanGenerate` / `sessionCanAcceptDraft` | `guide-to-plan-mapper.ts` |
| `parseRequired` / `parsedGuideCount` / `places[].geo` / `matchStatus` | `GuideUnderstandingSummary` |
| `countryCode` 推断 + 解析前 PATCH + 提交后刷新 understanding | `guide-session-country.ts` + `from-guide.tsx` |
| POI rematch / 手动绑定 | `rematchPlaces` + `patchPlaceCandidate` + `GuidePlaceCandidateCard` |
| `pendingConfirmations` 动态表单 + `vehicleType` | `GuideTripContextForm` |
| 分步 PATCH 出行条件 | `tripContextPartialToApi` |
| Accept 三模式 + review | `from-guide.tsx` |
| 8 万字预检 | `GUIDE_CONTENT_MAX_CHARS` |

---

## 四、按钮 enable 参考

```typescript
sessionCanImport(status)           // !parsing && !generating && !abandoned && !accepted
sessionCanParse(status, guideCount)
checkSessionCanGenerate({ status, parseRequired, parsedGuideCount, inspirationCandidateCount, pendingConfirmations })
sessionCanAcceptDraft(status)      // status === 'draft_ready' only
```

---

## 五、常见 400

| message 片段 | 前端动作 |
|--------------|----------|
| 解析进行中 | 禁用导入，展示进度页 |
| 请先完成攻略解析 | 引导 parse |
| 请先完善出行条件 | 跳转 `travel_context` |
| 请先生成草案 / 草案未就绪 | accept 禁用 |
| 草案生成中 | 全局 loading |
| 超过上限 | 表单校验 |

---

## 六、联调顺序

1. `GET /sessions` 分页 + `resumeRoute` 恢复  
2. 解析失败 → 回导入页  
3. `GET /understanding` 新字段 + geo 徽章  
4. 出行条件：`pendingConfirmations` + `vehicleType`  
5. `POST /generate` 错误 + `generating` 态  
6. 草案页：`routeAvailability` / `travelMinutesFromPrev`（类型已就绪，UI 逐步增强）  
7. accept 仅 `draft_ready`

---

## 七、countryCode 与 POI 匹配（联调）

### 7.1 建议时机

| 时机 | 做法 | 前端实现 |
|------|------|----------|
| 创建会话 | 尽量带 `countryCode: "IS"`（冰岛联调） | `POST /sessions` body；默认读 `VITE_GUIDE_DEFAULT_COUNTRY_CODE`，或从攻略标题推断「冰岛」→ `IS` |
| 解析前 | 若会话尚无国家码，PATCH 后再 `parse/async` | `ensureCountryCodeOnSession()` |
| 完善出行条件 | 用户填写「国家 / 地区代码」后 | 分步 PATCH → **自动 `GET /understanding` 刷新** |

### 7.2 预期现象

- 提交 `countryCode: "IS"` 并刷新 understanding 后，部分地点 `matchStatus` 变为 `matched`，可信度可能升为 **L3**（UI 显示「L3 已匹配」）。
- 仍为 `unmatched` 的名称：后续可选手动选 POI，或接入 `PlacesService.autocomplete` / `EntityResolutionService`（尚未实现）。

### 7.3 环境变量（可选）

```bash
# .env.development
VITE_GUIDE_DEFAULT_COUNTRY_CODE=IS
```

### 7.4 推断规则（`src/lib/guide-session-country.ts`）

优先级：`tripContext.countryCode` → `session.countryCode` → `VITE_GUIDE_DEFAULT_COUNTRY_CODE` → 文案推断（冰岛/Iceland 等）→ 无。

---

## 八、POI 匹配与手动绑定

### 8.1 接口

| 方法 | 路径 | Body | 说明 |
|------|------|------|------|
| POST | `/sessions/:id/places/rematch` | `{ countryCode?: "IS" }` | 批量重匹配；不传则用会话 countryCode |
| PATCH | `/sessions/:id/places/:candidateId` | `{ placeId: 381090 }` | 手动绑定 POI |
| PATCH | `/sessions/:id/places/:candidateId` | `{ matchStatus: "rejected" }` | 标记无需匹配 |
| GET | `/places/autocomplete` | `q` + `countryCode` | POI 搜索（已有 `placesApi.autocompletePlaces`） |

**rematch 返回：** `attempted` / `matched` / `stillUnmatched` + 更新后的 `summary.unmatchedPlaceCount`

**PATCH 返回：** 更新后的 `place`（含 `geo`、`credibilityLevel`）+ `summary`

### 8.2 前端交互（理解页）

- 待匹配地点卡片 → **搜索 POI** → autocomplete → PATCH 绑定
- **无需匹配** → PATCH `{ matchStatus: "rejected" }`
- 填好 countryCode 后 → **重新匹配** → POST rematch
- 绑定成功 → `credibilityLevel` 升为 L3，`unmatchedPlaceCount` 递减，潜在问题列表随 `GET /understanding` 刷新

**未匹配数对齐：** 后端 `getUnderstandingView` 已改为每次按当前 `places[]` 重算 `summary`（含 poi / activity / restaurant / hotel 四类）。前端在 `guide-to-plan-mapper.ts` 中亦用 `places[]` 实时统计（`countUnmatchedPlaceCandidates`），Toolbar「N 个地点待匹配」与 Section 3 潜在问题与卡片 L1 数量保持一致，不单独依赖可能滞后的 `summary.unmatchedPlaceCount` / `potentialIssues` 文案。

### 8.3 触发 rematch / 刷新的时机

- 用户点击「重新匹配」
- PATCH `/travel-context` 变更 `countryCode`（后端 rematch + 前端 `refreshUnderstanding`）
- 手动绑定 / 拒绝后 `refreshUnderstanding`

若某条接口有实际响应 JSON，可对照 `guide-to-plan-api.ts` 逐项核对。
