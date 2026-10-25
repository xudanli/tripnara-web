import type { DecisionContextFact } from '@/lib/decision-context-capsule.util';
import { isStandaloneDecisionCaseProblem } from '@/lib/planning-conflicts-decision.util';
import type { DecisionProblemDetail, DecisionProblemSummary } from '@/types/decision-problem';
import type { GatewayDecisionProblemDetailResult } from '@/lib/unified-gateway-response.util';

function asDetailDescription(
  detail?: DecisionProblemDetail | GatewayDecisionProblemDetailResult | null,
  problem?: DecisionProblemSummary | null,
): string | undefined {
  const fromDetail =
    (detail as DecisionProblemDetail | undefined)?.description?.trim() ||
    (detail as { summary?: string } | undefined)?.summary?.trim();
  return fromDetail || problem?.description?.trim() || undefined;
}

function semanticBlob(problem?: DecisionProblemSummary | null): string {
  return `${problem?.semanticKey ?? ''} ${problem?.id ?? ''} ${problem?.decisionCase?.domain ?? ''}`.toUpperCase();
}

/** DecisionCase 叙事：禁止借用无关通行缓冲文案 */
export function buildDecisionCaseWhatHappened(
  problem?: DecisionProblemSummary | null,
  detail?: DecisionProblemDetail | GatewayDecisionProblemDetailResult | null,
): string {
  const fromBff = asDetailDescription(detail, problem);
  // BFF 偶发把通行缓冲摘要挂到无关 DecisionCase 上 — 丢弃后走本案模板
  if (fromBff && !isBufferLikeDecisionBasisNarrative(fromBff)) return fromBff;

  const stage = problem?.decisionCase?.enrichmentStage;
  const blob = semanticBlob(problem);

  if (/INSURANCE|RENTAL_INSURANCE|DC_INSURANCE_/.test(blob)) {
    return stage === 'ENRICHED'
      ? '车型与路线风险暴露已评估。请选择租车保险档位；涉水过河等损失通常不在普通险覆盖范围。'
      : '自驾行程需确认租车保险。路线与车型就绪后，系统会补充碎石路、高风与高地等风险说明。';
  }
  if (/VEHICLE|VEHICLE_ROAD|DC_VEHICLE_/.test(blob)) {
    return stage === 'ENRICHED'
      ? '路线中的道路类型已更新。请确认车型与道路能力，避免进入不匹配的 F-road / 高地路段。'
      : '自驾行程需先确认车型与道路能力，之后系统才能按车辆限制验证路线。';
  }
  if (/GLACIER|DC_GLACIER_/.test(blob)) {
    return '路线靠近冰川体验区域。请在同一决策中选择徒步、短线、冰洞、观景或暂不参加。';
  }
  if (/LANDING|DC_LANDING_/.test(blob)) {
    return '检测到国际抵达后安排较长驾驶。请决定落地后直接前往，还是先在机场附近休息。';
  }
  if (/RING_VS|DC_RING_/.test(blob)) {
    return '在有限天数内，环岛与南岸聚焦会显著影响驾驶负荷与体验深度。请选择行程范围。';
  }
  if (/FROAD|DC_FROAD_/.test(blob)) {
    return '当前车型与计划的高地 / F-road 路段不匹配。请升级车辆、改线或改跟团。';
  }

  return problem?.title?.trim() || '请确认本案选项后写回行程约束。';
}

export function buildDecisionCaseBasisFacts(
  problem?: DecisionProblemSummary | null,
  detail?: DecisionProblemDetail | GatewayDecisionProblemDetailResult | null,
): DecisionContextFact[] {
  if (!problem || !isStandaloneDecisionCaseProblem(problem)) return [];

  const facts: DecisionContextFact[] = [];
  const dc = problem.decisionCase;

  if (dc?.enrichmentStage) {
    facts.push({
      id: 'enrichment',
      label: '完善阶段',
      text: dc.enrichmentStage === 'SHELL' ? '外壳待完善' : '已按路线充实',
      kind: 'confirmed',
    });
  }
  if (dc?.requiredness) {
    facts.push({
      id: 'requiredness',
      label: '优先级',
      text:
        dc.requiredness === 'BLOCKING'
          ? '必须确认'
          : dc.requiredness === 'IMPORTANT'
            ? '重要选择'
            : '可选',
      kind: 'confirmed',
    });
  }
  if (dc?.domain) {
    facts.push({
      id: 'domain',
      label: '决策域',
      text: dc.domain,
      kind: 'confirmed',
    });
  }
  if (dc?.writebackTargets?.length) {
    facts.push({
      id: 'writeback',
      label: '写回目标',
      text: dc.writebackTargets.join(' · '),
      kind: 'confirmed',
    });
  }
  if (dc?.materialityScore != null) {
    facts.push({
      id: 'materiality',
      label: '重要度',
      text: String(dc.materialityScore),
      kind: 'predicted',
    });
  }

  for (const [index, warning] of (dc?.eligibility?.softWarnings ?? []).entries()) {
    facts.push({
      id: `soft-${index}`,
      label: '资格提示',
      text: warning,
      kind: 'unconfirmed',
    });
  }

  const scope =
    (detail as DecisionProblemDetail | undefined)?.affectedScopeSummary?.trim() ||
    problem.affectedScopeSummary?.trim();
  if (scope && !isBufferLikeDecisionBasisNarrative(scope)) {
    facts.push({ id: 'scope', label: '影响范围', text: scope, kind: 'confirmed' });
  }

  const blob = semanticBlob(problem);
  if (/INSURANCE|RENTAL_INSURANCE|DC_INSURANCE_/.test(blob)) {
    facts.push({
      id: 'fording',
      label: '保险边界',
      text: '涉水过河损坏通常不在普通保险范围内',
      kind: 'confirmed',
    });
  }

  return facts.slice(0, 8);
}

/** 是否应丢弃与 DecisionCase 无关的通行缓冲 basis */
export function isBufferLikeDecisionBasisNarrative(narrative?: string | null): boolean {
  const text = narrative?.trim() ?? '';
  if (!text) return false;
  return /交通缓冲|缓冲|盖希尔|Geysir|Gullfoss|黄金瀑布|同日转场|预计通行|道路预估|午餐预约|预约状态|Road estimated|plan buffer/i.test(
    text,
  );
}
