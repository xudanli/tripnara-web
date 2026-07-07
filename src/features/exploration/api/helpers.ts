import type {
  ConsumerIssueView,
  ExplorationCandidatesStatus,
  ExplorationCheckJobResult,
  ExplorationGenerationMode,
  IssuesListResponse,
  RouteGenerationSource,
} from './types';
import { isPoiConfirmationIssue } from '@/features/poi-resolution/lib/poi-issue.util';

export interface GenerationSourceBadge {
  label: string;
  tone: 'default' | 'info' | 'niche';
}

export function getGenerationSourceBadge(
  source?: RouteGenerationSource | null,
): GenerationSourceBadge | null {
  switch (source) {
    case 'PERSONALIZED':
      return { label: '已个性化', tone: 'info' };
    case 'ENGINE_MAPBOX':
      return { label: '引擎计算', tone: 'info' };
    case 'LLM':
      return { label: 'AI 生成', tone: 'niche' };
    case 'STATIC_CATALOG':
      return null;
    default:
      return null;
  }
}

export function getComparePageHeadline(
  generationMode?: ExplorationGenerationMode | null,
): string {
  switch (generationMode) {
    case 'PERSONALIZED':
      return '三种典型走法对比 · 已按你的条件个性化';
    case 'ENGINE':
      return '三种走法对比 · 引擎已计算驾驶路线';
    case 'STATIC':
    default:
      return '比较三种路线的真实差异';
  }
}

export function getComparePageSubtitle(
  generationMode?: ExplorationGenerationMode | null,
): string {
  switch (generationMode) {
    case 'PERSONALIZED':
      return '不只看去了多少地方，也要看驾驶、住宿、弹性和不确定性。';
    case 'ENGINE':
      return '路线折线已贴合路网；请结合驾驶强度与住宿稳定性做选择。';
    default:
      return '不只看去了多少地方，也要看驾驶、住宿、弹性和不确定性。';
  }
}

export function getStaleCandidatesBannerText(): string {
  return '旅行条件或原则已变更，当前路线对比可能已过期。请重新生成后再做决定。';
}

export function getConditionsChangedBannerText(tripSynced?: boolean): string {
  if (tripSynced) {
    return '条件已同步到行程，路线对比已标记为待更新。请重新生成候选路线。';
  }
  return '条件已更新，路线对比可能已过期。请重新生成候选路线。';
}

export function shouldRegenerateCandidates(
  status?: ExplorationCandidatesStatus['status'] | null,
): boolean {
  return status === 'STALE';
}

export function shouldShowComparePage(
  status?: ExplorationCandidatesStatus['status'] | null,
): boolean {
  return status === 'READY' || status === 'STALE' || status === 'SELECTED';
}

export function isCandidatesEmpty(
  status?: ExplorationCandidatesStatus['status'] | null,
): boolean {
  return !status || status === 'EMPTY';
}

export function canPatchConditionsAfterMaterialize(
  materializationStatus?: string | null,
  candidatesStatus?: ExplorationCandidatesStatus | null,
): boolean {
  return (
    materializationStatus === 'MATERIALIZED' &&
    candidatesStatus?.status !== 'SELECTED'
  );
}

export type ExplorationIssueSourceKind = 'ontology' | 'poi' | 'gateway';

const ONTOLOGY_ISSUE_PREFIX = 'ontology:';

export function isOntologyConsumerIssue(
  issue: Pick<ConsumerIssueView, 'issueId'>,
): boolean {
  return issue.issueId.startsWith(ONTOLOGY_ISSUE_PREFIX);
}

/** CPRE 待确认 POI — issueId 形如 cpre-poi-... */
export function isCprePoiConsumerIssue(
  issue: Pick<ConsumerIssueView, 'issueId' | 'cprePoi'>,
): boolean {
  return isPoiConfirmationIssue(issue);
}

