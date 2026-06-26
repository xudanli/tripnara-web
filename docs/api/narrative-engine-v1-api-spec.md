# TravelStoryform & Narrative Engine V1 — API 接口规范

**Status:** Draft  
**Date:** 2026-06-16  
**Schema Version:** `1`  
**Base Path:** `/trips/:tripId/narrative`  
**Feature Flag:** `NARRATIVE_THEME_V1=true`

---

## 前端集成

| 模块 | 路径 |
|------|------|
| 类型 | `src/types/narrative-engine.ts` |
| API 客户端 | `src/api/narrative-engine.ts` |
| Hooks | `src/hooks/useNarrativeTheme.ts` |
| 展示文案 | `src/lib/narrative-engine-display.util.ts` |
| 错误处理 | `src/lib/narrative-theme-error.util.ts` |
| Feature Flag | `src/lib/narrative-feature.ts` · `VITE_FEATURE_NARRATIVE_THEME_V1=1` |
| UI 组件 | `src/components/narrative/` |
| Plan Studio 集成 | `NarrativeThemeSection` in `src/pages/plan-studio/index.tsx` |

---

## 1. 设计原则

1. **可演进：** `TravelStoryform` 是完整目标模型；V1 API 只暴露子集
2. **不破坏现有 Intent：** `CompiledIntent` 保持独立；Travel DNA 通过 adapter 桥接（V2）
3. **Fail-open：** 生成/持久化失败返回降级结果，不阻断 Trip 主流程
4. **响应格式：** 遵循 `StandardResponse<T>`（`success` + `data` / `error`）

---

## 2. 类型定义

### 2.1 弧线模板

```typescript
/** V1 可用弧线；V2 增加 'hero' | 'transformation' */
export type NarrativeArcTemplate =
  | 'exploration'
  | 'healing'
  | 'connection'
  | 'neutral';

/** V2+ 反思模式；V1 仅存储默认值 */
export type ReflectionMode = 'analytical' | 'resonance' | 'silent';

/** Q2 旅行动机选项 */
export type TravelMotivation =
  | 'rest'
  | 'discovery'
  | 'connection'
  | 'challenge'
  | 'celebration'
  | 'closure'
  | 'unsure';

/** 旅伴结构 */
export type CompanionContext = 'solo' | 'couple' | 'group' | 'family';
```

### 2.2 Narrative Intake（V1 输入）

```typescript
export interface NarrativeIntakeInput {
  /** Q1: 最近状态 / 感受 */
  recentState?: string;

  /** Q2: 旅行目的（可多选） */
  motivations?: TravelMotivation[];

  /** Q3: 期待气质标签，最多 3 个 */
  moodKeywords?: string[];

  /** 可选：自由补充 */
  freeText?: string;
}
```

### 2.3 Theme Candidate（V1 输出）

```typescript
export interface ThemeCandidate {
  /** 候选 ID，客户端回传 select 时使用 */
  id: string;

  /** 主题标题，如《在风里重新认识自己》 */
  title: string;

  /** 副标题 / 一句话 */
  tagline: string;

  /** 弧线类型 */
  arcTemplate: NarrativeArcTemplate;

  /** 共鸣提示（可选） */
  resonanceHint?: string;

  /** 生成置信度 */
  confidence: 'high' | 'medium' | 'low';

  /** 是否规则模板降级生成 */
  fallbackGenerated: boolean;
}
```

### 2.4 TravelStoryform（完整目标模型）

V1 持久化其子集；完整类型供 V2/V3 演进。

