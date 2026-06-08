# Decision OS Match Engine · 生产级算法架构

> 面向高端圈层：自选 MBTI + 硬核背书 + Premium 行中博弈题  
> 目标：**团队结构稳定性（Structural Stability）**，而非 pairwise 相似度

## 1. 特征向量建模

每个完成 Premium 入网的用户向量为：

```
U = [ M₁₋₄ , E₁, E₂, P₁, P₂ , C, A, F ]
```

| 字段 | 来源 | 编码 |
|------|------|------|
| `M₁₋₄` | 自选 MBTI | 四轴 0/1：E, S, T, J |
| `E₁` | 学信网学历 | 大专=1, 本科=3, 硕士=5, 博士=6 |
| `E₂` | 院校档次 | 普通=1, 211=3, 985=4, QS50/海归=5 |
| `P₁` | 行业圈层 | 互联网=4, 金融=5, 制造=3, … |
| `P₂` | 职级权重 | 基层=1, 资深=3, 总监/高管=5 |
| `C` | 场景2 行中分工 | 全托管=10, 一起策划=5, 随便玩=1 |
| `A` | 场景1 资源挤兑 | 品质底线=10, 安全优先=1 |
| `F` | 场景3 溢价消费 | 悦己独立=10, 团队妥协=1 |

**圈层沟通带宽：**

```
socialScore = E₁ × E₂ × P₂
socialTier  = normalize(socialScore) → 1..6
```

前端实现：`src/features/match-square/lib/match-engine/`

- `build-profile.ts` — 从 API 背书 + localStorage Premium 抗压题构建 `MatchEngineProfile`
- `serializeFeatureVector()` — 11 维浮点序列，供后端落库对齐

## 2. 双层撮合（Two-Tier Filter）

### Layer 1 · 硬熔断（Hard Gates）

1. **时空错位**：目的地/日期窗口交集 `< 3` 天 → `score = 0`
2. **沟通带宽**：`|socialTier_leader − socialTier_member| > 3` → 隐性过滤

```python
credential_gap = abs(leader.social_tier - member.social_tier)
if credential_gap > MAX_ALLOWED_GAP:  # default 3
    return 0
```

### Layer 2 · 软权重（Soft Weights）

```
Compatibility = clamp(50 + teamwork_fit + stress_penalty + mbti_synergy, 50, 100)
```

| 分量 | 权重语义 | 规则摘要 |
|------|----------|----------|
| **Teamwork Fit** | ~30% | 队长 C=10 + 队员 C≤3 → +25；双 C=10 → −20；双 C=5 → +20 |
| **Stress Fit** | ~25% | `max(-15, -1.5 × euclidean([A,F]))` |
| **MBTI Synergy** | ~20% | 职场公路片互补矩阵，如 INTJ×ENFP +15 |

核心实现：`calculate-match.ts` → `calculateStructuralMatch(leader, member)`

## 3. 伪代码（与 Python spec 对齐）

```typescript
function calculateMatchScore(leader, member, tripIntent) {
  if (!timeOverlap(leader.trip, member.trip, minDays=3)) return 0;
  if (abs(leader.socialTier - member.socialTier) > 3) return 0;

  let score = 50;
  score += teamworkFit(leader.C, member.C, leader.style, member.style);
  score += stressPenalty(leader.A, leader.F, member.A, member.F);
  score += mbtiSynergyMatrix[leader.mbti][member.mbti] ?? quadrantBonus;
  return clamp(score, 50, 100);
}
```

## 4. 车队拼图 · 约束满足（CSP）

队长发帖后，虚位槽标签由 `generateConstraintSlotLabels(leaderProfile)` 生成，例如：

- INTJ + 全托管 + 高品质底线 →  
  `🛡️ 乐意接受全托管的靠谱执行者` · `🎓 本科以上认证` · `🧩 ENFP · 角色拼图加成 +15`

实现：`puzzle-slots.ts` + `team-puzzle.ts` / `slot-filling.ts`

## 5. 前端外显

- **契合度气泡**（`CompatibilityBreakdownBadge`）：点击展示结构稳定性报告  
  - ✓ 圈层沟通带宽  
  - ✓ 团队契约分工（全托管飞轮 / 民主合伙人）  
  - ⚠️ 行中审美分歧  
- **拼图高亮**：浏览者 `MatchEngineProfile` 与虚位标签匹配时 pulse 高亮

## 6. 后端工程化建议

| 模块 | 建议 |
|------|------|
| 表结构 | `user_match_vectors(user_id, vector jsonb, intake_version, updated_at)` |
| 索引 | 目的地 + 日期 GIST；social_tier B-tree |
| 服务 | `MatchEngineService.calculate(leader_id, candidate_ids[])` |
| 批处理 | 队长发帖 → 异步 Graph Clustering 预筛同 tier + 同窗口 |
| API | `GET /posts/:id/match-preview` 返回 `structuralInsights[]` |

## 7. 前端调用链

```
Premium Intake → localStorage stress answers
       ↓
usePlazaMatchContext → viewerMatchProfile
       ↓
enrichPostMatchInsights → calculateStructuralMatch
       ↓
RecruitmentCard / MatchFlash → CompatibilityBreakdownBadge
```

## 8. 版本

- `intakeVersion: premium_v2`
- Match Engine client: `v2.0.0`（2026-06）