export function getExplorationIssueSourceKind(
  issue: Pick<ConsumerIssueView, 'issueId' | 'cprePoi'>,
): ExplorationIssueSourceKind {
  if (isOntologyConsumerIssue(issue)) return 'ontology';
  if (isCprePoiConsumerIssue(issue)) return 'poi';
  return 'gateway';
}

export function explorationIssueSourceLabel(kind: ExplorationIssueSourceKind): string {
  switch (kind) {
    case 'ontology':
      return '行程约束';
    case 'poi':
      return '待确认地点';
    default:
      return '决策队列';
  }
}

export function formatExplorationIssuesSummary(issues: IssuesListResponse): string {
  const total = issues.totalIssueCount;
  const blockers = issues.blockerIssueCount ?? 0;
  const ontology = issues.ontologyIssueCount ?? 0;
  const parts = [`共 ${total} 项`];
  if (blockers > 0) {
    parts.push(`${blockers} 项阻断`);
  }
  if (ontology > 0) {
    parts.push(`${ontology} 项本体约束`);
  }
  return parts.join(' · ');
}

export function formatExplorationCheckIssueChips(
  jobResult: {
    gatewayOpenCount?: number;
    ontologyIssueCount?: number;
    unresolvedPoiCount?: number;
  } | undefined,
  issues?: IssuesListResponse,
): string[] {
  const chips: string[] = [];
  const gateway = jobResult?.gatewayOpenCount ?? issues?.gatewayIssueCount;
  const ontology = jobResult?.ontologyIssueCount ?? issues?.ontologyIssueCount;
  const poi = jobResult?.unresolvedPoiCount ?? issues?.unresolvedPoiIssueCount;
  if (gateway != null && gateway > 0) chips.push(`Gateway ${gateway}`);
  if (ontology != null && ontology > 0) chips.push(`本体约束 ${ontology}`);
  if (poi != null && poi > 0) chips.push(`待确认地点 ${poi}`);
  return chips;
}

export function resolveBlockerIssueCount(
  issues?: IssuesListResponse | null,
  jobResult?: { blockerIssueCount?: number } | null,
): number {
  if (jobResult?.blockerIssueCount != null) return jobResult.blockerIssueCount;
  if (issues?.blockerIssueCount != null) return issues.blockerIssueCount;
  return issues?.displayedIssues.filter((i) => i.severity === 'BLOCK').length ?? 0;
}

export function hasExplorationBlockingIssues(
  issues?: IssuesListResponse | null,
  jobResult?: { blockerIssueCount?: number } | null,
): boolean {
  return resolveBlockerIssueCount(issues, jobResult) > 0;
}

/** §3.4 — 常见 Ontology issueId → 用户话术（headline 缺省时 fallback） */
const ONTOLOGY_ISSUE_USER_HINTS: Record<string, string> = {
  'ontology:VEHICLE_CAPABILITY_MISMATCH': '当前车辆无法走所选高地或 F 路段',
  'ontology:RENTAL_CONTRACT_ROAD_PROHIBITION': '租车合同禁止进入该类道路',
  'ontology:ENTRY_ELIGIBILITY_UNKNOWN': '入境或签证状态尚未确认',
  'ontology:VISA_STATUS_UNCONFIRMED': '需补充申根签证证据',
  'ontology:INSURANCE_WATER_CROSSING_GAP': '保险涉水保障未覆盖所选路线',
  'ontology:INSURANCE_UNDERCARRIAGE_UNKNOWN': '底盘保障尚未确认',
  'ontology:RENTAL_PICKUP_WINDOW_CONFLICT': '航班到达时间晚于柜台营业时间',
  'ontology:AFTER_HOURS_PICKUP_UNCONFIRMED': '尚未确认非营业时间取车安排',
};

export function getOntologyIssueUserHint(
  issueId: string,
  fallback?: string,
): string | undefined {
  return ONTOLOGY_ISSUE_USER_HINTS[issueId] ?? fallback;
}