```typescript
import type { CompiledIntent } from '../../trips/intent/intent.compiler';
import type { MobilityPreference, PacePreference } from '../../trips/intent/intent.model';

/**
 * Travel DNA — 四视角叙事形式（UNM Storyform 适配）
 * @see docs/narrative-engine/V1-PRD.md
 */
export interface TravelStoryform {
  /** 模式版本，当前为 1 */
  schemaVersion: 1;

  /** 客观视角：物流与约束（V1: 引用现有 CompiledIntent） */
  objective: {
    /** V1: 可选，规划阶段后回填 */
    compiledIntent?: CompiledIntent;
    destination?: string;
    tripDays?: number;
  };

  /** 主角视角：旅行者画像 */
  protagonist: {
    paceProfile?: PacePreference;
    mobilityPreference?: MobilityPreference;
    /** 用户自述，非 Jung 硬编码 archetype */
    selfDescription?: string;
    emotionalBaseline?: string;
  };

  /** 催化剂视角：旅行动机 */
  catalyst: {
    motivations: TravelMotivation[];
    recentState?: string;
    /** 「人生哪一段」— V2 intake 扩展 */
    lifeChapter?: string;
  };

  /** 关系视角：旅伴与文化连接 */
  relational: {
    companionContext?: CompanionContext;
    connectionIntent?: string[];
  };

  /** 叙事偏好 */
  narrativePreferences: {
    /** V1: 单选；V2: 多选 */
    arcTemplate: NarrativeArcTemplate;
    reflectionMode: ReflectionMode;
    moodKeywords?: string[];
  };

  /** V1: 选定的主题 */
  selectedTheme?: {
    themeId: string;
    title: string;
    tagline: string;
    selectedAt: string; // ISO 8601
  };

  /** V2+: 旅程章节 */
  chapters?: NarrativeChapter[];

  /** 元数据 */
  meta: {
    generationRequestId?: string;
    regenerateCount: number;
    intakeSnapshot?: NarrativeIntakeInput;
    updatedAt: string;
  };
}

/** V2 预留 — 每日叙事章节 */
export interface NarrativeChapter {
  dayIndex: number;
  date?: string;
  title: string;
  emotionalBeat: 'opening' | 'rising' | 'challenge' | 'turn' | 'resolution' | 'quiet';
  motifs: string[];
  /** V2: 传入 Decision Runtime 的软约束 */
  sceneConstraints?: SceneConstraint[];
}

/** V2 预留 — 场景约束 */
export interface SceneConstraint {
  preferPoiCategories?: string[];
  avoidPoiCategories?: string[];
  maxDailyDriveHoursOverride?: number;
  aweMomentSlot?: boolean;
}
```

### 2.5 Trip.metadata 存储格式（V1）

```typescript
/** 写入 Trip.metadata.narrativeTheme */
export interface TripNarrativeThemeMetadata {
  schemaVersion: 1;
  selectedThemeId: string;
  title: string;
  tagline: string;
  arcTemplate: NarrativeArcTemplate;
  reflectionMode: ReflectionMode;
  intakeSnapshot?: NarrativeIntakeInput;
  selectedAt: string;
  generationRequestId?: string;
  regenerateCount: number;
}
```

---

## 3. REST API

### 3.1 通用响应

```typescript
// 成功
{ "success": true, "data": { ... } }

// 失败
{
  "success": false,
  "error": {
    "code": "NARRATIVE_THEME_DISABLED",
    "message": "Narrative theme feature is not enabled",
    "details": { ... }
  }
}
```

### 3.2 POST `/trips/:tripId/narrative/intake`

提交 intake 并生成 3 个主题候选。

**Auth:** Required  
**Flag:** `NARRATIVE_THEME_V1`

**Request Body:**

