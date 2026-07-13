import { aggregateFrictionByDomain } from '@/lib/collab-friction-domains';
import type {
  TeamConflictItem,
  TeamRequirementMemberView,
  TeamRequirementProfile,
  TeamSpreadSeverity,
} from '@/types/team-requirement-profile';
import type { FrictionMatrixPair } from '@/types/trip-decision-profiling';

export type RequirementSectionId =
  | 'core-wish'
  | 'experience'
  | 'pace'
  | 'lodging'
  | 'diet-health'
  | 'spending';

export interface RequirementSectionDef {
  id: RequirementSectionId;
  label: string;
}

export const REQUIREMENT_SECTIONS: RequirementSectionDef[] = [
  { id: 'core-wish', label: '核心愿望' },
  { id: 'experience', label: '硬性限制' },
  { id: 'pace', label: '体力节奏' },
  { id: 'lodging', label: '住宿' },
  { id: 'diet-health', label: '餐饮健康' },
  { id: 'spending', label: '预算倾向' },
];

export interface RequirementRadarAxis {
  key: string;
  label: string;
  intensity: number;
}

export interface MemberRequirementProgress {
  userId: string;
  displayName: string;
  completionPct: number;
  missingLabels: string[];
}

export interface RequirementSummaryCard {
  id: string;
  tone: 'green' | 'red' | 'blue' | 'orange';
  title: string;
  items: string[];
  memberNames?: string[];
}

function severityToIntensity(severity: TeamSpreadSeverity): number {
  if (severity === 'aligned') return 22;
  if (severity === 'mixed') return 58;
  return 86;
}

function lodgingDiversity(members: TeamRequirementMemberView[]): number {
  const values = members.map((m) => m.lodging.trim()).filter(Boolean);
  if (values.length <= 1) return 20;
  const unique = new Set(values.map((v) => v.toLowerCase()));
  return Math.min(88, Math.round((unique.size / values.length) * 100));
}

function dietDiversity(members: TeamRequirementMemberView[]): number {
  const values = members
    .map((m) => [m.diet.restrictions, m.diet.healthNotes].filter(Boolean).join(' '))
    .filter(Boolean);
  if (values.length <= 1) return 18;
  const unique = new Set(values.map((v) => v.toLowerCase()));
  return Math.min(85, Math.round((unique.size / values.length) * 100));
}

function wishDiversity(members: TeamRequirementMemberView[]): number {
  const wishes = members.flatMap((m) => m.coreWishes);
  if (wishes.length <= 1) return 20;
  const unique = new Set(wishes.map((w) => w.trim().toLowerCase()).filter(Boolean));
  return Math.min(90, Math.round((unique.size / wishes.length) * 100));
}

function earlyRiserIntensity(members: TeamRequirementMemberView[]): number {
  if (members.length <= 1) return 20;
  const earlyCount = members.filter((m) => m.pace.earlyRiser).length;
  if (earlyCount === 0 || earlyCount === members.length) return 24;
  const minority = Math.min(earlyCount, members.length - earlyCount);
  return Math.min(92, Math.round(45 + (minority / members.length) * 100));
}

export function isRequirementSectionFilled(
  member: TeamRequirementMemberView,
  sectionId: RequirementSectionId,
): boolean {
  if (!member.submitted) return false;
  switch (sectionId) {
    case 'core-wish':
      return member.coreWishes.length > 0;
    case 'experience':
      return Boolean(member.hardConstraints.must || member.hardConstraints.avoid);
    case 'pace':
      return true;
    case 'lodging':
      return Boolean(member.lodging.trim());
    case 'diet-health':
      return Boolean(member.diet.restrictions.trim() || member.diet.healthNotes.trim());
    case 'spending':
      return true;
    default:
      return false;
  }
}

export function computeMemberRequirementProgress(
  member: TeamRequirementMemberView,
): MemberRequirementProgress {
  const missingLabels = REQUIREMENT_SECTIONS.filter(
    (section) => !isRequirementSectionFilled(member, section.id),
  ).map((section) => section.label);

  const filledCount = REQUIREMENT_SECTIONS.length - missingLabels.length;
  const completionPct = member.submitted
    ? Math.round((filledCount / REQUIREMENT_SECTIONS.length) * 100)
    : 0;

  return {
    userId: member.userId,
    displayName: member.displayName,
    completionPct,
    missingLabels,
  };
}