export function shouldUseGatewayRepairFlow(
  issue: Pick<ConsumerIssueView, 'issueId' | 'cprePoi' | 'decisionRequired' | 'severity'>,
): boolean {
  if (isOntologyConsumerIssue(issue)) return false;
  if (isCprePoiConsumerIssue(issue)) return false;
  return (
    issue.decisionRequired === true ||
    issue.severity === 'BLOCK' ||
    issue.severity === 'CONFLICT'
  );
}

/** §5 — check 结果 UI 分支（勿用 displayedIssues.length / totalIssueCount 判能否继续） */
export type ExplorationCheckUiStatus =
  | 'clear'
  | 'ontology_adjust'
  | 'poi_confirm'
  | 'gateway_repair'
  | 'mixed';

export interface ExplorationCheckUiState {
  status: ExplorationCheckUiStatus;
  blockerIssueCount: number;
  diagnosis?: string;
}

export function resolveExplorationCheckUiState(
  jobResult?: ExplorationCheckJobResult | null,
  issues?: IssuesListResponse | null,
): ExplorationCheckUiState {
  const blockerIssueCount = resolveBlockerIssueCount(issues, jobResult);
  if (blockerIssueCount === 0) {
    return { status: 'clear', blockerIssueCount: 0 };
  }

  const gateway =
    jobResult?.gatewayOpenCount ?? issues?.gatewayIssueCount ?? 0;
  const ontology =
    jobResult?.ontologyIssueCount ?? issues?.ontologyIssueCount ?? 0;
  const poi =
    jobResult?.unresolvedPoiCount ?? issues?.unresolvedPoiIssueCount ?? 0;

  const diagnosis = jobResult?.diagnosis;

  if (gateway > 0 && (ontology > 0 || poi > 0)) {
    return { status: 'mixed', blockerIssueCount, diagnosis };
  }
  if (gateway > 0) {
    return { status: 'gateway_repair', blockerIssueCount, diagnosis };
  }
  if (poi > 0) {
    return { status: 'poi_confirm', blockerIssueCount, diagnosis };
  }
  if (ontology > 0) {
    return { status: 'ontology_adjust', blockerIssueCount, diagnosis };
  }

  return { status: 'mixed', blockerIssueCount, diagnosis };
}

export function getExplorationCheckStatusHeadline(state: ExplorationCheckUiState): string {
  switch (state.status) {
    case 'clear':
      return '当前未发现阻断问题';
    case 'ontology_adjust':
      return '需处理行程约束';
    case 'poi_confirm':
      return '请先确认途经地点';
    case 'gateway_repair':
      return '需处理可靠性问题';
    default:
      return '发现需处理的问题';
  }
}

export function getExplorationCheckStatusSubtitle(state: ExplorationCheckUiState): string {
  switch (state.status) {
    case 'clear':
      return '可继续探索后续步骤。';
    case 'ontology_adjust':
      if (state.diagnosis === 'ONTOLOGY_CONSTRAINT_BLOCK') {
        return '请调整旅行条件或更换路线后重新检查。';
      }
      return '车辆、保险或取车时间与当前路线不匹配，请回到条件页修改。';
    case 'poi_confirm':
      return '部分途经地点尚未确认，请先完成 POI 确认。';
    case 'gateway_repair':
      return '系统已生成可选修复方案，请选择并应用。';
    default:
      return '请按问题类型逐项处理后再继续。';
  }
}

/** §3.6 — revalidate 是否通过：看 blockerIssueCount，不是 totalIssueCount */
export function isExplorationRevalidationPassed(
  revalidationStatus: string | undefined,
  issues?: IssuesListResponse | null,
): boolean {
  if (revalidationStatus === 'PASSED') return true;
  if (revalidationStatus === 'FAILED') return false;
  return !hasExplorationBlockingIssues(issues);
}