```json
{
  "intake": {
    "recentState": "工作三年，感觉被日常磨平了棱角",
    "motivations": ["discovery", "rest"],
    "moodKeywords": ["风", "孤独", "开阔"],
    "freeText": ""
  },
  "locale": "zh-CN"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `intake.recentState` | string | No | ≤ 200 chars |
| `intake.motivations` | TravelMotivation[] | No | |
| `intake.moodKeywords` | string[] | No | max 3 |
| `intake.freeText` | string | No | ≤ 500 chars |
| `locale` | string | No | default `zh-CN` |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "tripId": "trip-abc",
    "candidates": [
      {
        "id": "cand-001",
        "title": "《在风里重新认识自己》",
        "tagline": "把不确定留在大风里，把答案带回来",
        "arcTemplate": "exploration",
        "resonanceHint": "适合在开阔地貌、少人路段留出空白时刻",
        "confidence": "high",
        "fallbackGenerated": false
      },
      {
        "id": "cand-002",
        "title": "《慢下来，才算真正到达》",
        "tagline": "不是去看更多，而是看更深",
        "arcTemplate": "healing",
        "confidence": "medium",
        "fallbackGenerated": false
      },
      {
        "id": "cand-003",
        "title": "《一次没有结论的出发》",
        "tagline": "允许这次旅行不回答任何问题",
        "arcTemplate": "neutral",
        "confidence": "high",
        "fallbackGenerated": false
      }
    ],
    "generationRequestId": "req-20260616-xyz",
    "regenerateCount": 0,
    "expiresAt": "2026-06-16T11:00:00.000Z"
  }
}
```

**Errors:**

| Code | HTTP | 说明 |
|------|------|------|
| `NARRATIVE_THEME_DISABLED` | 404 | Flag 关闭 |
| `TRIP_NOT_FOUND` | 404 | |
| `NARRATIVE_REGENERATE_LIMIT` | 429 | 换批超过 3 次 |
| `NARRATIVE_GENERATION_FAILED` | 503 | LLM 与规则降级均失败 |

---

### 3.3 POST `/trips/:tripId/narrative/theme/select`

确认选定主题。

**Request Body:**

```json
{
  "themeId": "cand-001",
  "generationRequestId": "req-20260616-xyz"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "tripId": "trip-abc",
    "theme": {
      "schemaVersion": 1,
      "selectedThemeId": "cand-001",
      "title": "《在风里重新认识自己》",
      "tagline": "把不确定留在大风里，把答案带回来",
      "arcTemplate": "exploration",
      "reflectionMode": "resonance",
      "selectedAt": "2026-06-16T10:05:00.000Z",
      "generationRequestId": "req-20260616-xyz",
      "regenerateCount": 0
    }
  }
}
```

**Side Effects:**

1. 写入 `Trip.metadata.narrativeTheme`
2. 若 `TRAVEL_EVENT_STORE_ENABLED=true`，追加 Event Store 事件（§5）

**Errors:**

| Code | HTTP | 说明 |
|------|------|------|
| `NARRATIVE_THEME_NOT_FOUND` | 400 | themeId 与最近 generation 不匹配 |
| `NARRATIVE_GENERATION_EXPIRED` | 400 | 候选已过期（默认 1h） |

---

### 3.4 POST `/trips/:tripId/narrative/theme/regenerate`

换一批主题（同一 intake，新 prompt seed）。

**Request Body:**

```json
{
  "generationRequestId": "req-20260616-xyz"
}
```

**Response:** 同 §3.2，`regenerateCount` 递增。

**Limit:** 每 Trip 最多 3 次 regenerate（含 intake 首次 = 共 4 批候选）。

---

### 3.5 GET `/trips/:tripId/narrative/theme`

读取当前已选主题。

**Response 200（已选）:**

```json
{
  "success": true,
  "data": {
    "tripId": "trip-abc",
    "theme": { "...TripNarrativeThemeMetadata..." },
    "storyform": {
      "schemaVersion": 1,
      "objective": { "destination": "Iceland", "tripDays": 7 },
      "protagonist": {},
      "catalyst": {
        "motivations": ["discovery", "rest"],
        "recentState": "..."
      },
      "relational": {},
      "narrativePreferences": {
        "arcTemplate": "exploration",
        "reflectionMode": "resonance",
        "moodKeywords": ["风", "孤独", "开阔"]
      },
      "selectedTheme": {
        "themeId": "cand-001",
        "title": "《在风里重新认识自己》",
        "tagline": "...",
        "selectedAt": "2026-06-16T10:05:00.000Z"
      },
      "meta": {
        "regenerateCount": 0,
        "updatedAt": "2026-06-16T10:05:00.000Z"
      }
    }
  }
}
```

**Response 200（未选）:**