export function buildRequirementRadarAxes(
  profile: TeamRequirementProfile,
  frictionPairs: FrictionMatrixPair[],
): RequirementRadarAxis[] {
  const submitted = profile.members.filter((m) => m.submitted);
  const domainFriction = new Map(
    aggregateFrictionByDomain(frictionPairs).map((row) => [row.domain, row.score]),
  );

  return [
    {
      key: 'activities',
      label: '景点偏好',
      intensity: domainFriction.get('activities') ?? wishDiversity(submitted),
    },
    {
      key: 'pace',
      label: '体力节奏',
      intensity: domainFriction.get('pace') ?? severityToIntensity(profile.paceSpread.severity),
    },
    {
      key: 'early',
      label: '早起接受',
      intensity: earlyRiserIntensity(submitted),
    },
    {
      key: 'accommodation',
      label: '住宿舒适度',
      intensity: domainFriction.get('accommodation') ?? lodgingDiversity(submitted),
    },
    {
      key: 'dining',
      label: '餐饮偏好',
      intensity: domainFriction.get('dining') ?? dietDiversity(submitted),
    },
    {
      key: 'budget',
      label: '预算倾向',
      intensity: domainFriction.get('budget') ?? severityToIntensity(profile.spendingSpread.severity),
    },
  ];
}

function topFrequencyItems(values: string[], limit: number): string[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const raw of values) {
    const label = raw.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    const prev = counts.get(key);
    counts.set(key, { label, count: (prev?.count ?? 0) + 1 });
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((item) => item.label);
}

function membersForWish(wish: string, members: TeamRequirementMemberView[]): string[] {
  const key = wish.trim().toLowerCase();
  return members
    .filter((m) => m.coreWishes.some((w) => w.trim().toLowerCase() === key))
    .map((m) => m.displayName);
}

export function buildRequirementSummaryCards(
  profile: TeamRequirementProfile,
): RequirementSummaryCard[] {
  const submitted = profile.members.filter((m) => m.submitted);
  const allWishes = submitted.flatMap((m) => m.coreWishes);
  const topWishes = topFrequencyItems(allWishes, 3);

  const constraints = [
    ...submitted.map((m) => m.hardConstraints.must).filter(Boolean),
    ...submitted.map((m) => m.hardConstraints.avoid).filter(Boolean),
  ];
  const topConstraints = topFrequencyItems(constraints, 3);

  const consensus: string[] = [];
  if (profile.paceSpread.severity === 'aligned' && submitted.length > 0) {
    consensus.push(`行程节奏一致（${profile.paceSpread.summary.replace(/^团队节奏一致（|）$/g, '') || '节奏合拍'}）`);
  }
  if (profile.spendingSpread.severity === 'aligned' && submitted.length > 0) {
    consensus.push(`消费预期一致（${profile.spendingSpread.summary.replace(/^消费档位一致（|）$/g, '') || '预算合拍'}）`);
  }
  if (profile.splitWillingness.severity === 'aligned' && submitted.length > 0) {
    consensus.push('分流意愿一致');
  }
  if (consensus.length === 0 && submitted.length > 0) {
    consensus.push('自然风景优先于城市打卡', '可接受轻度徒步');
  }

  const negotiation = profile.potentialConflicts
    .filter((c) => c.severity === 'high' || c.severity === 'medium')
    .slice(0, 3)
    .map((c) => c.title);

  return [
    {
      id: 'wishes',
      tone: 'green',
      title: 'TOP 3 共同核心愿望',
      items: topWishes.length > 0 ? topWishes : ['待成员提交问卷后汇总'],
      memberNames: topWishes.length > 0 ? membersForWish(topWishes[0]!, submitted) : undefined,
    },
    {
      id: 'constraints',
      tone: 'red',
      title: '共同硬性限制',
      items: topConstraints.length > 0 ? topConstraints : ['暂无共同硬性限制记录'],
    },
    {
      id: 'consensus',
      tone: 'blue',
      title: '一致点',
      items: consensus.slice(0, 3),
    },
    {
      id: 'negotiation',
      tone: 'orange',
      title: '需协商优先级',
      items: negotiation.length > 0 ? negotiation : ['当前无明显高优先级分歧'],
    },
  ];
}

export function buildTeamStatusSummary(profile: TeamRequirementProfile): string {
  const pending = profile.expectedCount - profile.submittedCount;
  const base = `已收集 ${profile.submittedCount}/${profile.expectedCount || profile.members.length} 份需求`;
  if (pending <= 0 && profile.potentialConflicts.length === 0) {
    return `${base}，团队需求整体较为一致。`;
  }

  const conflictLabels = profile.potentialConflicts
    .filter((c) => c.severity === 'high' || c.severity === 'medium')
    .slice(0, 2)
    .map((c) => c.title.replace(/冲突|差异|摩擦/g, '').trim() || c.title);

  if (conflictLabels.length > 0) {
    return `${base}，主要分歧集中在${conflictLabels.join('与')}。`;
  }

  if (pending > 0) {
    return `${base}，仍有 ${pending} 人待填写问卷。`;
  }

  return `${base}，建议进入协作决策进一步对齐细节。`;
}

export function conflictRiskLabel(conflict: TeamConflictItem): string {
  if (conflict.severity === 'high') return '高风险';
  if (conflict.severity === 'medium') return '中风险';
  return '低风险';
}

export function memberInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export function progressBarTone(pct: number): string {
  if (pct >= 100) return 'bg-emerald-500';
  if (pct > 0) return 'bg-amber-500';
  return 'bg-muted-foreground/30';
}
