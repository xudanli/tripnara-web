import type { MatchEngineProfile } from './types';
import { idealMemberArchetypes } from './mbti-synergy';
import { controlStyleLabel } from './calculate-match';

/** 基于队长画像 + 约束满足，生成虚位拼图定向邀约标签 */
export function generateConstraintSlotLabels(
  leader: MatchEngineProfile,
  slotsRemaining: number
): string[] {
  const labels: string[] = [];
  const leaderMbti = String(leader.mbtiType);

  if (leader.controlStyle === 'full_managed' || leader.stressTraits.controlScore >= 8) {
    labels.push('🛡️ 乐意接受全托管的靠谱执行者');
    labels.push('🎭 随性体验者 · 不抢决策权');
  } else if (leader.controlStyle === 'co_planning') {
    labels.push('🤝 民主合伙人 · 一起策划型');
    labels.push('📋 边界清晰 · 可微型短会分工');
  } else {
    labels.push('🎲 一起随便玩 · 低控制欲搭子');
  }

  if (leader.stressTraits.qualityBaseline >= 8) {
    labels.push('✨ 品质底线同频 · 不接受低质妥协');
  } else if (leader.stressTraits.qualityBaseline <= 3) {
    labels.push('🌿 安全优先 · 随遇而安型');
  }

  if (leader.stressTraits.financialElasticity >= 8) {
    labels.push('💎 消费弹性高 · 可各付各的高光体验');
  }

  if (leader.socialTier >= 4) {
    labels.push('🎓 本科以上认证 · 同频沟通');
  }

  const archetypes = idealMemberArchetypes(leaderMbti);
  for (const a of archetypes) {
    labels.push(`🧩 ${a}`);
  }

  labels.push(
    `队长 ${leaderMbti} · ${controlStyleLabel(leader.controlStyle)} · 定向拼图位`
  );

  const unique = [...new Set(labels)];
  return unique.slice(0, Math.max(slotsRemaining, 1));
}

export function slotLabelMatchesViewer(
  label: string,
  viewer: MatchEngineProfile | null | undefined
): boolean {
  if (!viewer) return false;
  const mbti = String(viewer.mbtiType).toUpperCase();

  if (/ENFP|ESFP|ISTP|ESTP/.test(label) && /ENFP|ESFP|ISTP|ESTP/.test(mbti)) return true;
  if (/全托管|执行者|不抢决策/.test(label) && viewer.controlStyle === 'casual_delegate') {
    return true;
  }
  if (/一起策划|民主/.test(label) && viewer.controlStyle === 'co_planning') return true;
  if (/品质底线|五星级|低质/.test(label) && viewer.stressTraits.qualityBaseline >= 8) {
    return true;
  }
  if (/消费弹性|各付各/.test(label) && viewer.stressTraits.financialElasticity >= 8) {
    return true;
  }
  if (/本科以上|硕士|认证/.test(label) && viewer.socialTier >= 3) return true;
  if (label.includes(mbti)) return true;

  return false;
}