```json
{
  "success": true,
  "data": {
    "tripId": "trip-abc",
    "theme": null,
    "storyform": null
  }
}
```

---

### 3.6 DELETE `/trips/:tripId/narrative/theme`

清除已选主题（用户跳过 / 移除）。

**Response 200:**

```json
{
  "success": true,
  "data": {
    "tripId": "trip-abc",
    "cleared": true
  }
}
```

---

## 4. 服务层接口（NestJS 内部）

建议模块路径：`src/trips/narrative-engine/`

### 4.1 NarrativeThemeService

```typescript
@Injectable()
export class NarrativeThemeService {
  /** 生成主题候选 */
  generateCandidates(
    tripId: string,
    input: NarrativeIntakeInput,
    options?: { locale?: string; requestId?: string },
  ): Promise<GenerateCandidatesResult>;

  /** 选定主题并持久化 */
  selectTheme(
    tripId: string,
    themeId: string,
    generationRequestId: string,
    userId?: string,
  ): Promise<TripNarrativeThemeMetadata>;

  /** 换批 */
  regenerateCandidates(
    tripId: string,
    generationRequestId: string,
  ): Promise<GenerateCandidatesResult>;

  /** 读取 */
  getTheme(tripId: string): Promise<TravelStoryform | null>;

  /** 清除 */
  clearTheme(tripId: string, userId?: string): Promise<void>;
}

interface GenerateCandidatesResult {
  candidates: ThemeCandidate[];
  generationRequestId: string;
  regenerateCount: number;
  expiresAt: string;
}
```

### 4.2 TravelDnaEncoder（V1 子集）

```typescript
/** 将 intake + trip 上下文编码为 TravelStoryform（V1 不含 CompiledIntent） */
export function encodeTravelStoryform(input: {
  intake: NarrativeIntakeInput;
  trip?: { destination?: string; tripDays?: number };
  selectedTheme?: ThemeCandidate;
  meta?: Partial<TravelStoryform['meta']>;
}): TravelStoryform;

/** V2: 合并 CompiledIntent */
export function mergeCompiledIntent(
  storyform: TravelStoryform,
  compiled: CompiledIntent,
): TravelStoryform;
```

### 4.3 NarrativeThemeGenerator

```typescript
@Injectable()
export class NarrativeThemeGenerator {
  /** LLM 主路径 */
  generateViaLlm(
    storyform: TravelStoryform,
    locale: string,
  ): Promise<ThemeCandidate[]>;

  /** 规则降级 */
  generateViaRules(storyform: TravelStoryform): ThemeCandidate[];
}
```

**规则降级映射（V1）：**

| motivations 主选 | 默认 arcTemplate | 标题模板 |
|------------------|------------------|----------|
| rest, closure | healing | 《慢下来，才算真正到达》 |
| discovery, challenge | exploration | 《向未知借一条路》 |
| connection, celebration | connection | 《在别处遇见自己》 |
| unsure / 空 | neutral | 《一次没有结论的出发》 |

### 4.4 NarrativeThemeController

```typescript
@Controller('trips/:tripId/narrative')
@ApiTags('Narrative Engine')
export class NarrativeThemeController {
  constructor(
    private readonly themeService: NarrativeThemeService,
    private readonly featureFlags: NarrativeFeatureGuard,
  ) {}

  @Post('intake')
  @Post('theme/select')
  @Post('theme/regenerate')
  @Get('theme')
  @Delete('theme')
}
```

### 4.5 Feature Guard

```typescript
/** 环境变量: NARRATIVE_THEME_V1=true */
export class NarrativeFeatureGuard implements CanActivate {
  canActivate(): boolean {
    return process.env.NARRATIVE_THEME_V1 === 'true';
  }
}
```

可扩展 `FeatureFlagService`：

```typescript
export interface FeatureFlags {
  // ...existing
  enableNarrativeThemeV1: boolean; // NARRATIVE_THEME_V1
}
```

---

## 5. Travel Event Store 集成

### 5.1 新增 Event Type

