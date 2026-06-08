# Vibe LLM Engine · 动态场景生成与解析

> Decision OS 发布招募 / 旅行意向 · Real-time Fluid Generation

## 1. 底层工作链路

```
[用户自由输入小作文] → [LLM 语义解析] → [高光场景 / 物理约束 / 圈层期望] → [Chips & 拼图位]
```

对用户无感；前端表现为键入时标签「呼吸般」滑出。

### 输出 JSON Schema

```json
{
  "vibe_chips": ["🏎️ 自驾环游", "🍳 炊事合伙人"],
  "teamwork_contract_model": "Co-Creation",
  "hard_gates": {
    "education_baseline": "Bachelor",
    "industry_preference": ["泛科技/互联网"],
    "security_level": "High"
  },
  "slot_definitions": [
    { "slot_id": 1, "expected_tag": "E人/气氛组", "reason": "平衡长途沉闷" }
  ],
  "behavior_contracts": [
    { "tag": "🍳 炊事合伙人", "clause": "买菜分工与费用均摊…" }
  ]
}
```

## 2. 前端模块

| 组件 | 职责 |
|------|------|
| `VibeIntentComposer` | 发布页主输入 + debounce 解析 |
| `VibeChipStream` | Apple-style 标签动效 |
| `VibePuzzlePreview` | 实时车队拼图虚位 |
| `useVibeLlmParse` | 450ms debounce + React Query |

API：`POST /match-square/vibe-llm/parse`（需登录）  
Dev fallback：`rule-parser.ts`（`VITE_MATCH_SQUARE_MOCK=1` 或 auto 且 404 时）

## 3. PRD §4.3 LLM 动态意图解析协议

### System Prompt

见 `src/features/match-square/lib/vibe-llm/system-prompt.ts`

### Tag Mapping Lexicon

| 用户表述 | vibe_chip | 算法联动 |
|----------|-----------|----------|
| 写代码 / vibe coding | ⚡️ Vibe Coding | 低社交能耗、电源/网络权重 |
| 穷游 / 做饭 | 🍳 炊事合伙人 | 行中账目轧差托管 |
| 靠谱 / 大厂 / 学历 | 🛡️ 职层高授信 | 学信网 + 企业邮箱 Hard Gate |
| 自驾 / 环游 | 🏎️ 自驾环游 | travelMode=self_drive |

### 动态契约

`contract-dictionary.ts` — LLM 输出 tag 后抽取行为条款；申请人在 `ApplyToRecruitmentDialog` 勾选 `vibeContractsAccepted`。

### teamwork_contract_model → planningStyle

| Model | planningStyle |
|-------|---------------|
| Full-Managed | full_managed |
| Co-Creation | co_planning |
| Casual-Play | casual_play |

## 4. 数据流

1. `RecruitmentForm` → `VibeIntentComposer` 实时解析  
2. 自动同步：组队风格、偏好要求、行程概述、拼图预览  
3. `CreatePostRequest.vibeParse` → 后端落库  
4. `mock-store.createPost` → `applyVibeParseToPost` → `teamPuzzle`  
5. `getApplyPreview` → `vibeBehaviorContracts` → 申请弹窗

## 5. 后端

- [x] `POST /match-square/vibe-llm/parse` — 已部署（需 Bearer 认证；响应 `{ success, data: { payload, ... } }`）
- [ ] posts 表 `vibe_parse jsonb` 服务端 re-parse on create
- [ ] Match Engine 读取 `hard_gates.security_level=High` 触发授信闸门

### 前端联调

```bash
# .env.development
VITE_MATCH_SQUARE_MOCK=0   # 或 VITE_VIBE_LLM_MOCK=0
```

登录后发布页输入愿景，标签旁应显示 **Live LLM**（非「规则预览」）。

## 6. 版本

- Engine: `v1.0.0` · 2026-06