```typescript
// 扩展 travel-event.types.ts
export enum TravelEventType {
  // ...existing
  TRIP_NARRATIVE_THEME_SELECTED = 'trip.narrative.theme_selected',
  TRIP_NARRATIVE_THEME_CLEARED = 'trip.narrative.theme_cleared',
}
```

### 5.2 theme_selected Payload

```typescript
interface NarrativeThemeSelectedPayload {
  themeId: string;
  title: string;
  arcTemplate: NarrativeArcTemplate;
  generationRequestId: string;
  regenerateCount: number;
  intakeSnapshot?: NarrativeIntakeInput;
}
```

**Envelope:**

| Field | Value |
|-------|-------|
| `segment` | `DECISION` |
| `eventType` | `trip.narrative.theme_selected` |
| `source` | `narrative_engine` |

新增 `TravelEventSource`：

```typescript
export enum TravelEventSource {
  // ...existing
  NARRATIVE_ENGINE = 'narrative_engine',
}
```

### 5.3 Idempotency Key

```
narrative:theme_selected|{tripId}|{themeId}|{generationRequestId}
```

---

## 6. 与 narrative.synthesizer 集成（可选增强）

```typescript
// narrative.synthesizer.ts — generateTitle 增强
function generateTitle(ctx: SynthesizeNarrativeContext): string {
  const themeTitle = ctx.tripMetadata?.narrativeTheme?.title;
  if (themeTitle) {
    return themeTitle.replace(/[《》]/g, ''); // 或保留书名号
  }
  // ...existing logic
}
```

V1 为 **可选**；不阻塞主题 API 交付。

---

## 7. 文件结构（建议）

```
src/trips/narrative-engine/
├── narrative-engine.module.ts
├── controllers/
│   └── narrative-theme.controller.ts
├── dto/
│   ├── narrative-intake.dto.ts
│   ├── theme-candidate.dto.ts
│   └── select-theme.dto.ts
├── services/
│   ├── narrative-theme.service.ts
│   ├── narrative-theme-generator.service.ts
│   └── narrative-theme-persistence.service.ts
├── encoders/
│   └── travel-dna.encoder.ts
├── types/
│   ├── travel-storyform.types.ts
│   └── narrative-arc.types.ts
├── guards/
│   └── narrative-feature.guard.ts
├── events/
│   └── narrative-theme-event.builder.ts
└── __tests__/
    ├── travel-dna.encoder.spec.ts
    ├── narrative-theme-generator.spec.ts
    └── narrative-theme.service.spec.ts
```

---

## 8. 测试要求

| 层级 | 覆盖 |
|------|------|
| Unit | `encodeTravelStoryform` 四视角映射 |
| Unit | 规则降级：每种 motivation → 正确 arcTemplate |
| Unit | regenerate 限流（第 4 次返回 429） |
| Integration | intake → select → GET 往返 |
| Integration | flag off → 404 |
| Integration | Event Store write（flag on） |

**测试命令（建议）：**

```bash
npm test -- --testPathPatterns="narrative-engine|travel-dna.encoder|narrative-theme"
```

---

## 9. OpenAPI 片段

```yaml
paths:
  /trips/{tripId}/narrative/intake:
    post:
      tags: [Narrative Engine]
      summary: Submit narrative intake and generate theme candidates
      parameters:
        - name: tripId
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NarrativeIntakeRequest'
      responses:
        '200':
          description: Theme candidates generated
        '404':
          description: Feature disabled or trip not found

components:
  schemas:
    NarrativeArcTemplate:
      type: string
      enum: [exploration, healing, connection, neutral]
    TravelMotivation:
      type: string
      enum: [rest, discovery, connection, challenge, celebration, closure, unsure]
```

---

## 10. 版本演进

| schemaVersion | 变更 |
|---------------|------|
| 1 | V1 主题 + intake |
| 2 | + `chapters[]`, `sceneConstraints`, `hero` arc |
| 3 | + `memoryArtifacts[]`, Reflection Engine 回写 |

客户端应忽略未知字段；服务端写入时保留 `schemaVersion`.
